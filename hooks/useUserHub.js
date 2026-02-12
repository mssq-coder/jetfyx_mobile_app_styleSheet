import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  HttpTransportType,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";
import * as SecureStore from "expo-secure-store";
import api from "../api/client";

const getHubBaseUrl = (apiBaseUrl) => {
  if (!apiBaseUrl) return apiBaseUrl;
  return String(apiBaseUrl).replace(/\/api\/?$/i, "");
};

export function useUserHub(userId, baseUrl) {
  const [connection, setConnection] = useState(null);
  const [summary, setSummary] = useState(null);

  const startPromiseRef = useRef(null);
  const connectionRef = useRef(null);

  const resolvedBaseUrl = useMemo(() => {
    return baseUrl || api?.defaults?.baseURL;
  }, [baseUrl]);

  // Setup connection (baseUrl scoped)
  useEffect(() => {
    const hubBaseUrl = getHubBaseUrl(resolvedBaseUrl);
    if (!hubBaseUrl) {
      setConnection(null);
      connectionRef.current = null;
      return;
    }

    const hubPath = process.env.EXPO_PUBLIC_USER_HUB_PATH || "/userHub";
    const hubUrl = `${hubBaseUrl}${hubPath}`;

    const hubConnection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        transport: HttpTransportType.WebSockets | HttpTransportType.LongPolling,
        accessTokenFactory: async () => {
          try {
            return (await SecureStore.getItemAsync("accessToken")) ?? "";
          } catch {
            return "";
          }
        },
        headers: {
          "X-Client-App": "JetFyXMobile",
          "X-Client-Origin": "react-native",
        },
      })
      .configureLogging(LogLevel.Information)
      .withAutomaticReconnect([0, 2000, 10000, 30000])
      .build();

    hubConnection.onclose(() => {
      startPromiseRef.current = null;
    });

    hubConnection.onreconnected(async () => {
      if (!userId) return;
      try {
        await hubConnection.invoke("SubscribeToUser", userId);
      } catch (_) {}
    });

    connectionRef.current = hubConnection;
    setConnection(hubConnection);

    return () => {
      startPromiseRef.current = null;
      try {
        hubConnection.stop();
      } catch (_) {}
      if (connectionRef.current === hubConnection) {
        connectionRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedBaseUrl]);

  // Start + subscribe
  useEffect(() => {
    if (!connection || !userId) return;

    const safeOff = () => {
      try {
        connection.off("ReceiveUserSummary");
      } catch (_) {}
    };

    safeOff();

    connection.on("ReceiveUserSummary", (data) => {
      setSummary(data);
    });

    const startAndSubscribe = async () => {
      if (connection.state === HubConnectionState.Connected) {
        try {
          await connection.invoke("SubscribeToUser", userId);
        } catch (_) {}
        return;
      }

      if (startPromiseRef.current) {
        try {
          await startPromiseRef.current;
        } catch (_) {}
      }

      if (connection.state === HubConnectionState.Disconnected) {
        startPromiseRef.current = connection
          .start()
          .finally(() => (startPromiseRef.current = null));

        try {
          await startPromiseRef.current;
        } catch (err) {
          console.error("[SignalR] UserHub start failed:", err?.message || err);
          return;
        }
      }

      if (connection.state === HubConnectionState.Connected) {
        try {
          await connection.invoke("SubscribeToUser", userId);
        } catch (err) {
          console.error(
            "[SignalR] UserHub SubscribeToUser failed:",
            err?.message || err,
          );
        }
      }
    };

    startAndSubscribe();

    return () => {
      safeOff();

      try {
        if (connection.state === HubConnectionState.Connected) {
          connection.invoke("UnsubscribeFromUser", userId).catch(() => {});
        }
      } catch (_) {}
    };
  }, [connection, userId]);

  const sendMessage = useCallback(
    async (methodName, ...args) => {
      if (!connection) return;
      if (connection.state !== HubConnectionState.Connected) return;

      try {
        await connection.invoke(methodName, ...args);
      } catch (err) {
        console.error("[SignalR] UserHub invoke error:", err?.message || err);
      }
    },
    [connection],
  );

  return { summary, sendMessage, connection };
}

export default useUserHub;
