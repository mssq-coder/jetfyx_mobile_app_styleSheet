import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { bulkClose, updateOrder } from "../../api/orders";
import {
  buildUpdatePayload,
  statusForClose,
} from "../../utils/order/orderHelpers";

export const useOrderManagement = ({
  editOrder,
  setEditOrder,
  setEditOpen,
  selectedOrderIds,
  setSelectedOrderIds,
  bulkDeleting,
  setBulkDeleting,
  bulkMode,
  setBulkMode,
  expandedOrderId,
  setExpandedOrderId,
  getOrderId,
  toNumberOrZero,
  validateSlTp,
  accountId,
  patchOrderInLists,
  removeOrderFromLists,
}) => {
  const [slInput, setSlInput] = useState("");
  const [tpInput, setTpInput] = useState("");
  const [remarkInput, setRemarkInput] = useState("");
  const [savingUpdate, setSavingUpdate] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  const [slFieldError, setSlFieldError] = useState(null);
  const [tpFieldError, setTpFieldError] = useState(null);

  const selectedCount = Object.values(selectedOrderIds || {}).reduce(
    (acc, v) => acc + (v ? 1 : 0),
    0,
  );

  const openEdit = useCallback(
    (order) => {
      setEditOrder(order ?? null);
      const pending = isPendingOrder(order);
      setSlInput(order?.stopLoss != null ? String(order.stopLoss) : "");
      setTpInput(order?.takeProfit != null ? String(order.takeProfit) : "");
      setRemarkInput(pending ? String(order?.remark ?? "") : "");
      setUpdateError(null);
      setSlFieldError(null);
      setTpFieldError(null);
      setEditOpen(true);
    },
    [setEditOrder, setEditOpen],
  );

  const submitEdit = useCallback(async () => {
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
        getOrderId,
        toNumberOrZero,
        accountId,
        { includeRemark: pending, includePendingFields: pending },
      );

      const res = await updateOrder(oid, payload);
      console.log("Update order result:", res);

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
  }, [
    editOrder,
    getOrderId,
    slInput,
    tpInput,
    remarkInput,
    toNumberOrZero,
    validateSlTp,
    accountId,
    setEditOpen,
    setEditOrder,
    setSavingUpdate,
    setUpdateError,
    patchOrderInLists,
  ]);

  const confirmClose = useCallback(
    (order) => {
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

              const payload = buildUpdatePayload(
                order,
                {
                  status: statusForClose(order?.status),
                  executedAt: now,
                  closedAt: now,
                  partialCloseLotSize: toNumberOrZero(fullLot),
                },
                getOrderId,
                toNumberOrZero,
                accountId,
              );

              const result = await updateOrder(oid, payload);
              console.log("Close order result:", result);
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
    },
    [
      getOrderId,
      toNumberOrZero,
      accountId,
      setSavingUpdate,
      setUpdateError,
      removeOrderFromLists,
      expandedOrderId,
      setExpandedOrderId,
    ],
  );

  const toggleSelectedOrder = useCallback(
    (order) => {
      const oid = getOrderId(order);
      if (oid == null) return;
      const key = String(oid);
      setSelectedOrderIds((prev) => {
        const next = { ...(prev || {}) };
        next[key] = !Boolean(next[key]);
        if (!next[key]) delete next[key];
        return next;
      });
    },
    [getOrderId, setSelectedOrderIds],
  );

  const cancelBulkMode = useCallback(() => {
    setBulkMode(false);
    setSelectedOrderIds({});
  }, [setBulkMode, setSelectedOrderIds]);

  const submitBulkDelete = useCallback(() => {
    const keys = Object.keys(selectedOrderIds || {}).filter(
      (k) => selectedOrderIds?.[k],
    );
    if (!keys.length) {
      Alert.alert("Select orders", "Please select at least one order.");
      return;
    }

    Alert.alert(
      "Close selected orders?",
      `This will close ${keys.length} order(s).`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: bulkDeleting ? "Closing…" : "Close",
          style: "destructive",
          onPress: async () => {
            try {
              setBulkDeleting(true);

              const ids = keys.map((k) => {
                const n = Number(k);
                return Number.isFinite(n) ? n : k;
              });

              await bulkClose(ids);

              for (const k of keys) {
                removeOrderFromLists(k);
              }

              setSelectedOrderIds({});
              setBulkMode(false);
            } catch (error) {
              const message =
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                error?.message ||
                "Failed to delete orders.";
              Alert.alert("Error", String(message));
            } finally {
              setBulkDeleting(false);
            }
          },
        },
      ],
    );
  }, [
    selectedOrderIds,
    bulkDeleting,
    setBulkDeleting,
    removeOrderFromLists,
    setSelectedOrderIds,
    setBulkMode,
  ]);

  return {
    slInput,
    setSlInput,
    tpInput,
    setTpInput,
    remarkInput,
    setRemarkInput,
    savingUpdate,
    setSavingUpdate,
    updateError,
    setUpdateError,
    slFieldError,
    setSlFieldError,
    tpFieldError,
    setTpFieldError,
    openEdit,
    submitEdit,
    confirmClose,
    toggleSelectedOrder,
    cancelBulkMode,
    submitBulkDelete,
    selectedCount,
  };
};

// Helper function (assuming it's defined elsewhere or we need to pass it)
const isPendingOrder = (order) => {
  if (!order || typeof order !== "object") return false;
  if (typeof order.isPending === "boolean") return order.isPending;
  const status = (order.status ?? order.orderStatus ?? "")
    .toString()
    .toLowerCase();
  return status === "pending" || status === "placed" || status === "new";
};
