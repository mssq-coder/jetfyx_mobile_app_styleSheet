import { useCallback, useState } from "react";
import { bulkClose, deleteOrder, updateOrder } from "../../api/orders";
import {
    buildUpdatePayload,
    statusForClose,
} from "../../utils/order/orderHelpers";
import {
    showConfirmToast,
    showErrorToast,
    showInfoToast,
    showSuccessToast,
} from "../../utils/toast";

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
  getOrderLotSize,
  isPendingOrder,
  toNumberOrZero,
  validateSlTp,
  accountId,
  patchOrderInLists,
  removeOrderFromLists,
}) => {
  const [slInput, setSlInput] = useState("");
  const [tpInput, setTpInput] = useState("");
  const [remarkInput, setRemarkInput] = useState("");

  // Pending-order fields
  const [entryPriceInput, setEntryPriceInput] = useState("");
  const [lotSizeInput, setLotSizeInput] = useState("");
  const [expiryEnabled, setExpiryEnabled] = useState(false);
  const [expiryIso, setExpiryIso] = useState("");
  const [remarkLocked, setRemarkLocked] = useState(false);

  // Partial close
  const [partialLotInput, setPartialLotInput] = useState("");
  const [partialSaving, setPartialSaving] = useState(false);
  const [partialError, setPartialError] = useState(null);

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

      if (pending) {
        const lot =
          order?.lotSizeForPendingOrders ??
          order?.lotSizeForPendingOrder ??
          order?.lotSize ??
          "";
        setLotSizeInput(lot != null ? String(lot) : "");

        const entry =
          order?.entryPriceForPendingOrders ??
          order?.entryPriceForPendingOrder ??
          order?.EntryPriceForPendingOrder ??
          order?.entryPrice ??
          "";
        setEntryPriceInput(entry != null ? String(entry) : "");

        const enabled = Boolean(
          order?.isExpirationTimeEnabledForPendingOrder ??
          order?.isExpirationTimeEnabled ??
          false,
        );
        setExpiryEnabled(enabled);
        const exp = order?.expirationTimeForPendingOrder ?? order?.expiry ?? "";
        setExpiryIso(exp != null ? String(exp) : "");

        const hasInitialRemark =
          order?.remark != null && String(order?.remark).trim().length > 0;
        setRemarkLocked(hasInitialRemark);
      } else {
        setEntryPriceInput("");
        setLotSizeInput("");
        setExpiryEnabled(false);
        setExpiryIso("");
        setRemarkLocked(false);
      }

      setPartialLotInput("");
      setPartialError(null);
      setUpdateError(null);
      setSlFieldError(null);
      setTpFieldError(null);
      setEditOpen(true);
    },
    [setEditOrder, setEditOpen, isPendingOrder],
  );

  const shiftExpiry = useCallback(
    (deltaMs) => {
      const base =
        expiryIso && !Number.isNaN(Date.parse(expiryIso))
          ? new Date(expiryIso).getTime()
          : Date.now();
      const nextIso = new Date(base + (Number(deltaMs) || 0)).toISOString();
      setExpiryEnabled(true);
      setExpiryIso(nextIso);
    },
    [expiryIso],
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
      const normalizedExpiryIso = (() => {
        if (!pending) return null;
        if (!expiryEnabled) {
          const existing = editOrder?.expirationTimeForPendingOrder;
          if (existing && !Number.isNaN(Date.parse(existing))) {
            return new Date(existing).toISOString();
          }
          return new Date().toISOString();
        }

        if (expiryIso && !Number.isNaN(Date.parse(expiryIso))) {
          return new Date(expiryIso).toISOString();
        }
        return new Date().toISOString();
      })();

      const payload = buildUpdatePayload(
        editOrder,
        {
          stopLoss: slValue,
          takeProfit: tpValue,
          status: editOrder?.status ?? "Ongoing",
          ...(pending
            ? {
                remark: remarkInput,
                entryPriceForPendingOrders: toNumberOrZero(entryPriceInput),
                lotSizeForPendingOrders: toNumberOrZero(lotSizeInput),
                expirationTimeForPendingOrder: normalizedExpiryIso,
                isExpirationTimeEnabledForPendingOrder: Boolean(expiryEnabled),
              }
            : {}),
        },
        getOrderId,
        toNumberOrZero,
        accountId,
        { includeRemark: pending, includePendingFields: pending },
      );

      const res = await updateOrder(oid, payload);
      //console.log("Update order result:", res);

      const patch = {
        stopLoss: payload.stopLoss,
        takeProfit: payload.takeProfit,
      };
      if (pending) {
        patch.remark = payload.remark;
        patch.entryPriceForPendingOrders = payload.entryPriceForPendingOrders;
        patch.lotSizeForPendingOrders = payload.lotSizeForPendingOrders;
        patch.expirationTimeForPendingOrder =
          payload.expirationTimeForPendingOrder;
        patch.isExpirationTimeEnabledForPendingOrder =
          payload.isExpirationTimeEnabledForPendingOrder;
      }
      patchOrderInLists(oid, patch);

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
    getOrderLotSize,
    slInput,
    tpInput,
    remarkInput,
    entryPriceInput,
    lotSizeInput,
    expiryEnabled,
    expiryIso,
    toNumberOrZero,
    validateSlTp,
    accountId,
    setEditOpen,
    setEditOrder,
    setSavingUpdate,
    setUpdateError,
    patchOrderInLists,
  ]);

  const submitPartialClose = useCallback(async () => {
    if (!editOrder) return;
    const oid = getOrderId(editOrder);
    if (oid == null) {
      setPartialError("Missing order id");
      return;
    }

    const maxLot =
      typeof getOrderLotSize === "function" ? getOrderLotSize(editOrder) : 0;
    const lot = toNumberOrZero(partialLotInput);
    if (!(lot > 0)) {
      setPartialError("Please enter a valid partial lot size.");
      return;
    }
    if (maxLot > 0 && lot > maxLot) {
      setPartialError(`Partial close lot cannot exceed ${maxLot}.`);
      return;
    }

    setPartialSaving(true);
    setPartialError(null);
    try {
      const payload = buildUpdatePayload(
        editOrder,
        {
          partialCloseLotSize: lot,
          status: editOrder?.status ?? "Ongoing",
        },
        getOrderId,
        toNumberOrZero,
        accountId,
      );
      await updateOrder(oid, payload);
      showSuccessToast("Partial close successful", "Order");
      setEditOpen(false);
      setEditOrder(null);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Partial close failed.";
      setPartialError(String(message));
      showErrorToast(String(message), "Partial close");
    } finally {
      setPartialSaving(false);
    }
  }, [
    editOrder,
    getOrderId,
    getOrderLotSize,
    toNumberOrZero,
    partialLotInput,
    accountId,
    setEditOpen,
    setEditOrder,
  ]);

  const deleteEditOrder = useCallback(async () => {
    if (!editOrder) return;
    const oid = getOrderId(editOrder);
    if (oid == null) {
      showErrorToast("Missing order id.", "Delete order");
      return;
    }

    const pending = isPendingOrder(editOrder);
    if (!pending) {
      showInfoToast(
        "Only pending orders can be deleted/canceled here.",
        "Delete order",
      );
      return;
    }

    showConfirmToast({
      title: "Delete order",
      message: "Delete/cancel this pending order?",
      confirmText: "Delete",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          setSavingUpdate(true);
          await deleteOrder(oid);
          removeOrderFromLists(oid);
          setEditOpen(false);
          setEditOrder(null);
          showSuccessToast("Order deleted/canceled", "Order");
        } catch (error) {
          const message =
            error?.response?.data?.message ||
            error?.response?.data?.error ||
            error?.message ||
            "Failed to delete/cancel order.";
          showErrorToast(String(message), "Delete order");
        } finally {
          setSavingUpdate(false);
        }
      },
    });
  }, [
    editOrder,
    getOrderId,
    isPendingOrder,
    removeOrderFromLists,
    setEditOpen,
    setEditOrder,
  ]);

  const confirmClose = useCallback(
    (order) => {
      const oid = getOrderId(order);
      if (oid == null) {
        showErrorToast("Missing order id.", "Close order");
        return;
      }

      const symbol =
        order?.symbol ?? order?.instrument ?? order?.instrumentName ?? "—";

      showConfirmToast({
        title: "Close order",
        message: `Close ${symbol}?`,
        confirmText: "Close",
        cancelText: "Cancel",
        onConfirm: async () => {
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
            //console.log("Close order result:", result);
            removeOrderFromLists(oid);
            if (expandedOrderId === oid) setExpandedOrderId(null);
          } catch (error) {
            const message =
              error?.response?.data?.message ||
              error?.response?.data?.error ||
              error?.message ||
              "Failed to close order.";
            setUpdateError(String(message));
            showErrorToast(String(message), "Close order");
          } finally {
            setSavingUpdate(false);
          }
        },
      });
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
      showInfoToast("Please select at least one order.", "Select orders");
      return;
    }

    showConfirmToast({
      title: "Close selected orders?",
      message: `This will close ${keys.length} order(s).`,
      confirmText: bulkDeleting ? "Closing…" : "Close",
      cancelText: "Cancel",
      onConfirm: async () => {
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
          showErrorToast(String(message));
        } finally {
          setBulkDeleting(false);
        }
      },
    });
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

    // Pending fields
    entryPriceInput,
    setEntryPriceInput,
    lotSizeInput,
    setLotSizeInput,
    expiryEnabled,
    setExpiryEnabled,
    expiryIso,
    setExpiryIso,
    shiftExpiry,
    remarkLocked,

    // Partial close
    partialLotInput,
    setPartialLotInput,
    partialSaving,
    partialError,
    submitPartialClose,

    // Delete
    deleteEditOrder,

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
