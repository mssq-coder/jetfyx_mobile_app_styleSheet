import { useState, useEffect, useRef } from "react";
import { createAccountHubConnection } from "./accountHubConnection";

const DEFAULT_API_BASE_URL ="https://jetwebapp-api-dev-e4bpepgaeaaxgecr.centralindia-01.azurewebsites.net/api";

export default function useAccountSummary(account, currentAccountId, baseURL) {
  const accountConnectionRef = useRef(null);
  const currentAccountIdRef = useRef(null);
  const prevAccountId = useRef(null);
  const isUnmounted = useRef(false);

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

  useEffect(() => {
    const effectiveBaseUrl = baseURL || DEFAULT_API_BASE_URL;
    const accountIdToUse = account?.id || currentAccountId;
    if (!accountIdToUse) return;

    const cleanupConnection = async () => {
      if (accountConnectionRef.current) {
        try {
          if (prevAccountId.current) {
            await accountConnectionRef.current.invoke(
              "UnsubscribeFromAccount",
              prevAccountId.current
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

      setLoading(true);
      setSummary({
        balance: null,
        equity: null,
        margin: null,
        freeMargin: null,
        marginLevel: null,
        netPL: null,
        orders: [],
      });

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

          setSummary(details);
          setLoading(false);
        }
      );

      accountConnectionRef.current = connection;
    })();

    return () => {
      isUnmounted.current = true;
      cleanupConnection();
      currentAccountIdRef.current = null;
    };
  }, [account?.id, currentAccountId, baseURL]);

  return {
    summary,
    loading,
  };
}
