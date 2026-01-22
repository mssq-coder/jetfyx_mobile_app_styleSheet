import {
  HubConnectionBuilder,
  LogLevel,
  HttpTransportType,
  HubConnectionState,
} from "@microsoft/signalr";

import * as SecureStore from "expo-secure-store";

const getHubBaseUrl = (apiBaseUrl) => {
  if (!apiBaseUrl) return apiBaseUrl;
  return String(apiBaseUrl).replace(/\/api\/?$/i, "");
};

export function createOrderHubConnection(
  baseURL,
  accountId,
  onOrderUpdate,
  onOrderRemoved
) {
  let isDisposed = false;
  let isStarting = false;
  let startPromise = null;

  const hubBaseUrl = getHubBaseUrl(baseURL);

  const connection = new HubConnectionBuilder()
    .withUrl(`${hubBaseUrl}/hubs/orders`, {
      // Allow fallback if WebSockets are blocked (common on some networks)
      transport: HttpTransportType.WebSockets | HttpTransportType.LongPolling,
      accessTokenFactory: async () => {
        try {
          return (await SecureStore.getItemAsync("accessToken")) ?? "";
        } catch {
          return "";
        }
      },
      headers: {
        // Used for negotiate/HTTP requests (won't be applied to the WS handshake)
        "X-Client-App": "JetFyXMobile",
        "X-Client-Origin": "react-native",
      },
    })
    .configureLogging(LogLevel.Information)
    .withAutomaticReconnect([0, 2000, 10000, 30000])
    .build();

  connection._subscribedAccounts = new Set();

  // ===========================
  // Event handlers
  // ===========================

  connection.on("ReceiveOrderUpdate", (orders) => {
    if (!isDisposed && onOrderUpdate) {
      onOrderUpdate(orders);
    }
  });

  connection.on("RemoveOrder", (orderId) => {
    if (!isDisposed && onOrderRemoved) {
      onOrderRemoved(orderId);
    }
  });

  connection.onreconnected(() => {
    if (isDisposed) return;

    connection._subscribedAccounts.clear();

    if (
      accountId &&
      connection.state === HubConnectionState.Connected
    ) {
      connection
        .invoke("SubscribeToAccount", accountId)
        .then(() => connection._subscribedAccounts.add(accountId))
        .catch(console.error);
    }
  });

  connection.onclose((err) => {
    if (isDisposed) return;
    console.log("[SignalR] OrderHub closed", err?.message);
    connection._subscribedAccounts.clear();
    startPromise = null;
  });

  // ===========================
  // Start logic
  // ===========================

  const startConnection = async (retry = 0) => {
    if (isDisposed) return;

    if (isStarting && startPromise) return startPromise;

    isStarting = true;

    startPromise = (async () => {
      try {
        await connection.start();
        isStarting = false;

        if (
          accountId &&
          connection.state === HubConnectionState.Connected &&
          !connection._subscribedAccounts.has(accountId)
        ) {
          await connection.invoke("SubscribeToAccount", accountId);
          connection._subscribedAccounts.add(accountId);
        }

        return connection;
      } catch (err) {
        isStarting = false;

        if (retry < 3 && !isDisposed) {
          await new Promise((r) =>
            setTimeout(r, 2 ** retry * 1000)
          );
          return startConnection(retry + 1);
        }

        throw err;
      }
    })();

    return startPromise;
  };

  // Auto start
  startConnection().catch(console.error);

  // ===========================
  // Dispose
  // ===========================

  connection.dispose = async () => {
    isDisposed = true;

    try {
      if (
        accountId &&
        connection.state === HubConnectionState.Connected
      ) {
        await connection.invoke("UnsubscribeFromAccount", accountId);
      }
      await connection.stop();
    } catch (_) {}

    connection._subscribedAccounts.clear();
  };

  return connection;
}
