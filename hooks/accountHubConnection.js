import { HubConnectionBuilder, LogLevel, HubConnectionState, HttpTransportType } from "@microsoft/signalr";
import * as SecureStore from "expo-secure-store";

export function createAccountHubConnection(baseURL, accountId, onAccountDetails) {
  if (!baseURL) {
    throw new Error("baseURL is required to create AccountHub connection");
  }

  const normalizedBaseUrl = String(baseURL).replace(/\/$/, "");
  // Match Orders/Market hubs: hub base is API base without trailing `/api`
  const hubBaseUrl = normalizedBaseUrl.replace(/\/api\/?$/i, "");
  const originFromBase = hubBaseUrl;
  const originHeader = process.env.EXPO_PUBLIC_SIGNALR_ORIGIN || originFromBase;
  const refererHeader = process.env.EXPO_PUBLIC_SIGNALR_REFERER || `${originHeader}/`;

  const hubPath = process.env.EXPO_PUBLIC_ACCOUNT_HUB_PATH || "/accountHub";
  const hubUrl = `${hubBaseUrl}${hubPath.startsWith("/") ? "" : "/"}${hubPath}`;
  console.log("[SignalR] AccountHub URL:", hubUrl);

  const connection = new HubConnectionBuilder()
    .withUrl(hubUrl, {
      // Allow fallback if WebSockets are blocked (common on some networks)
      transport: HttpTransportType.WebSockets | HttpTransportType.LongPolling,
      accessTokenFactory: async () => {
        try {
          return (await SecureStore.getItemAsync("accessToken")) ?? "";
        } catch {
          return "";
        }
      },
      // These headers are used on negotiate/HTTP requests (not the WS handshake)
      headers: {
        Origin: originHeader,
        Referer: refererHeader,
        "X-Client-App": "JetFyXMobile",
        "X-Client-Origin": "react-native",
      },
    })
    .configureLogging(LogLevel.Information)
    .withAutomaticReconnect([0, 2000, 10000, 30000])
    .build();

  let isStarting = false;
  let isDisposed = false;
  let startPromise = null;
  let startTimeout = null;

  connection.on("ReceiveAccountDetails", (details) => {
    if (onAccountDetails && !isDisposed) onAccountDetails(details);
  });

  // Some servers notify subscription status via a client-invoked method.
  // SignalR JS matches these names case-insensitively, but logs the lowered name.
  connection.on("SubscriptionSuccess", (payload) => {
    if (isDisposed) return;
    console.log("[SignalR] AccountHub SubscriptionSuccess", payload ?? "");
  });

  connection.on("SubscriptionError", (payload) => {
    if (isDisposed) return;
    console.log("[SignalR] AccountHub SubscriptionError", payload ?? "");
  });

  connection.onreconnected(() => {
    if (isDisposed) return;
    if (accountId && connection.state === HubConnectionState.Connected) {
      connection.invoke("SubscribeToAccount", accountId).catch((err) => {
        console.error("[SignalR] Re-subscription error:", err);
      });
    }
  });

  connection.onreconnecting(() => {
    if (isDisposed) return;
  });

  connection.onclose((error) => {
    if (isDisposed) return;
    if (error) {
      console.error("[SignalR] AccountHub connection closed with error:", error?.message || error);
    } else {
      console.log("[SignalR] AccountHub connection closed gracefully");
    }
    startPromise = null;
  });

  const startConnection = async (retryCount = 0) => {
    if (isDisposed) return;

    if (isStarting && startPromise) {
      try {
        return await startPromise;
      } catch (_err) {
        // continue to new attempt
      }
    }

    isStarting = true;

    startPromise = (async () => {
      try {
        if (retryCount === 0) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        if (isDisposed) {
          throw new Error("Connection disposed during startup delay");
        }

        if (connection.state === HubConnectionState.Disconnected) {
          await connection.start();
        }
        isStarting = false;

        if (isDisposed) {
          await connection.stop();
          throw new Error("Connection disposed after start");
        }

        if (accountId && connection.state === HubConnectionState.Connected && !isDisposed) {
          await connection.invoke("SubscribeToAccount", accountId);
        }

        return connection;
      } catch (_err) {
        isStarting = false;

        if (isDisposed) throw _err;

        console.error("[SignalR] AccountHub connection error:", _err?.message || _err);

        if (
          (String(_err?.message || "").includes("negotiation") ||
            String(_err?.message || "").includes("transport") ||
            String(_err?.message || "").includes("network") ||
            String(_err?.message || "").includes("HttpConnection")) &&
          retryCount < 3
        ) {
          const delay = Math.pow(2, retryCount) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));

          if (!isDisposed) return startConnection(retryCount + 1);
        }

        throw _err;
      }
    })();

    return startPromise;
  };

  const debouncedStart = () => {
    if (startTimeout) {
      clearTimeout(startTimeout);
      startTimeout = null;
    }

    startTimeout = setTimeout(() => {
      if (!isDisposed) {
        startConnection().catch((err) => {
          console.error("[SignalR] Failed to start AccountHub connection:", err?.message || err);
        });
      }
    }, 50);
  };

  connection.dispose = async () => {
    isDisposed = true;
    if (startTimeout) {
      clearTimeout(startTimeout);
      startTimeout = null;
    }

    try {
      if (connection.state === HubConnectionState.Connected || connection.state === HubConnectionState.Connecting) {
        await connection.stop();
      }
    } catch (err) {
      console.error("[SignalR] Error during AccountHub disposal:", err?.message || err);
    }

    startPromise = null;
  };

  debouncedStart();

  return connection;
}
