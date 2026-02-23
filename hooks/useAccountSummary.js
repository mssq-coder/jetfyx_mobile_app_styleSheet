import { useEffect, useMemo, useRef, useState } from "react";
import { createAccountHubConnection } from "./accountHubConnection";

const DEFAULT_API_BASE_URL =
  "https://jetwebapp-api-dev-e4bpepgaeaaxgecr.centralindia-01.azurewebsites.net/api";

export default function useAccountSummary(account, currentAccountId, baseURL) {
  const accountConnectionRef = useRef(null);
  const currentAccountIdRef = useRef(null);
  const prevAccountId = useRef(null);
  const isUnmounted = useRef(false);
  const prevBaseUrlRef = useRef(null);

  const [summary, setSummary] = useState({
    balance: null,
    equity: null,
    margin: null,
    freeMargin: null,
    marginLevel: null,
    netPL: null,
    orders: [],
  });

  const [loading, setLoading] = useState(false);

  const effectiveBaseUrl = useMemo(() => {
    if (typeof baseURL === "string" && baseURL.trim()) return baseURL;
    return DEFAULT_API_BASE_URL;
  }, [baseURL]);

  const accountIdToUse = useMemo(() => {
    return account?.id || currentAccountId || null;
  }, [account?.id, currentAccountId]);

  const configKey = `${effectiveBaseUrl}__${String(accountIdToUse ?? "")}`;

  useEffect(() => {
    if (!accountIdToUse) return;

    // If nothing meaningful changed, don't teardown/recreate the connection.
    if (
      accountConnectionRef.current &&
      prevAccountId.current === accountIdToUse &&
      prevBaseUrlRef.current === effectiveBaseUrl
    ) {
      return;
    }

    const cleanupConnection = async () => {
      if (accountConnectionRef.current) {
        try {
          if (prevAccountId.current) {
            await accountConnectionRef.current.invoke(
              "UnsubscribeFromAccount",
              prevAccountId.current,
            );
          }
        } catch (_e) {}
        try {
          await accountConnectionRef.current.stop();
        } catch (_e) {}
        accountConnectionRef.current = null;
      }
    };

    let activeAccount = accountIdToUse;
    isUnmounted.current = false;

    (async () => {
      await cleanupConnection();
      if (isUnmounted.current) return;

      currentAccountIdRef.current = activeAccount;
      prevAccountId.current = activeAccount;
      prevBaseUrlRef.current = effectiveBaseUrl;

      setLoading(true);
      setSummary((prev) =>
        prev?.balance == null &&
        prev?.equity == null &&
        prev?.margin == null &&
        prev?.freeMargin == null &&
        prev?.marginLevel == null &&
        prev?.netPL == null &&
        Array.isArray(prev?.orders) &&
        prev.orders.length === 0
          ? prev
          : {
              balance: null,
              equity: null,
              margin: null,
              freeMargin: null,
              marginLevel: null,
              netPL: null,
              orders: [],
            },
      );

      const connection = createAccountHubConnection(
        effectiveBaseUrl,
        activeAccount,
        (details) => {
          if (
            isUnmounted.current ||
            currentAccountIdRef.current !== activeAccount ||
            (details?.id && details.id !== activeAccount)
          ) {
            return;
          }

          setSummary((prev) => {
            // Avoid re-render storms if payload is effectively unchanged.
            const next = details || {};
            if (!prev) return next;

            const sameScalars =
              prev.balance === next.balance &&
              prev.equity === next.equity &&
              prev.margin === next.margin &&
              prev.freeMargin === next.freeMargin &&
              prev.marginLevel === next.marginLevel &&
              prev.netPL === next.netPL;

            const prevOrders = Array.isArray(prev.orders) ? prev.orders : [];
            const nextOrders = Array.isArray(next.orders) ? next.orders : [];
            const sameOrders =
              prevOrders.length === nextOrders.length &&
              (prevOrders.length === 0 || prevOrders === nextOrders);

            return sameScalars && sameOrders ? prev : next;
          });
          setLoading(false);
        },
      );

      accountConnectionRef.current = connection;
    })();

    return () => {
      isUnmounted.current = true;
      cleanupConnection();
      currentAccountIdRef.current = null;
    };
  }, [configKey, accountIdToUse, effectiveBaseUrl]);

  return {
    summary,
    loading,
  };
}
