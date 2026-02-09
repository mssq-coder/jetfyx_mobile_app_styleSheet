import { useCallback, useState } from "react";

export default function usePullToRefresh() {
  const [refreshing, setRefreshing] = useState(false);

  const runRefresh = useCallback(async (refreshFn) => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      if (typeof refreshFn === "function") {
        await refreshFn();
      } else {
        // Minimal delay so the indicator is visible
        await new Promise((r) => setTimeout(r, 350));
      }
    } finally {
      setRefreshing(false);
    }
  }, [refreshing]);

  return { refreshing, runRefresh };
}
