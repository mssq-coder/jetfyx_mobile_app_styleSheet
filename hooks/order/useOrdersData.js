import { useAuthStore } from "@/store/authStore";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getAllCurrencyListFromDB } from "../../api/getServices";
import useAccountSummary from "../../hooks/useAccountSummary";
import useOrderHub from "../../hooks/useOrderHub";
import { validateSlTpValues } from "../../utils/orderValidation";

export const useOrdersData = ({ tab }) => {
  const selectedAccountId = useAuthStore((state) => state.selectedAccountId);
  const accounts = useAuthStore((state) => state.accounts);
  const accountId = selectedAccountId;

  const [orders, setOrders] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [symbolsBySymbol, setSymbolsBySymbol] = useState({});

  useOrderHub(accountId, setOrders, setPendingOrders);

  useEffect(() => {
    if (accountId == null) {
      setSymbolsBySymbol({});
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const response = await getAllCurrencyListFromDB(accountId);
        const list = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
            ? response
            : [];

        const next = {};
        for (const item of list) {
          const sym = item?.symbol;
          if (!sym) continue;
          next[String(sym).toUpperCase()] = item;
        }

        if (!cancelled) setSymbolsBySymbol(next);
      } catch {
        if (!cancelled) setSymbolsBySymbol({});
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accountId]);

  const selectedAccount = useMemo(() => {
    if (!accountId) return null;
    return (accounts || []).find(
      (a) => String(a?.accountId ?? a?.id) === String(accountId),
    );
  }, [accounts, accountId]);

  const { summary, loading: summaryLoading } = useAccountSummary(
    selectedAccount,
    accountId,
  );

  const floatingProfit =
    typeof summary?.netPL === "number" ? summary.netPL : 0.0;

  const account = useMemo(
    () => ({
      id: accountId ?? "—",
      type:
        selectedAccount?.type ??
        selectedAccount?.accountType ??
        selectedAccount?.mode ??
        "REAL",
      currency: selectedAccount?.currency ?? "USD",
      balance:
        summary?.balance != null
          ? Number(summary.balance)
          : Number(selectedAccount?.balance ?? 0),
      equity:
        summary?.equity != null
          ? Number(summary.equity)
          : Number(selectedAccount?.equity ?? 0),
      margin:
        summary?.margin != null
          ? Number(summary.margin)
          : Number(selectedAccount?.margin ?? 0),
      freeMargin:
        summary?.freeMargin != null
          ? Number(summary.freeMargin)
          : Number(selectedAccount?.freeMargin ?? 0),
      leverage: selectedAccount?.leverage ?? 100,
    }),
    [accountId, selectedAccount, summary],
  );

  const listOrders = useMemo(() => {
    const base = tab === "pending" ? pendingOrders : orders;
    return base || [];
  }, [tab, pendingOrders, orders]);

  const getOrderId = useCallback(
    (o) => o?.id ?? o?.orderId ?? o?.ticket ?? o?.positionId ?? o?.dealId,
    [],
  );

  const toNumberOrZero = useCallback((value) => {
    if (value == null || value === "") return 0;
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }, []);

  const isPendingOrder = useCallback((order) => {
    if (!order || typeof order !== "object") return false;
    if (typeof order.isPending === "boolean") return order.isPending;
    const status = (order.status ?? order.orderStatus ?? "")
      .toString()
      .toLowerCase();
    return status === "pending" || status === "placed" || status === "new";
  }, []);

  const getOrderLotSize = useCallback(
    (order) =>
      toNumberOrZero(
        order?.lotSize ??
          order?.remainingLotSize ??
          order?.lotSizeForPendingOrders ??
          order?.volume ??
          0,
      ),
    [toNumberOrZero],
  );

  const getMinLotSizeForOrder = useCallback(
    (order) => {
      const key = getSymbolKey(order);
      const meta = key ? symbolsBySymbol?.[key] : null;
      const n = Number(
        meta?.minLotSize ??
          meta?.minLot ??
          meta?.minLotSizeForOrder ??
          order?.minLotSize ??
          order?.minLot ??
          0,
      );
      return Number.isFinite(n) && n > 0 ? n : 0;
    },
    [symbolsBySymbol],
  );

  const getSymbolKey = useCallback(
    (order) =>
      String(
        order?.symbol ?? order?.instrument ?? order?.instrumentName ?? "",
      ).toUpperCase(),
    [],
  );

  const getOrderSide = useCallback((order) => {
    const raw =
      order?.side ??
      order?.direction ??
      order?.orderSide ??
      order?.orderType ??
      order?.type;

    if (raw == null) return "";
    if (typeof raw === "number") {
      if (raw === 0) return "buy";
      if (raw === 1) return "sell";
      return String(raw);
    }
    return String(raw).toLowerCase();
  }, []);

  const getMarketReferencePrice = useCallback((order) => {
    const candidates = [
      order?.marketPrice,
      order?.currentPrice,
      order?.price,
      order?.ask,
      order?.bid,
      order?.entryPrice,
      order?.entryPriceForPendingOrders,
    ];
    for (const c of candidates) {
      const n = Number(c);
      if (Number.isFinite(n) && n > 0) return n;
    }
    return 0;
  }, []);

  const getPriceDigits = useCallback(
    (order) => {
      const d = Number(order?.digits ?? order?.symbolDigits);
      if (Number.isFinite(d) && d >= 0 && d <= 10) return d;

      const ref = getMarketReferencePrice(order);
      const str = String(ref);
      const idx = str.indexOf(".");
      if (idx === -1) return ref < 10 ? 5 : 2;
      const decimals = Math.max(0, str.length - idx - 1);
      return Math.min(10, Math.max(ref < 10 ? 5 : 2, decimals));
    },
    [getMarketReferencePrice],
  );

  const getPriceStep = useCallback(
    (order) => {
      const digits = getPriceDigits(order);
      const baseStep = Math.pow(10, -digits);
      const points = getLimitStopLevelPoints(order);
      const stepFromPoints = points > 0 ? points * baseStep : 0;
      return Math.max(baseStep, stepFromPoints);
    },
    [getPriceDigits],
  );

  const getLimitStopLevelPoints = useCallback(
    (order) => {
      const key = getSymbolKey(order);
      if (!key) return 0;
      const meta = symbolsBySymbol?.[key];

      const points =
        meta?.limitAndStopLevelPoints ??
        meta?.limitStopLevelPoints ??
        meta?.stopLevelPoints ??
        meta?.stopLevel ??
        meta?.limitLevel;

      const n = Number(points);
      return Number.isFinite(n) && n > 0 ? n : 0;
    },
    [symbolsBySymbol, getSymbolKey],
  );

  const getBuySellValues = useCallback(
    (order) => {
      const buy =
        Number.isFinite(Number(order?.ask)) && Number(order?.ask) > 0
          ? Number(order?.ask)
          : Number.isFinite(Number(order?.buyPrice)) &&
              Number(order?.buyPrice) > 0
            ? Number(order?.buyPrice)
            : getMarketReferencePrice(order);

      const sell =
        Number.isFinite(Number(order?.bid)) && Number(order?.bid) > 0
          ? Number(order?.bid)
          : Number.isFinite(Number(order?.sellPrice)) &&
              Number(order?.sellPrice) > 0
            ? Number(order?.sellPrice)
            : getMarketReferencePrice(order);

      return { buy, sell };
    },
    [getMarketReferencePrice],
  );

  const formatWithDigits = useCallback((value, digits) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return "";
    return n.toFixed(digits);
  }, []);

  const adjustInputByStep = useCallback(
    (inputValue, step, direction, digits) => {
      const current = toNumberOrZero(inputValue);
      const next = Math.max(0, current + direction * step);
      if (next === 0) return "0";
      return formatWithDigits(next, digits);
    },
    [toNumberOrZero, formatWithDigits],
  );

  const countDecimals = useCallback((value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    const s = String(n);
    const idx = s.indexOf(".");
    if (idx === -1) return 0;
    return Math.max(0, s.length - idx - 1);
  }, []);

  const getLotStepForOrder = useCallback(
    (order) => {
      const minLot = getMinLotSizeForOrder(order);
      if (Number.isFinite(minLot) && minLot > 0) return minLot;
      return 0.01;
    },
    [getMinLotSizeForOrder],
  );

  const formatWithDecimals = useCallback((value, decimals) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return "";
    const d = Math.max(0, Math.min(10, Number(decimals) || 0));
    return n.toFixed(d);
  }, []);

  const adjustNumberInputByStep = useCallback(
    (inputValue, step, direction, decimals, { min = 0 } = {}) => {
      const current = toNumberOrZero(inputValue);
      const stepN = Number(step);
      const next = Math.max(
        min,
        current + direction * (Number.isFinite(stepN) ? stepN : 0),
      );
      return formatWithDecimals(next, decimals);
    },
    [toNumberOrZero, formatWithDecimals],
  );

  const validateSlTp = useCallback(
    (order, slValue, tpValue) => {
      if (!order) return { slError: null, tpError: null };
      return validateSlTpValues({
        side: getOrderSide(order),
        marketRef: getMarketReferencePrice(order),
        stopLoss: slValue,
        takeProfit: tpValue,
      });
    },
    [getMarketReferencePrice, getOrderSide],
  );

  return {
    orders,
    pendingOrders,
    listOrders,
    account,
    floatingProfit,
    summaryLoading,
    symbolsBySymbol,
    getOrderId,
    toNumberOrZero,
    isPendingOrder,
    getOrderLotSize,
    getMinLotSizeForOrder,
    getOrderSide,
    getMarketReferencePrice,
    getPriceDigits,
    getPriceStep,
    getBuySellValues,
    formatWithDigits,
    adjustInputByStep,
    countDecimals,
    getLotStepForOrder,
    formatWithDecimals,
    adjustNumberInputByStep,
    validateSlTp,
  };
};
