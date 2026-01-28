import { useCallback, useState } from "react";
import { Alert } from "react-native";
import {
  createOrderTarget,
  deleteOrderTarget,
  updateOrderTarget,
} from "../../api/orderTargets";
import {
  getTargetId,
  getTargetKey
} from "../../utils/order/orderHelpers";

export const useTargetsManagement = ({
  targetsOrder,
  setTargetsOrder,
  setTargetsOpen,
  getOrderId,
  toNumberOrZero,
  extractTargetsFromOrder,
  mergeTargetsFromHub,
  getMinLotSizeForOrder,
  getOrderLotSize,
  validateSlTp,
  accountId,
  getLotStepForOrder,
  countDecimals,
  formatWithDecimals,
}) => {
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

  const getTargetsForOrderId = useCallback(
    (oid) => {
      const key = String(oid);
      const list = targetsByOrderId?.[key];
      return Array.isArray(list) ? list : [];
    },
    [targetsByOrderId],
  );

  const setTargetsForOrderId = useCallback((oid, nextList) => {
    const key = String(oid);
    setTargetsByOrderId((prev) => ({
      ...(prev || {}),
      [key]: Array.isArray(nextList) ? nextList : [],
    }));
  }, []);

  const openTargets = useCallback(
    async (order) => {
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
        const used = list.reduce(
          (sum, t) => sum + toNumberOrZero(t?.lotSize),
          0,
        );
        const remaining = Math.max(0, orderLot - used);
        const lotStep = getLotStepForOrder(order);
        const decimals = countDecimals(lotStep);
        const formatted = formatWithDecimals(remaining, decimals);
        setNewTargetLot((prev) =>
          prev && String(prev).length ? prev : formatted,
        );
      };

      setDefaultNewTargetLot(getTargetsForOrderId(oid));

      setTargetsLoading(false);
      const hubTargets = extractTargetsFromOrder(order);
      if (hubTargets.length) {
        const existing = getTargetsForOrderId(oid);
        const merged = mergeTargetsFromHub(
          existing,
          hubTargets,
          getTargetId,
          toNumberOrZero,
        );
        setTargetsForOrderId(oid, merged);
        setDefaultNewTargetLot(merged);
      }
    },
    [
      getOrderId,
      getOrderLotSize,
      getMinLotSizeForOrder,
      setTargetsOrder,
      setTargetsOpen,
      setTargetsError,
      getTargetsForOrderId,
      toNumberOrZero,
      getLotStepForOrder,
      countDecimals,
      formatWithDecimals,
      extractTargetsFromOrder,
      mergeTargetsFromHub,
      getTargetId,
      setTargetsForOrderId,
    ],
  );

  const createTarget = useCallback(async () => {
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
  }, [
    targetsSaving,
    targetsOrder,
    getOrderId,
    getMinLotSizeForOrder,
    getOrderLotSize,
    toNumberOrZero,
    newTargetLot,
    newTargetSl,
    newTargetTp,
    getTargetsForOrderId,
    validateSlTp,
    accountId,
    setTargetsError,
    setTargetsSaving,
    setTargetsForOrderId,
    getLotStepForOrder,
    countDecimals,
    formatWithDecimals,
  ]);

  const updateTarget = useCallback(
    async (targetId, patch) => {
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
        setTargetsError(
          `Lot size exceeds remaining lot (${remainingForThis}).`,
        );
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
    },
    [
      targetsSaving,
      targetsOrder,
      getOrderId,
      getTargetsForOrderId,
      toNumberOrZero,
      getMinLotSizeForOrder,
      getOrderLotSize,
      validateSlTp,
      setTargetsError,
      setTargetsSaving,
      setTargetsForOrderId,
      getLotStepForOrder,
      countDecimals,
      formatWithDecimals,
    ],
  );

  const removeTarget = useCallback(
    async (targetId) => {
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
    },
    [
      targetsSaving,
      targetsOrder,
      getOrderId,
      getTargetsForOrderId,
      setTargetsSaving,
      setTargetsError,
      setTargetsForOrderId,
      getOrderLotSize,
      toNumberOrZero,
      getLotStepForOrder,
      countDecimals,
      formatWithDecimals,
    ],
  );

  const removeLocalTempTarget = useCallback(
    (oid, tempKey) => {
      if (oid == null) return;
      const existing = getTargetsForOrderId(oid);
      const next = (existing || []).filter(
        (t, idx) => getTargetKey(t, idx) !== String(tempKey),
      );
      setTargetsForOrderId(oid, next);
    },
    [getTargetsForOrderId, setTargetsForOrderId, getTargetKey],
  );

  return {
    targetsByOrderId,
    setTargetsByOrderId,
    targetsLoading,
    setTargetsLoading,
    targetsSaving,
    setTargetsSaving,
    targetsError,
    setTargetsError,
    newTargetLot,
    setNewTargetLot,
    newTargetSl,
    setNewTargetSl,
    newTargetTp,
    setNewTargetTp,
    editingTargetKey,
    setEditingTargetKey,
    editTargetLot,
    setEditTargetLot,
    editTargetSl,
    setEditTargetSl,
    editTargetTp,
    setEditTargetTp,
    getTargetsForOrderId,
    setTargetsForOrderId,
    getTargetId,
    getTargetKey,
    openTargets,
    createTarget,
    updateTarget,
    removeTarget,
    removeLocalTempTarget,
  };
};
