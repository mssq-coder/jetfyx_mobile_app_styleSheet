import { useAuthStore } from "@/store/authStore";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  InteractionManager,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  GestureHandlerRootView,
  Swipeable,
} from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { getAllCurrencyListFromDB } from "../../api/getServices";
import { updateOrder } from "../../api/orders";
import {
  createOrderTarget,
  deleteOrderTarget,
  updateOrderTarget,
} from "../../api/orderTargets";
import AccountSummary from "../../components/Accounts/AccountSummary";
import AppIcon from "../../components/AppIcon";
import MultiTargetsModal from "../../components/Orders/MultiTargetsModal";
import UpdateSlTpModal from "../../components/Orders/UpdateSlTpModal";
import { useAppTheme } from "../../contexts/ThemeContext";
import useAccountSummary from "../../hooks/useAccountSummary";
import useOrderHub from "../../hooks/useOrderHub";
import { validateSlTpValues } from "../../utils/orderValidation";

/* ----------------------- Tabs ----------------------- */
const TABS = [
  { key: "market", label: "Ongoing" },
  { key: "pending", label: "Pending" },
];

/* ----------------------- Screen ----------------------- */
const OrderListScreen = () => {
  const router = useRouter();
  const { theme } = useAppTheme();
  const [tab, setTab] = useState("market");
  const [instrument] = useState(null);
  const [direction] = useState(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryContentReady, setSummaryContentReady] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editOrder, setEditOrder] = useState(null);
  const [slInput, setSlInput] = useState("");
  const [tpInput, setTpInput] = useState("");
  const [remarkInput, setRemarkInput] = useState("");
  const [savingUpdate, setSavingUpdate] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  const [slFieldError, setSlFieldError] = useState(null);
  const [tpFieldError, setTpFieldError] = useState(null);

  const [targetsOpen, setTargetsOpen] = useState(false);
  const [targetsOrder, setTargetsOrder] = useState(null);
  const [targetsByOrderId, setTargetsByOrderId] = useState({});
  const [targetsLoading, setTargetsLoading] = useState(false);
  const [targetsSaving, setTargetsSaving] = useState(false);
  const [targetsError, setTargetsError] = useState(null);
  const [newTargetLot, setNewTargetLot] = useState("");
  const [newTargetSl, setNewTargetSl] = useState("");
  const [newTargetTp, setNewTargetTp] = useState("");

  const [editingTargetKey, setEditingTargetKey] = useState(null);
  const [editTargetLot, setEditTargetLot] = useState("");
  const [editTargetSl, setEditTargetSl] = useState("");
  const [editTargetTp, setEditTargetTp] = useState("");

  const swipeRefs = useRef(new Map());
  const openSwipeRef = useRef(null);

  const arrowRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(arrowRotate, {
      toValue: summaryOpen ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [arrowRotate, summaryOpen]);

  const arrowRotation = useMemo(
    () =>
      arrowRotate.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "180deg"],
      }),
    [arrowRotate],
  );

  useEffect(() => {
    if (!summaryOpen) {
      setSummaryContentReady(false);
      return;
    }

    setSummaryContentReady(false);
    let cancelled = false;
    const task = InteractionManager.runAfterInteractions(() => {
      if (!cancelled) setSummaryContentReady(true);
    });

    return () => {
      cancelled = true;
      if (task && typeof task.cancel === "function") task.cancel();
    };
  }, [summaryOpen]);

  const selectedAccountId = useAuthStore((state) => state.selectedAccountId);
  const accounts = useAuthStore((state) => state.accounts);
  const accountId = selectedAccountId;

  const [orders, setOrders] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [symbolsBySymbol, setSymbolsBySymbol] = useState({});

  useOrderHub(accountId, setOrders, setPendingOrders);
  // console.log('Orders:', orders);
  // console.log('Pending Orders:', pendingOrders);

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

    const normalizedDirection = direction
      ? String(direction).toLowerCase()
      : null;

    const normalizeSide = (o) => {
      const raw =
        o?.side ?? o?.direction ?? o?.orderSide ?? o?.orderType ?? o?.type;
      if (raw == null) return "";
      if (typeof raw === "number") {
        if (raw === 0) return "buy";
        if (raw === 1) return "sell";
        return String(raw);
      }
      return String(raw).toLowerCase();
    };

    const normalizeSymbol = (o) =>
      String(
        o?.symbol ?? o?.instrument ?? o?.instrumentName ?? "",
      ).toUpperCase();

    return (base || []).filter((o) => {
      const symbol = normalizeSymbol(o);

      if (instrument && symbol !== String(instrument).toUpperCase()) {
        return false;
      }

      if (normalizedDirection) {
        const side = normalizeSide(o);
        if (!side.includes(normalizedDirection)) return false;
      }

      return true;
    });
  }, [tab, pendingOrders, orders, instrument, direction]);

  const getOrderId = useCallback(
    (o) => o?.id ?? o?.orderId ?? o?.ticket ?? o?.positionId ?? o?.dealId,
    [],
  );

  const liveEditOrder = useMemo(() => {
    if (!editOpen || !editOrder) return null;
    const oid = getOrderId(editOrder);
    if (oid == null) return editOrder;

    const key = String(oid);
    const candidates = [...(orders || []), ...(pendingOrders || [])];
    const found = candidates.find((o) => String(getOrderId(o)) === key);
    return found ?? editOrder;
  }, [editOpen, editOrder, orders, pendingOrders, getOrderId]);

  const toNumberOrZero = useCallback((value) => {
    if (value == null || value === "") return 0;
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }, []);

  const extractTargetsFromOrder = useCallback((order) => {
    if (!order || typeof order !== "object") return [];

    const candidates = [
      order?.targets,
      order?.orderTargets,
      order?.orderTarget,
      order?.orderTargetList,
      order?.orderTargetsList,
      order?.childOrders,
      order?.children,
      order?.multiTargets,
      order?.targetOrders,
    ];

    for (const c of candidates) {
      if (Array.isArray(c)) return c;
      if (c && typeof c === "object" && Array.isArray(c.data)) return c.data;
    }

    return [];
  }, []);

  const getTargetId = useCallback((t) => {
    if (!t || typeof t !== "object") return null;
    return (
      t.id ??
      t.targetId ??
      t.orderTargetId ??
      t.orderTargetsId ??
      t.ordertargetId ??
      null
    );
  }, []);

  const getTargetKey = useCallback(
    (t, fallbackIndex = 0) => {
      const id = getTargetId(t);
      return String(id ?? t?.clientTempId ?? `tmp-${fallbackIndex}`);
    },
    [getTargetId],
  );

  const mergeTargetsFromHub = useCallback(
    (existingList, incomingList) => {
      const prev = Array.isArray(existingList) ? existingList : [];
      const incoming = Array.isArray(incomingList) ? incomingList : [];
      if (!prev.length) return incoming;
      if (!incoming.length) return prev;

      const priceTol = 1e-6;
      const lotTol = 1e-6;

      const normalize = (t) => {
        if (!t || typeof t !== "object") return t;
        const id = getTargetId(t);
        return id != null ? { ...t, id } : t;
      };

      const incomingNorm = incoming.map(normalize);
      const prevNorm = prev.map(normalize);

      const matches = (a, b) => {
        const lotA = toNumberOrZero(a?.lotSize);
        const lotB = toNumberOrZero(b?.lotSize);
        const slA = toNumberOrZero(a?.stopLoss);
        const slB = toNumberOrZero(b?.stopLoss);
        const tpA = toNumberOrZero(a?.takeProfit);
        const tpB = toNumberOrZero(b?.takeProfit);

        return (
          Math.abs(lotA - lotB) <= lotTol &&
          Math.abs(slA - slB) <= priceTol &&
          Math.abs(tpA - tpB) <= priceTol
        );
      };

      // Dedupe incoming by id (hub might send duplicates)
      const incomingById = new Map();
      const incomingNoId = [];
      for (const t of incomingNorm) {
        const id = getTargetId(t);
        if (id != null) {
          const key = String(id);
          if (!incomingById.has(key)) incomingById.set(key, t);
        } else {
          incomingNoId.push(t);
        }
      }

      const result = [...incomingById.values(), ...incomingNoId];

      // Keep local items that hub hasn't confirmed yet (e.g., created without id)
      for (const p of prevNorm) {
        const pid = getTargetId(p);
        if (pid != null) {
          const existsInIncoming = incomingById.has(String(pid));
          if (!existsInIncoming) result.push(p); // keep if hub didn't send this batch
          continue;
        }

        // For temp items (no id), drop them once hub sends a matching target (with or without id)
        const hasMatch = result.some((x) => matches(p, x));
        if (!hasMatch) result.push(p);
      }

      return result;
    },
    [toNumberOrZero, getTargetId],
  );

  useEffect(() => {
    const all = [...(orders || []), ...(pendingOrders || [])];
    if (!all.length) return;

    setTargetsByOrderId((prev) => {
      const next = { ...(prev || {}) };
      let changed = false;

      for (const order of all) {
        const oid = getOrderId(order);
        if (oid == null) continue;
        const hubTargets = extractTargetsFromOrder(order);
        if (!hubTargets.length) continue;

        const key = String(oid);
        const merged = mergeTargetsFromHub(next[key], hubTargets);
        next[key] = merged;
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [
    orders,
    pendingOrders,
    getOrderId,
    extractTargetsFromOrder,
    mergeTargetsFromHub,
  ]);

  const getSymbolKey = (order) =>
    String(
      order?.symbol ?? order?.instrument ?? order?.instrumentName ?? "",
    ).toUpperCase();

  const getOrderLotSize = (order) =>
    toNumberOrZero(
      order?.lotSize ??
        order?.remainingLotSize ??
        order?.lotSizeForPendingOrders ??
        order?.volume ??
        0,
    );

  const getMinLotSizeForOrder = (order) => {
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
  };

  const getLimitStopLevelPoints = (order) => {
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
  };

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

  const isPendingOrder = (order) => {
    if (!order || typeof order !== "object") return false;
    if (typeof order.isPending === "boolean") return order.isPending;
    const status = (order.status ?? order.orderStatus ?? "")
      .toString()
      .toLowerCase();
    return status === "pending" || status === "placed" || status === "new";
  };

  const getBuySellValues = (order) => {
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
  };

  const getPriceDigits = (order) => {
    const d = Number(order?.digits ?? order?.symbolDigits);
    if (Number.isFinite(d) && d >= 0 && d <= 10) return d;

    const ref = getMarketReferencePrice(order);
    const str = String(ref);
    const idx = str.indexOf(".");
    if (idx === -1) return ref < 10 ? 5 : 2;
    const decimals = Math.max(0, str.length - idx - 1);
    return Math.min(10, Math.max(ref < 10 ? 5 : 2, decimals));
  };

  const getPriceStep = (order) => {
    const digits = getPriceDigits(order);
    const baseStep = Math.pow(10, -digits);
    const points = getLimitStopLevelPoints(order);
    const stepFromPoints = points > 0 ? points * baseStep : 0;
    return Math.max(baseStep, stepFromPoints);
  };

  const formatWithDigits = (value, digits) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return "";
    return n.toFixed(digits);
  };

  const countDecimals = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    const s = String(n);
    const idx = s.indexOf(".");
    if (idx === -1) return 0;
    return Math.max(0, s.length - idx - 1);
  };

  const formatWithDecimals = (value, decimals) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return "";
    const d = Math.max(0, Math.min(10, Number(decimals) || 0));
    return n.toFixed(d);
  };

  const adjustNumberInputByStep = (
    inputValue,
    step,
    direction,
    decimals,
    { min = 0 } = {},
  ) => {
    const current = toNumberOrZero(inputValue);
    const stepN = Number(step);
    const next = Math.max(
      min,
      current + direction * (Number.isFinite(stepN) ? stepN : 0),
    );
    return formatWithDecimals(next, decimals);
  };

  const getLotStepForOrder = (order) => {
    const minLot = getMinLotSizeForOrder(order);
    if (Number.isFinite(minLot) && minLot > 0) return minLot;
    return 0.01;
  };

  const adjustInputByStep = (inputValue, step, direction, digits) => {
    const current = toNumberOrZero(inputValue);
    const next = Math.max(0, current + direction * step);
    if (next === 0) return "0";
    return formatWithDigits(next, digits);
  };

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

  useEffect(() => {
    if (!editOpen || !liveEditOrder) {
      setSlFieldError(null);
      setTpFieldError(null);
      return;
    }

    const slValue = toNumberOrZero(slInput);
    const tpValue = toNumberOrZero(tpInput);
    const { slError, tpError } = validateSlTp(liveEditOrder, slValue, tpValue);
    setSlFieldError(slError);
    setTpFieldError(tpError);
  }, [editOpen, liveEditOrder, slInput, tpInput, validateSlTp, toNumberOrZero]);

  const statusForClose = (existingStatus) => {
    if (typeof existingStatus === "number") return 1;
    return "Closed";
  };

  const patchOrderInLists = (orderIdToPatch, patch) => {
    const key = String(orderIdToPatch);

    setOrders((prev) =>
      (prev || []).map((o) =>
        String(getOrderId(o)) === key ? { ...o, ...patch } : o,
      ),
    );
    setPendingOrders((prev) =>
      (prev || []).map((o) =>
        String(getOrderId(o)) === key ? { ...o, ...patch } : o,
      ),
    );
  };

  const removeOrderFromLists = (orderIdToRemove) => {
    const key = String(orderIdToRemove);
    setOrders((prev) =>
      (prev || []).filter((o) => String(getOrderId(o)) !== key),
    );
    setPendingOrders((prev) =>
      (prev || []).filter((o) => String(getOrderId(o)) !== key),
    );
  };

  const buildUpdatePayload = (
    order,
    overrides = {},
    { includeRemark = false, includePendingFields = false } = {},
  ) => {
    const now = new Date().toISOString();
    const oid = getOrderId(order);

    const payload = {
      id: Number(overrides.id ?? order?.id ?? oid ?? 0),
      stopLoss: toNumberOrZero(overrides.stopLoss ?? order?.stopLoss ?? 0),
      takeProfit: toNumberOrZero(
        overrides.takeProfit ?? order?.takeProfit ?? 0,
      ),
      status: overrides.status ?? order?.status ?? "Ongoing",
      executedAt:
        overrides.executedAt ??
        order?.executedAt ??
        order?.orderTime ??
        order?.createdAt ??
        now,
      closedAt:
        overrides.closedAt ?? order?.closedAt ?? order?.orderClosedAt ?? now,
      accountId: Number(
        overrides.accountId ?? order?.accountId ?? accountId ?? 0,
      ),
      partialCloseLotSize: toNumberOrZero(
        overrides.partialCloseLotSize ?? order?.partialCloseLotSize ?? 0,
      ),
    };

    if (includeRemark) {
      payload.remark = String(overrides.remark ?? order?.remark ?? "");
    }

    if (includePendingFields) {
      payload.entryPriceForPendingOrders = toNumberOrZero(
        overrides.entryPriceForPendingOrders ??
          order?.entryPriceForPendingOrders ??
          order?.entryPrice ??
          0,
      );
      payload.expirationTimeForPendingOrder =
        overrides.expirationTimeForPendingOrder ??
        order?.expirationTimeForPendingOrder ??
        now;
      payload.isExpirationTimeEnabledForPendingOrder = Boolean(
        overrides.isExpirationTimeEnabledForPendingOrder ??
        order?.isExpirationTimeEnabledForPendingOrder ??
        false,
      );
      payload.lotSizeForPendingOrders = toNumberOrZero(
        overrides.lotSizeForPendingOrders ??
          order?.lotSizeForPendingOrders ??
          order?.lotSize ??
          0,
      );
    }

    return payload;
  };

  const openEdit = (order) => {
    setEditOrder(order ?? null);
    const pending = isPendingOrder(order);
    setSlInput(order?.stopLoss != null ? String(order.stopLoss) : "");
    setTpInput(order?.takeProfit != null ? String(order.takeProfit) : "");
    setRemarkInput(pending ? String(order?.remark ?? "") : "");
    setUpdateError(null);
    setSlFieldError(null);
    setTpFieldError(null);
    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!editOrder) return;
    const oid = getOrderId(editOrder);
    if (oid == null) {
      setUpdateError("Missing order id");
      return;
    }

    const pending = isPendingOrder(editOrder);

    const slValue = toNumberOrZero(slInput);
    const tpValue = toNumberOrZero(tpInput);

    const { slError, tpError } = validateSlTp(editOrder, slValue, tpValue);
    if (slError || tpError) {
      setSlFieldError(slError);
      setTpFieldError(tpError);
      setUpdateError(null);
      return;
    }

    setSavingUpdate(true);
    setUpdateError(null);

    try {
      const payload = buildUpdatePayload(
        editOrder,
        {
          stopLoss: slValue,
          takeProfit: tpValue,
          status: editOrder?.status ?? "Ongoing",
          ...(pending ? { remark: remarkInput } : {}),
        },
        { includeRemark: pending, includePendingFields: pending },
      );

      await updateOrder(oid, payload);

      patchOrderInLists(oid, {
        stopLoss: payload.stopLoss,
        takeProfit: payload.takeProfit,
        remark: payload.remark,
      });

      setEditOpen(false);
      setEditOrder(null);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Failed to update order.";
      setUpdateError(String(message));
    } finally {
      setSavingUpdate(false);
    }
  };

  const confirmClose = (order) => {
    const oid = getOrderId(order);
    if (oid == null) {
      Alert.alert("Close order", "Missing order id.");
      return;
    }

    const symbol =
      order?.symbol ?? order?.instrument ?? order?.instrumentName ?? "—";

    Alert.alert("Close order", `Close ${symbol}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Close",
        style: "destructive",
        onPress: async () => {
          setSavingUpdate(true);
          setUpdateError(null);
          try {
            const now = new Date().toISOString();
            const fullLot =
              order?.lotSize ??
              order?.remainingLotSize ??
              order?.lotSizeForPendingOrders ??
              0;

            const payload = buildUpdatePayload(order, {
              status: statusForClose(order?.status),
              executedAt: now,
              closedAt: now,
              partialCloseLotSize: toNumberOrZero(fullLot),
            });

            await updateOrder(oid, payload);
            removeOrderFromLists(oid);
            if (expandedOrderId === oid) setExpandedOrderId(null);
          } catch (error) {
            const message =
              error?.response?.data?.message ||
              error?.response?.data?.error ||
              error?.message ||
              "Failed to close order.";
            setUpdateError(String(message));
          } finally {
            setSavingUpdate(false);
          }
        },
      },
    ]);
  };

  const getTargetsForOrderId = (oid) => {
    const key = String(oid);
    const list = targetsByOrderId?.[key];
    return Array.isArray(list) ? list : [];
  };

  const setTargetsForOrderId = (oid, nextList) => {
    const key = String(oid);
    setTargetsByOrderId((prev) => ({
      ...(prev || {}),
      [key]: Array.isArray(nextList) ? nextList : [],
    }));
  };

  const openTargets = async (order) => {
    const oid = getOrderId(order);
    if (oid == null) {
      Alert.alert("Multi target", "Missing order id.");
      return;
    }

    const orderLot = getOrderLotSize(order);
    const minLot = getMinLotSizeForOrder(order);

    if (!(orderLot > minLot) || !(minLot > 0)) {
      Alert.alert(
        "Multi target",
        `Multi target is only available when order lot is greater than the minimum lot.\n\nOrder lot: ${orderLot}\nMin lot: ${minLot || "—"}`,
      );
      return;
    }

    setTargetsOrder(order);
    setTargetsOpen(true);
    setTargetsError(null);
    setNewTargetLot("");
    setNewTargetSl("");
    setNewTargetTp("");
    setEditingTargetKey(null);

    const setDefaultNewTargetLot = (targetList) => {
      const list = Array.isArray(targetList) ? targetList : [];
      const used = list.reduce((sum, t) => sum + toNumberOrZero(t?.lotSize), 0);
      const remaining = Math.max(0, orderLot - used);
      const lotStep = getLotStepForOrder(order);
      const decimals = countDecimals(lotStep);
      const formatted = formatWithDecimals(remaining, decimals);
      setNewTargetLot((prev) =>
        prev && String(prev).length ? prev : formatted,
      );
    };

    // Default lot = remaining lot (editable)
    setDefaultNewTargetLot(getTargetsForOrderId(oid));

    // Targets are expected to come via OrderHub (or already cached in state)
    setTargetsLoading(false);
    const hubTargets = extractTargetsFromOrder(order);
    if (hubTargets.length) {
      const existing = getTargetsForOrderId(oid);
      const merged = mergeTargetsFromHub(existing, hubTargets);
      setTargetsForOrderId(oid, merged);
      setDefaultNewTargetLot(merged);
    }
  };

  const createTarget = async () => {
    if (targetsSaving) return;
    if (!targetsOrder) return;
    const oid = getOrderId(targetsOrder);
    if (oid == null) return;

    const minLot = getMinLotSizeForOrder(targetsOrder);
    const orderLot = getOrderLotSize(targetsOrder);
    const lot = toNumberOrZero(newTargetLot);
    const sl = toNumberOrZero(newTargetSl);
    const tp = toNumberOrZero(newTargetTp);

    if (!(lot > 0)) {
      setTargetsError("Lot size is required.");
      return;
    }
    if (minLot > 0 && lot < minLot) {
      setTargetsError(`Lot size must be ≥ ${minLot}.`);
      return;
    }

    const existing = getTargetsForOrderId(oid);
    const used = existing.reduce(
      (sum, t) => sum + toNumberOrZero(t?.lotSize),
      0,
    );
    const remaining = Math.max(0, orderLot - used);
    if (lot > remaining) {
      setTargetsError(`Lot size exceeds remaining lot (${remaining}).`);
      return;
    }

    const { slError, tpError } = validateSlTp(targetsOrder, sl, tp);
    if (slError || tpError) {
      setTargetsError(slError || tpError);
      return;
    }

    setTargetsSaving(true);
    setTargetsError(null);
    try {
      const entry =
        toNumberOrZero(
          targetsOrder?.entryPrice ??
            targetsOrder?.entryPriceForPendingOrders ??
            targetsOrder?.price ??
            0,
        ) || 0;

      const payload = {
        orderId: Number(oid),
        accountId: Number(accountId ?? targetsOrder?.accountId ?? 0),
        takeProfit: tp,
        stopLoss: sl,
        lotSize: lot,
        entryPrice: entry,
        isClosed: false,
        isDeleted: false,
      };

      const created = await createOrderTarget(payload);
      const createdId =
        created?.id ??
        created?.targetId ??
        created?.orderTargetId ??
        created?.orderTargetsId;

      if (created && typeof created === "object" && createdId != null) {
        const nextList = [...existing, { ...created, id: createdId }];
        setTargetsForOrderId(oid, nextList);

        const usedNext = nextList.reduce(
          (sum, t) => sum + toNumberOrZero(t?.lotSize),
          0,
        );
        const remainingNext = Math.max(0, orderLot - usedNext);
        const lotStep = getLotStepForOrder(targetsOrder);
        const decimals = countDecimals(lotStep);
        setNewTargetLot(formatWithDecimals(remainingNext, decimals));
        setNewTargetSl("");
        setNewTargetTp("");
      } else {
        // Backend didn't return id; keep a local temp target until OrderHub syncs the real id.
        const temp = {
          ...payload,
          id: null,
          clientTempId: `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        };
        const nextList = [...existing, temp];
        setTargetsForOrderId(oid, nextList);

        const usedNext = nextList.reduce(
          (sum, t) => sum + toNumberOrZero(t?.lotSize),
          0,
        );
        const remainingNext = Math.max(0, orderLot - usedNext);
        const lotStep = getLotStepForOrder(targetsOrder);
        const decimals = countDecimals(lotStep);
        setNewTargetLot(formatWithDecimals(remainingNext, decimals));
        setNewTargetSl("");
        setNewTargetTp("");
      }
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Failed to create target.";
      setTargetsError(String(message));
    } finally {
      setTargetsSaving(false);
    }
  };

  const updateTarget = async (targetId, patch) => {
    if (targetsSaving) return;
    if (!targetsOrder) return;
    const oid = getOrderId(targetsOrder);
    if (oid == null) return;

    const existing = getTargetsForOrderId(oid);
    const target = existing.find((t) => String(t?.id) === String(targetId));
    if (!target) return;

    const lot = toNumberOrZero(patch?.lotSize ?? target?.lotSize);
    const sl = toNumberOrZero(patch?.stopLoss ?? target?.stopLoss);
    const tp = toNumberOrZero(patch?.takeProfit ?? target?.takeProfit);

    const minLot = getMinLotSizeForOrder(targetsOrder);
    if (minLot > 0 && lot < minLot) {
      setTargetsError(`Lot size must be ≥ ${minLot}.`);
      return;
    }

    const orderLot = getOrderLotSize(targetsOrder);
    const usedOther = existing
      .filter((t) => String(t?.id) !== String(targetId))
      .reduce((sum, t) => sum + toNumberOrZero(t?.lotSize), 0);
    const remainingForThis = Math.max(0, orderLot - usedOther);
    if (lot > remainingForThis) {
      setTargetsError(`Lot size exceeds remaining lot (${remainingForThis}).`);
      return;
    }

    const { slError, tpError } = validateSlTp(targetsOrder, sl, tp);
    if (slError || tpError) {
      setTargetsError(slError || tpError);
      return;
    }

    setTargetsSaving(true);
    setTargetsError(null);
    try {
      const payload = {
        id: Number(targetId),
        takeProfit: tp,
        stopLoss: sl,
        lotSize: lot,
      };

      await updateOrderTarget(targetId, payload);

      const nextList = existing.map((t) =>
        String(t?.id) === String(targetId)
          ? { ...t, takeProfit: tp, stopLoss: sl, lotSize: lot }
          : t,
      );
      setTargetsForOrderId(oid, nextList);

      const usedNext = nextList.reduce(
        (sum, t) => sum + toNumberOrZero(t?.lotSize),
        0,
      );
      const orderLot = getOrderLotSize(targetsOrder);
      const remainingNext = Math.max(0, orderLot - usedNext);
      const lotStep = getLotStepForOrder(targetsOrder);
      const decimals = countDecimals(lotStep);
      setNewTargetLot((prev) =>
        prev && String(prev).length
          ? prev
          : formatWithDecimals(remainingNext, decimals),
      );
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Failed to update target.";
      setTargetsError(String(message));
    } finally {
      setTargetsSaving(false);
    }
  };

  const removeTarget = async (targetId) => {
    if (targetsSaving) return;
    if (!targetsOrder) return;
    const oid = getOrderId(targetsOrder);
    if (oid == null) return;

    const existing = getTargetsForOrderId(oid);

    setTargetsSaving(true);
    setTargetsError(null);
    try {
      await deleteOrderTarget(targetId);
      const nextList = existing.filter(
        (t) => String(t?.id) !== String(targetId),
      );
      setTargetsForOrderId(oid, nextList);

      const usedNext = nextList.reduce(
        (sum, t) => sum + toNumberOrZero(t?.lotSize),
        0,
      );
      const orderLot = getOrderLotSize(targetsOrder);
      const remainingNext = Math.max(0, orderLot - usedNext);
      const lotStep = getLotStepForOrder(targetsOrder);
      const decimals = countDecimals(lotStep);
      setNewTargetLot((prev) =>
        prev && String(prev).length
          ? prev
          : formatWithDecimals(remainingNext, decimals),
      );
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Failed to delete target.";
      setTargetsError(String(message));
    } finally {
      setTargetsSaving(false);
    }
  };

  const removeLocalTempTarget = (oid, tempKey) => {
    if (oid == null) return;
    const existing = getTargetsForOrderId(oid);
    const next = (existing || []).filter(
      (t, idx) => getTargetKey(t, idx) !== String(tempKey),
    );
    setTargetsForOrderId(oid, next);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <FlatList
          data={listOrders}
          keyExtractor={(o) => String(getOrderId(o))}
          contentContainerStyle={{ paddingBottom: 140 }}
          ListHeaderComponent={() => (
            <>
              {/* ---------------- Account Header ---------------- */}
              <Pressable
                style={{
                  marginHorizontal: 16,
                  marginTop: 12,
                  borderRadius: 16,
                  padding: 16,
                  backgroundColor: theme.card,
                }}
                onPress={() => setSummaryOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Open account summary"
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "500",
                        color: theme.secondary,
                      }}
                    >
                      Balance
                    </Text>
                    <Text
                      style={{
                        fontSize: 30,
                        fontWeight: "700",
                        color: theme.text,
                      }}
                    >
                      ${account.balance.toFixed(2)}
                    </Text>

                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginTop: 8,
                      }}
                    >
                      <Text style={{ fontSize: 12, color: theme.secondary }}>
                        Margin: ${account.margin.toFixed(2)}
                      </Text>
                      {summaryLoading ? (
                        <Text
                          style={{
                            fontSize: 12,
                            marginLeft: 8,
                            color: theme.secondary,
                          }}
                        >
                          Updating…
                        </Text>
                      ) : null}
                    </View>

                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginTop: 8,
                      }}
                    >
                      <View
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 9999,
                          marginRight: 8,
                          backgroundColor: theme.primary + "20",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: "600",
                            color: theme.primary,
                          }}
                        >
                          {String(
                            selectedAccount?.accountTypeName ??
                              account.type ??
                              "",
                          )}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 12, color: theme.secondary }}>
                        {String(selectedAccount?.accountNumber ?? "—")}
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    onPressIn={() => setSummaryOpen(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Open account summary"
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Animated.View
                      style={{ transform: [{ rotate: arrowRotation }] }}
                    >
                      <AppIcon
                        name="keyboard-arrow-down"
                        size={40}
                        color={theme.secondary}
                      />
                    </Animated.View>
                  </Pressable>
                </View>
              </Pressable>

              {/* ---------------- Tabs with Order Counts ---------------- */}
              <View
                style={{
                  flexDirection: "row",
                  paddingHorizontal: 16,
                  marginTop: 18,
                }}
              >
                {TABS.map((t) => {
                  const active = tab === t.key;
                  const ongoingCount = orders.length;
                  const pendingCount = pendingOrders.length;
                  const displayCount =
                    t.key === "market" ? ongoingCount : pendingCount;
                  return (
                    <TouchableOpacity
                      key={t.key}
                      onPress={() => setTab(t.key)}
                      style={{ marginRight: 24 }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: "600",
                            color: active ? theme.primary : theme.secondary,
                          }}
                        >
                          {t.label}
                        </Text>
                        <View
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 10,
                            backgroundColor: active
                              ? theme.primary
                              : theme.secondary + "20",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: "700",
                              color: active ? "#fff" : theme.secondary,
                            }}
                          >
                            {displayCount}
                          </Text>
                        </View>
                      </View>
                      <View
                        style={[
                          {
                            height: 3,
                            marginTop: 8,
                            borderRadius: 999,
                            width: 32,
                          },
                          {
                            backgroundColor: active
                              ? theme.primary
                              : "transparent",
                          },
                        ]}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* ---------------- Profit Card ---------------- */}
              <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
                <View
                  style={{
                    borderRadius: 16,
                    padding: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor: theme.card,
                  }}
                >
                  <View>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "500",
                        color: theme.secondary,
                      }}
                    >
                      Net Profit
                    </Text>
                    <Text
                      style={{
                        fontSize: 20,
                        fontWeight: "700",
                        color:
                          floatingProfit >= 0 ? theme.positive : theme.negative,
                      }}
                    >
                      ${floatingProfit.toFixed(2)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 12,
                      backgroundColor: theme.background,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: theme.text,
                      }}
                    >
                      Close All
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* ---------------- Filters ---------------- */}
              <View
                style={{
                  paddingHorizontal: 16,
                  marginTop: 20,
                  flexDirection: "row",
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                {/* <TouchableOpacity
                style={{ width: 36, height: 36, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', marginRight: 8, marginBottom: 8, backgroundColor: theme.card }}
              >
                <AppIcon name="filter" size={18} color={theme.secondary} />
              </TouchableOpacity>

              <Dropdown
                label="Symbol"
                options={['EURUSD', 'BTCUSD', 'XAUUSD']}
                value={instrument}
                onChange={setInstrument}
                theme={theme}
              />

              <Dropdown
                label="Side"
                options={['Buy', 'Sell']}
                value={direction}
                onChange={setDirection}
                theme={theme}
              /> */}
              </View>
            </>
          )}
          renderItem={({ item }) => {
            // Extract key fields from order
            const orderId = getOrderId(item);
            const symbol =
              item.symbol ?? item.instrument ?? item.instrumentName ?? "—";
            const orderType =
              item.orderType ?? item.side ?? item.direction ?? "BUY";
            const entryPrice = item.entryPrice ?? 0;
            const marketPrice = item.marketPrice ?? 0;
            const lotSize = item.lotSize ?? item.remainingLotSize ?? 0;
            const pnl = item.profitOrLoss ?? 0;
            const pnlPercent = item.profitOrLossInPercentage ?? 0;
            const status = item.status ?? "Ongoing";
            const orderTime = item.orderTime ?? item.createdAt;
            const isPositive = pnl >= 0;
            const isBuy = String(orderType).toLowerCase().includes("buy");
            const isExpanded = expandedOrderId === orderId;

            const orderLot = getOrderLotSize(item);
            const minLot = getMinLotSizeForOrder(item);
            const multiTargetEnabled = Boolean(minLot > 0 && orderLot > minLot);

            const setSwipeRef = (ref) => {
              const key = String(orderId);
              if (ref) swipeRefs.current.set(key, ref);
              else swipeRefs.current.delete(key);
            };

            const closeSwipe = () => {
              const ref = swipeRefs.current.get(String(orderId));
              ref?.close?.();
            };

            const renderRightActions = () => (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "stretch",
                  justifyContent: "flex-end",
                  marginVertical: 6,
                  marginRight: 12,
                  gap: 10,
                }}
              >
                <TouchableOpacity
                  onPress={() => {
                    closeSwipe();
                    if (!multiTargetEnabled) {
                      Alert.alert(
                        "Multi target",
                        `Multi target is only available when order lot is greater than the minimum lot.\n\nOrder lot: ${orderLot}\nMin lot: ${minLot || "—"}`,
                      );
                      return;
                    }
                    openTargets(item);
                  }}
                  disabled={targetsSaving || savingUpdate}
                  style={{
                    width: 64,
                    borderRadius: 12,
                    backgroundColor: multiTargetEnabled
                      ? theme.primary
                      : theme.secondary + "30",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Multi Target"
                >
                  <AppIcon name="call-split" color="#fff" size={26} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    closeSwipe();
                    confirmClose(item);
                  }}
                  disabled={savingUpdate}
                  style={{
                    width: 64,
                    borderRadius: 12,
                    backgroundColor: theme.negative,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Close Order"
                >
                  <AppIcon name="close" color="#fff" size={26} />
                </TouchableOpacity>
              </View>
            );

            return (
              <Swipeable
                ref={setSwipeRef}
                renderRightActions={renderRightActions}
                rightThreshold={30}
                friction={1.8}
                overshootRight={false}
                useNativeAnimations
                onSwipeableWillOpen={() => {
                  const current = swipeRefs.current.get(String(orderId));
                  if (
                    openSwipeRef.current &&
                    openSwipeRef.current !== current
                  ) {
                    openSwipeRef.current?.close?.();
                  }
                  openSwipeRef.current = current;
                }}
              >
                <TouchableOpacity
                  onPress={() =>
                    setExpandedOrderId(isExpanded ? null : orderId)
                  }
                  style={{
                    marginHorizontal: 12,
                    marginVertical: 6,
                    borderRadius: 12,
                    backgroundColor: theme.card,
                    borderWidth: isExpanded ? 1.5 : 1,
                    borderColor: isExpanded ? theme.primary : theme.border,
                    overflow: "hidden",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  {/* Collapsed Row View */}
                  {!isExpanded ? (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: 12,
                        paddingHorizontal: 14,
                        gap: 8,
                      }}
                    >
                      {/* Left: Symbol & Type */}
                      <View
                        style={{
                          flex: 1.4,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <View
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 8,
                            backgroundColor: isBuy
                              ? theme.positive + "15"
                              : theme.negative + "15",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: "700",
                              color: isBuy ? theme.positive : theme.negative,
                            }}
                          >
                            {isBuy ? "BUY" : "SELL"}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 12,
                              color: theme.secondary,
                              fontWeight: "500",
                            }}
                          >
                            {symbol}
                          </Text>
                          <Text
                            style={{ fontSize: 10, color: theme.secondary }}
                          >
                            {entryPrice.toFixed(2)}
                          </Text>
                        </View>
                      </View>

                      {/* Middle: Lot Size */}
                      <View
                        style={{
                          width: 60,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            color: theme.secondary,
                            marginBottom: 2,
                          }}
                        >
                          Lots
                        </Text>
                        <Text
                          style={{
                            fontSize: 13,
                            color: theme.text,
                            fontWeight: "700",
                          }}
                        >
                          {lotSize.toFixed(2)}
                        </Text>
                      </View>

                      {/* Right: P&L */}
                      <View
                        style={{
                          width: 75,
                          alignItems: "flex-end",
                          justifyContent: "center",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: "700",
                            color: isPositive ? theme.positive : theme.negative,
                            letterSpacing: 0.2,
                          }}
                        >
                          ${pnl.toFixed(2)}
                        </Text>
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: "600",
                            color: isPositive ? theme.positive : theme.negative,
                          }}
                        >
                          {isPositive ? "+" : ""}
                          {pnlPercent.toFixed(2)}%
                        </Text>
                      </View>

                      {/* Expand Indicator */}
                      <View
                        style={{
                          width: 24,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text style={{ fontSize: 18, color: theme.secondary }}>
                          ›
                        </Text>
                      </View>
                    </View>
                  ) : (
                    /* Expanded Detail View */
                    <View style={{ padding: 14 }}>
                      {/* Header: Symbol & Order Type */}
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 12,
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 12,
                              color: theme.secondary,
                              marginBottom: 2,
                              fontWeight: "500",
                            }}
                          >
                            {orderTime
                              ? new Date(orderTime).toLocaleTimeString()
                              : "--"}
                          </Text>
                          <Text
                            style={{
                              fontSize: 18,
                              color: theme.text,
                              fontWeight: "700",
                              letterSpacing: 0.5,
                            }}
                          >
                            {symbol}
                          </Text>
                        </View>
                        <View
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 20,
                            backgroundColor: isBuy
                              ? theme.positive + "15"
                              : theme.negative + "15",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: "700",
                              color: isBuy ? theme.positive : theme.negative,
                              letterSpacing: 0.5,
                            }}
                          >
                            {isBuy ? "BUY" : "SELL"}
                          </Text>
                        </View>
                      </View>

                      {/* Prices Row: Entry, Market, Lot Size */}
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          gap: 10,
                          marginBottom: 12,
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 10,
                              color: theme.secondary,
                              marginBottom: 3,
                              fontWeight: "500",
                            }}
                          >
                            Entry
                          </Text>
                          <Text
                            style={{
                              fontSize: 14,
                              color: theme.text,
                              fontWeight: "700",
                              letterSpacing: 0.2,
                            }}
                          >
                            {entryPrice.toFixed(2)}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 10,
                              color: theme.secondary,
                              marginBottom: 3,
                              fontWeight: "500",
                            }}
                          >
                            Market
                          </Text>
                          <Text
                            style={{
                              fontSize: 14,
                              color: theme.text,
                              fontWeight: "700",
                              letterSpacing: 0.2,
                            }}
                          >
                            {marketPrice.toFixed(2)}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 10,
                              color: theme.secondary,
                              marginBottom: 3,
                              fontWeight: "500",
                            }}
                          >
                            Lot Size
                          </Text>
                          <Text
                            style={{
                              fontSize: 14,
                              color: theme.text,
                              fontWeight: "700",
                              letterSpacing: 0.2,
                            }}
                          >
                            {lotSize.toFixed(2)}
                          </Text>
                        </View>
                      </View>

                      {/* P&L Row: Profit/Loss & Percentage */}
                      <View
                        style={{
                          flexDirection: "row",
                          paddingVertical: 10,
                          paddingHorizontal: 12,
                          borderRadius: 10,
                          backgroundColor: isPositive
                            ? theme.positive + "12"
                            : theme.negative + "12",
                          borderWidth: 1,
                          borderColor: isPositive
                            ? theme.positive + "30"
                            : theme.negative + "30",
                          gap: 12,
                          marginBottom: 10,
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 10,
                              color: theme.secondary,
                              marginBottom: 3,
                              fontWeight: "500",
                            }}
                          >
                            P&L
                          </Text>
                          <Text
                            style={{
                              fontSize: 16,
                              fontWeight: "700",
                              color: isPositive
                                ? theme.positive
                                : theme.negative,
                              letterSpacing: 0.3,
                            }}
                          >
                            ${pnl.toFixed(2)}
                          </Text>
                        </View>
                        <View
                          style={{ width: 1, backgroundColor: theme.border }}
                        />
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 10,
                              color: theme.secondary,
                              marginBottom: 3,
                              fontWeight: "500",
                            }}
                          >
                            Return %
                          </Text>
                          <Text
                            style={{
                              fontSize: 16,
                              fontWeight: "700",
                              color: isPositive
                                ? theme.positive
                                : theme.negative,
                              letterSpacing: 0.3,
                            }}
                          >
                            {isPositive ? "+" : ""}
                            {pnlPercent.toFixed(2)}%
                          </Text>
                        </View>
                      </View>

                      {/* Additional Details Row 1 */}
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          gap: 10,
                          marginBottom: 10,
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 10,
                              color: theme.secondary,
                              marginBottom: 3,
                              fontWeight: "500",
                            }}
                          >
                            Status
                          </Text>
                          <View
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 4,
                              borderRadius: 6,
                              backgroundColor: theme.secondary + "15",
                              alignItems: "center",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 11,
                                color: theme.secondary,
                                fontWeight: "600",
                              }}
                            >
                              {status}
                            </Text>
                          </View>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 10,
                              color: theme.secondary,
                              marginBottom: 3,
                              fontWeight: "500",
                            }}
                          >
                            Margin
                          </Text>
                          <Text
                            style={{
                              fontSize: 14,
                              color: theme.text,
                              fontWeight: "700",
                            }}
                          >
                            ${(item.orderMargin ?? 0).toFixed(2)}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 10,
                              color: theme.secondary,
                              marginBottom: 3,
                              fontWeight: "500",
                            }}
                          >
                            Commission
                          </Text>
                          <Text
                            style={{
                              fontSize: 14,
                              color: theme.negative,
                              fontWeight: "700",
                            }}
                          >
                            ${(item.commission ?? 0).toFixed(2)}
                          </Text>
                        </View>
                      </View>

                      {/* Additional Details Row 2 */}
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          gap: 10,
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 10,
                              color: theme.secondary,
                              marginBottom: 3,
                              fontWeight: "500",
                            }}
                          >
                            Stop Loss
                          </Text>
                          <Text
                            style={{
                              fontSize: 13,
                              color: theme.text,
                              fontWeight: "700",
                            }}
                          >
                            {(item.stopLoss ?? 0) > 0
                              ? item.stopLoss.toFixed(2)
                              : "--"}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 10,
                              color: theme.secondary,
                              marginBottom: 3,
                              fontWeight: "500",
                            }}
                          >
                            Take Profit
                          </Text>
                          <Text
                            style={{
                              fontSize: 13,
                              color: theme.text,
                              fontWeight: "700",
                            }}
                          >
                            {(item.takeProfit ?? 0) > 0
                              ? item.takeProfit.toFixed(2)
                              : "--"}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 10,
                              color: theme.secondary,
                              marginBottom: 3,
                              fontWeight: "500",
                            }}
                          >
                            Swap
                          </Text>
                          <Text
                            style={{
                              fontSize: 13,
                              color:
                                item.swap < 0 ? theme.negative : theme.positive,
                              fontWeight: "700",
                            }}
                          >
                            ${(item.swap ?? 0).toFixed(2)}
                          </Text>
                        </View>
                      </View>

                      {(() => {
                        const targets =
                          orderId != null ? getTargetsForOrderId(orderId) : [];
                        if (!targets.length) return null;

                        return (
                          <View
                            style={{
                              marginTop: 12,
                              padding: 12,
                              borderRadius: 12,
                              borderWidth: 1,
                              borderColor: theme.border,
                              backgroundColor: theme.background,
                            }}
                          >
                            <Text
                              style={{
                                color: theme.text,
                                fontSize: 13,
                                fontWeight: "800",
                              }}
                            >
                              Targets
                            </Text>
                            <Text
                              style={{
                                color: theme.secondary,
                                fontSize: 11,
                                marginTop: 2,
                              }}
                            >
                              Child orders for this position
                            </Text>

                            <View style={{ marginTop: 8, gap: 8 }}>
                              {targets.map((t, idx) => (
                                <View
                                  key={getTargetKey(t, idx)}
                                  style={{
                                    padding: 10,
                                    borderRadius: 10,
                                    borderWidth: 1,
                                    borderColor: theme.border,
                                    backgroundColor: theme.card,
                                  }}
                                >
                                  <View
                                    style={{
                                      flexDirection: "row",
                                      justifyContent: "space-between",
                                    }}
                                  >
                                    <Text
                                      style={{
                                        color: theme.secondary,
                                        fontSize: 11,
                                        fontWeight: "700",
                                      }}
                                    >
                                      Target #{getTargetId(t) ?? "—"}
                                    </Text>
                                    <Text
                                      style={{
                                        color: theme.secondary,
                                        fontSize: 11,
                                        fontWeight: "700",
                                      }}
                                    >
                                      Lot:{" "}
                                      {toNumberOrZero(t?.lotSize).toFixed(2)}
                                    </Text>
                                  </View>

                                  <View
                                    style={{
                                      flexDirection: "row",
                                      justifyContent: "space-between",
                                      marginTop: 6,
                                    }}
                                  >
                                    <Text
                                      style={{
                                        color: theme.secondary,
                                        fontSize: 11,
                                      }}
                                    >
                                      SL:{" "}
                                      {toNumberOrZero(t?.stopLoss) > 0
                                        ? Number(t?.stopLoss).toFixed(2)
                                        : "--"}
                                    </Text>
                                    <Text
                                      style={{
                                        color: theme.secondary,
                                        fontSize: 11,
                                      }}
                                    >
                                      TP:{" "}
                                      {toNumberOrZero(t?.takeProfit) > 0
                                        ? Number(t?.takeProfit).toFixed(2)
                                        : "--"}
                                    </Text>
                                  </View>
                                </View>
                              ))}
                            </View>
                          </View>
                        );
                      })()}

                      {/* Actions */}
                      <View
                        style={{ flexDirection: "row", gap: 10, marginTop: 14 }}
                      >
                        <TouchableOpacity
                          onPress={() => openEdit(item)}
                          disabled={savingUpdate}
                          style={{
                            flex: 1,
                            paddingVertical: 10,
                            borderRadius: 10,
                            backgroundColor: theme.background,
                            alignItems: "center",
                            justifyContent: "center",
                            borderWidth: 1,
                            borderColor: theme.border,
                          }}
                        >
                          <Text
                            style={{
                              color: theme.text,
                              fontWeight: "700",
                              fontSize: 12,
                            }}
                          >
                            Update SL/TP
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => confirmClose(item)}
                          disabled={savingUpdate}
                          style={{
                            flex: 1,
                            paddingVertical: 10,
                            borderRadius: 10,
                            backgroundColor: theme.negative,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {savingUpdate ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text
                              style={{
                                color: "#fff",
                                fontWeight: "700",
                                fontSize: 12,
                              }}
                            >
                              Close
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>

                      {updateError ? (
                        <Text
                          style={{
                            marginTop: 10,
                            color: theme.negative,
                            fontSize: 12,
                          }}
                        >
                          {updateError}
                        </Text>
                      ) : null}
                    </View>
                  )}
                </TouchableOpacity>
              </Swipeable>
            );
          }}
          ListEmptyComponent={() => (
            <View style={{ paddingHorizontal: 16, marginTop: 40 }}>
              <View style={{ alignItems: "center", marginTop: 48 }}>
                <View
                  style={{
                    width: 112,
                    height: 112,
                    borderRadius: 16,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: theme.card,
                  }}
                >
                  <AppIcon name="inbox" size={36} color={theme.secondary} />
                </View>

                <Text
                  style={{
                    marginTop: 20,
                    fontSize: 16,
                    fontWeight: "600",
                    color: theme.text,
                  }}
                >
                  No open orders
                </Text>

                <Text
                  style={{
                    marginTop: 4,
                    fontSize: 12,
                    textAlign: "center",
                    color: theme.secondary,
                  }}
                >
                  Your active trades will appear here.
                </Text>
              </View>
            </View>
          )}
        />

        {/* ---------------- Floating History Button ---------------- */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push("/history")}
          style={{ position: "absolute", right: 20, bottom: 30 }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 9999,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.primary,
            }}
          >
            <AppIcon name="history" color="white" size={28} />
          </View>
        </TouchableOpacity>

        {/* ---------------- Account Summary Modal ---------------- */}
        <Modal
          visible={summaryOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setSummaryOpen(false)}
        >
          <View style={{ flex: 1 }} pointerEvents="box-none">
            <Pressable
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0,0,0,0.35)",
              }}
              onPress={() => setSummaryOpen(false)}
            />
            <View
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                paddingHorizontal: 16,
                paddingBottom: 24,
              }}
              pointerEvents="box-none"
            >
              {summaryContentReady ? (
                <AccountSummary account={account} />
              ) : (
                <View
                  style={{
                    width: "100%",
                    borderRadius: 16,
                    padding: 16,
                    backgroundColor: theme.card,
                  }}
                >
                  <Text style={{ color: theme.secondary, fontSize: 12 }}>
                    Loading…
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Modal>

        {/* ---------------- Update SL/TP Modal ---------------- */}
        <UpdateSlTpModal
          visible={editOpen}
          theme={theme}
          order={liveEditOrder}
          saving={savingUpdate}
          slInput={slInput}
          tpInput={tpInput}
          remarkInput={remarkInput}
          setSlInput={setSlInput}
          setTpInput={setTpInput}
          setRemarkInput={setRemarkInput}
          setUpdateError={setUpdateError}
          onSubmit={submitEdit}
          onClose={() => setEditOpen(false)}
          updateError={updateError}
          slFieldError={slFieldError}
          tpFieldError={tpFieldError}
          getOrderSide={getOrderSide}
          getPriceDigits={getPriceDigits}
          getPriceStep={getPriceStep}
          getBuySellValues={getBuySellValues}
          getMarketReferencePrice={getMarketReferencePrice}
          formatWithDigits={formatWithDigits}
          adjustInputByStep={adjustInputByStep}
          toNumberOrZero={toNumberOrZero}
          isPendingOrder={isPendingOrder}
          styles={styles}
        />

        {/* ---------------- Multi Target Modal ---------------- */}
        <MultiTargetsModal
          visible={targetsOpen}
          theme={theme}
          targetsOrder={targetsOrder}
          targetsLoading={targetsLoading}
          targetsSaving={targetsSaving}
          targetsError={targetsError}
          setTargetsError={setTargetsError}
          onClose={() => setTargetsOpen(false)}
          editingTargetKey={editingTargetKey}
          setEditingTargetKey={setEditingTargetKey}
          editTargetLot={editTargetLot}
          setEditTargetLot={setEditTargetLot}
          editTargetSl={editTargetSl}
          setEditTargetSl={setEditTargetSl}
          editTargetTp={editTargetTp}
          setEditTargetTp={setEditTargetTp}
          newTargetLot={newTargetLot}
          setNewTargetLot={setNewTargetLot}
          newTargetSl={newTargetSl}
          setNewTargetSl={setNewTargetSl}
          newTargetTp={newTargetTp}
          setNewTargetTp={setNewTargetTp}
          getOrderId={getOrderId}
          getPriceDigits={getPriceDigits}
          getPriceStep={getPriceStep}
          getMarketReferencePrice={getMarketReferencePrice}
          getOrderLotSize={getOrderLotSize}
          getMinLotSizeForOrder={getMinLotSizeForOrder}
          getLotStepForOrder={getLotStepForOrder}
          countDecimals={countDecimals}
          getTargetsForOrderId={getTargetsForOrderId}
          validateSlTp={validateSlTp}
          toNumberOrZero={toNumberOrZero}
          formatWithDigits={formatWithDigits}
          formatWithDecimals={formatWithDecimals}
          adjustInputByStep={adjustInputByStep}
          adjustNumberInputByStep={adjustNumberInputByStep}
          getTargetId={getTargetId}
          getTargetKey={getTargetKey}
          removeLocalTempTarget={removeLocalTempTarget}
          removeTarget={removeTarget}
          updateTarget={updateTarget}
          createTarget={createTarget}
          styles={styles}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default OrderListScreen;

const styles = {
  modalRoot: {
    flex: 1,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },

  centerModalRoot: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  centerBackdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  centerCard: {
    width: "100%",
    borderRadius: 16,
    padding: 16,
  },
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  loadingCard: { width: "100%", borderRadius: 16, padding: 16 },
};
