import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, InteractionManager, SafeAreaView } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { useAuthStore } from "@/store/authStore";
import AccountSummaryModal from "../../components/AccountSummaryModal";
import EditOrderModal from "../../components/OrderComponents/EditOrderModal";
import MultiTargetsModal from "../../components/OrderComponents/MultiTargetsModal";
import { useAppTheme } from "../../contexts/ThemeContext";

import AccountHeader from "../../components/OrderComponents/AccountHeader";
import BulkActionsBar from "../../components/OrderComponents/BulkActionsBar";
import BulkCloseModal from "../../components/OrderComponents/BulkCloseModal";
import BulkEditSlTpModal from "../../components/OrderComponents/BulkEditSlTpModal";
import EmptyState from "../../components/OrderComponents/EmptyState";
import FloatingHistoryButton from "../../components/OrderComponents/FloatingHistoryButton";
import OrderCard from "../../components/OrderComponents/OrderCard";
import ProfitCard from "../../components/OrderComponents/ProfitCard";
import TabNavigation from "../../components/OrderComponents/TabNavigation";

import { useOrderManagement } from "../../hooks/order/useOrderManagement";
import { useOrdersData } from "../../hooks/order/useOrdersData";
import { useTargetsManagement } from "../../hooks/order/useTargetsManagement";
import usePullToRefresh from "../../hooks/usePullToRefresh";
import {
  extractTargetsFromOrder,
  getTargetId,
  getTargetKey,
  mergeTargetsFromHub,
} from "../../utils/order/orderHelpers";

import { updateOrder } from "../../api/orders";
import { deleteOrderTarget } from "../../api/orderTargets";
import { buildUpdatePayload } from "../../utils/order/orderHelpers";
import { showErrorToast, showSuccessToast } from "../../utils/toast";

const OrderListScreen = () => {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { refreshing, runRefresh } = usePullToRefresh();
  const [tab, setTab] = useState("market");
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryContentReady, setSummaryContentReady] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState({});
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkCloseModalOpen, setBulkCloseModalOpen] = useState(false);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkEditSaving, setBulkEditSaving] = useState(false);
  const [quickActionsExpanded, setQuickActionsExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editOrder, setEditOrder] = useState(null);
  const [targetsOpen, setTargetsOpen] = useState(false);
  const [targetsOrder, setTargetsOrder] = useState(null);

  const swipeRefs = useRef(new Map());
  const openSwipeRef = useRef(null);

  const selectedAccountId = useAuthStore((state) => state.selectedAccountId);
  const accounts = useAuthStore((state) => state.accounts);
  const accountId = selectedAccountId;

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

  useEffect(() => {
    if (!bulkMode) {
      setSelectedOrderIds({});
      setBulkCloseModalOpen(false);
      // keep quick actions collapsed when exiting bulk mode
      setQuickActionsExpanded(false);
    } else {
      // bulk mode needs controls visible
      setQuickActionsExpanded(true);
    }
  }, [bulkMode]);

  const setSwipeRef = (ref) => {
    swipeRefs.current.set(String(getOrderId(ref._nativeTag)), ref);
  };

  const closeSwipe = () => {
    if (openSwipeRef.current) {
      openSwipeRef.current.close();
      openSwipeRef.current = null;
    }
  };

  const getOrderProfit = (order) => {
    const v =
      order?.profitOrLoss ??
      order?.pl ??
      order?.profit ??
      order?.unrealizedPnL ??
      order?.pnl ??
      0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const selectOrdersByPredicate = (predicate) => {
    const next = {};
    for (const o of listOrders || []) {
      const oid = getOrderId(o);
      if (oid == null) continue;
      if (!predicate || predicate(o)) next[String(oid)] = true;
    }
    setSelectedOrderIds(next);
  };

  const selectAllOrders = () => selectOrdersByPredicate(() => true);
  const selectProfitOrders = () =>
    selectOrdersByPredicate((o) => getOrderProfit(o) > 0);
  const selectLossOrders = () =>
    selectOrdersByPredicate((o) => getOrderProfit(o) < 0);
  const clearSelection = () => setSelectedOrderIds({});

  const cancelBulkModeAndCloseModal = () => {
    setBulkCloseModalOpen(false);
    setBulkEditOpen(false);
    cancelBulkMode();
  };

  const symbolsList = Object.values(symbolsBySymbol || {});

  const handleBulkSaveSlTp = async ({
    tab,
    symbol,
    orderType,
    stopLoss,
    takeProfit,
  }) => {
    if (bulkEditSaving) return;
    const list = tab === "pending" ? pendingOrders : orders;
    const affected = (list || []).filter((o) => {
      const sym = String(o?.symbol ?? o?.instrument ?? o?.instrumentName ?? "");
      if (sym !== String(symbol)) return false;
      const typeKey = String(
        o?.orderType ??
          o?.type ??
          o?.orderSide ??
          o?.side ??
          o?.direction ??
          "",
      );
      return typeKey === String(orderType);
    });

    if (!affected.length) {
      showErrorToast("No orders matched for bulk edit.", "Bulk edit");
      return;
    }

    const slProvided = String(stopLoss ?? "").trim().length > 0;
    const tpProvided = String(takeProfit ?? "").trim().length > 0;
    if (!slProvided && !tpProvided) return;

    const slNum = slProvided ? toNumberOrZero(stopLoss) : null;
    const tpNum = tpProvided ? toNumberOrZero(takeProfit) : null;

    // Validate per order (market ref/side might differ)
    for (const o of affected) {
      const nextSl = slNum != null ? slNum : toNumberOrZero(o?.stopLoss);
      const nextTp = tpNum != null ? tpNum : toNumberOrZero(o?.takeProfit);
      const { slError, tpError } = validateSlTp(o, nextSl, nextTp);
      if (slError || tpError) {
        showErrorToast(slError || tpError, "Bulk edit");
        return;
      }
    }

    setBulkEditSaving(true);
    try {
      for (const o of affected) {
        const oid = getOrderId(o);
        if (oid == null) continue;

        const nextSl = slNum != null ? slNum : toNumberOrZero(o?.stopLoss);
        const nextTp = tpNum != null ? tpNum : toNumberOrZero(o?.takeProfit);

        const payload = buildUpdatePayload(
          o,
          {
            stopLoss: nextSl,
            takeProfit: nextTp,
            status: o?.status ?? "Ongoing",
          },
          getOrderId,
          toNumberOrZero,
          accountId,
          {
            includeRemark: false,
            includePendingFields: Boolean(isPendingOrder(o)),
          },
        );

        await updateOrder(oid, payload);
        patchOrderInLists(oid, {
          stopLoss: payload.stopLoss,
          takeProfit: payload.takeProfit,
        });
      }

      showSuccessToast(`Updated ${affected.length} order(s).`, "Bulk edit");
      setBulkEditOpen(false);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Bulk update failed.";
      showErrorToast(String(message), "Bulk edit");
    } finally {
      setBulkEditSaving(false);
    }
  };

  const {
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
    patchOrderInLists,
    removeOrderFromLists,
    reloadSymbols,
  } = useOrdersData({
    tab,
  });

  const withLivePrices = useCallback(
    (order) => {
      if (!order || typeof order !== "object") return order;

      const key = String(
        order?.symbol ?? order?.instrument ?? order?.instrumentName ?? "",
      )
        .toUpperCase()
        .trim();

      if (!key) return order;
      const meta = symbolsBySymbol?.[key];
      if (!meta) return order;

      const bid = Number(
        meta?.bid ?? meta?.Bid ?? meta?._rawBid ?? meta?.sellPrice,
      );
      const ask = Number(
        meta?.ask ?? meta?.Ask ?? meta?._rawAsk ?? meta?.buyPrice,
      );

      const metaDigits = Number(meta?.digits);

      // Always prefer the latest quote values for UI display.
      const next = { ...order };
      if (Number.isFinite(bid) && bid > 0) next.bid = bid;
      if (Number.isFinite(ask) && ask > 0) next.ask = ask;

      const nb = Number.isFinite(next.bid) ? Number(next.bid) : 0;
      const na = Number.isFinite(next.ask) ? Number(next.ask) : 0;
      let nextMarket = 0;
      if (nb > 0 && na > 0) nextMarket = (nb + na) / 2;
      else if (na > 0) nextMarket = na;
      else if (nb > 0) nextMarket = nb;
      if (nextMarket > 0) next.marketPrice = nextMarket;

      if (!(Number(next?.digits) >= 0) && Number.isFinite(metaDigits) && metaDigits >= 0) {
        next.digits = metaDigits;
      }
      if (
        !(Number(next?.symbolDigits) >= 0) &&
        Number.isFinite(metaDigits) &&
        metaDigits >= 0
      ) {
        next.symbolDigits = metaDigits;
      }

      // Avoid unnecessary re-renders when nothing changed.
      const changedBid = Number(next?.bid) !== Number(order?.bid);
      const changedAsk = Number(next?.ask) !== Number(order?.ask);
      const changedMarket = Number(next?.marketPrice) !== Number(order?.marketPrice);
      const changedDigits = Number(next?.digits) !== Number(order?.digits);
      const changedSymbolDigits = Number(next?.symbolDigits) !== Number(order?.symbolDigits);
      if (!changedBid && !changedAsk && !changedMarket && !changedDigits && !changedSymbolDigits) {
        return order;
      }

      return next;
    },
    [symbolsBySymbol],
  );

  const liveEditOrder = useMemo(() => {
    if (!editOrder) return null;
    const editId = getOrderId(editOrder);
    if (editId == null) return withLivePrices(editOrder);

    const key = String(editId);
    const fromOngoing = (orders || []).find(
      (o) => String(getOrderId(o)) === key,
    );
    const fromPending = (pendingOrders || []).find(
      (o) => String(getOrderId(o)) === key,
    );

    return withLivePrices(fromOngoing || fromPending || editOrder);
  }, [editOrder, orders, pendingOrders, getOrderId, withLivePrices]);

  const selectedAccount = accounts?.find(
    (a) => String(a?.accountId ?? a?.id) === String(accountId),
  );

  const {
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
    deleteEditOrder,
    confirmClose,
    toggleSelectedOrder,
    cancelBulkMode,
    submitBulkDelete,
    selectedCount,

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

    partialLotInput,
    setPartialLotInput,
    partialSaving,
    partialError,
    submitPartialClose,
  } = useOrderManagement({
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
  });

  const {
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
    openTargets,
    createTarget,
    updateTarget,
    removeTarget,
    removeLocalTempTarget,
  } = useTargetsManagement({
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
  });

  const editOrderId = editOrder ? getOrderId(editOrder) : null;
  const editTargetsFromState =
    editOrderId != null ? getTargetsForOrderId(editOrderId) : [];
  const editTargetsFromOrder = editOrder
    ? extractTargetsFromOrder(editOrder)
    : [];
  const editTargets = (
    (editTargetsFromState && editTargetsFromState.length
      ? editTargetsFromState
      : editTargetsFromOrder) || []
  ).filter((t) => !t?.isDeleted && !t?.isClosed);

  const deleteTargetFromEditModal = async (targetId) => {
    if (!editOrder) return;
    const oid = getOrderId(editOrder);
    if (oid == null) return;
    if (targetsSaving) return;

    setTargetsSaving(true);
    try {
      await deleteOrderTarget(targetId);
      const existing = getTargetsForOrderId(oid);
      const next = (existing || []).filter(
        (t) => String(getTargetId(t)) !== String(targetId),
      );
      setTargetsForOrderId(oid, next);
      showSuccessToast("Target deleted", "Multi target");
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Failed to delete target.";
      showErrorToast(String(message), "Multi target");
    } finally {
      setTargetsSaving(false);
    }
  };

  const keyExtractor = useCallback((o) => String(getOrderId(o)), [getOrderId]);

  const renderOrderItem = useCallback(
    ({ item }) => (
      <OrderCard
        order={withLivePrices(item)}
        theme={theme}
        expandedOrderId={expandedOrderId}
        setExpandedOrderId={setExpandedOrderId}
        bulkMode={bulkMode}
        selectedOrderIds={selectedOrderIds}
        toggleSelectedOrder={toggleSelectedOrder}
        openEdit={openEdit}
        confirmClose={confirmClose}
        openTargets={openTargets}
        savingUpdate={savingUpdate}
        updateError={updateError}
        getOrderId={getOrderId}
        getOrderLotSize={getOrderLotSize}
        getMinLotSizeForOrder={getMinLotSizeForOrder}
        getTargetsForOrderId={getTargetsForOrderId}
        getTargetId={getTargetId}
        getTargetKey={getTargetKey}
        toNumberOrZero={toNumberOrZero}
        closeSwipe={closeSwipe}
        swipeRefs={swipeRefs}
        openSwipeRef={openSwipeRef}
        targetsSaving={targetsSaving}
      />
    ),
    [
      bulkMode,
      confirmClose,
      expandedOrderId,
      getMinLotSizeForOrder,
      getOrderId,
      getOrderLotSize,
      getTargetId,
      getTargetKey,
      getTargetsForOrderId,
      openEdit,
      openTargets,
      savingUpdate,
      selectedOrderIds,
      setExpandedOrderId,
      theme,
      toNumberOrZero,
      toggleSelectedOrder,
      updateError,
      closeSwipe,
      targetsSaving,
      withLivePrices,
    ],
  );

  const listHeader = useMemo(
    () => (
      <>
        <AccountHeader
          theme={theme}
          account={account}
          summaryLoading={summaryLoading}
          selectedAccount={selectedAccount}
          setSummaryOpen={setSummaryOpen}
          summaryOpen={summaryOpen}
        />

        <TabNavigation
          theme={theme}
          tab={tab}
          setTab={setTab}
          orders={orders}
          pendingOrders={pendingOrders}
        />

        <ProfitCard
          theme={theme}
          floatingProfit={floatingProfit}
          bulkMode={bulkMode}
          quickExpanded={quickActionsExpanded}
          onToggleQuickActions={() => setQuickActionsExpanded((prev) => !prev)}
        />

        <BulkActionsBar
          theme={theme}
          bulkMode={bulkMode}
          bulkDeleting={bulkDeleting}
          selectedCount={selectedCount}
          quickExpanded={quickActionsExpanded}
          onToggleQuickExpanded={() => setQuickActionsExpanded((prev) => !prev)}
          onPressCloseAll={() => {
            setBulkMode(true);
            setSelectedOrderIds({});
            setExpandedOrderId(null);
            openSwipeRef.current?.close?.();
            setBulkCloseModalOpen(true);
          }}
          onPressBulkEdit={() => setBulkEditOpen(true)}
          onPressFilters={() => setBulkCloseModalOpen(true)}
          onPressCancel={cancelBulkModeAndCloseModal}
          onPressSubmitClose={submitBulkDelete}
        />
      </>
    ),
    [
      account,
      bulkDeleting,
      bulkMode,
      cancelBulkModeAndCloseModal,
      floatingProfit,
      orders,
      pendingOrders,
      quickActionsExpanded,
      selectedAccount,
      selectedCount,
      setBulkMode,
      setSelectedOrderIds,
      setTab,
      submitBulkDelete,
      summaryLoading,
      summaryOpen,
      tab,
      theme,
    ],
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <FlatList
          data={listOrders}
          keyExtractor={keyExtractor}
          contentContainerStyle={{ paddingBottom: 140 }}
          ListHeaderComponent={listHeader}
          renderItem={renderOrderItem}
          ListEmptyComponent={() => <EmptyState theme={theme} />}
          refreshing={refreshing}
          onRefresh={() => runRefresh(reloadSymbols)}
        />

        <FloatingHistoryButton router={router} theme={theme} />

        <BulkCloseModal
          visible={bulkCloseModalOpen}
          theme={theme}
          totalCount={(listOrders || []).length}
          selectedCount={selectedCount}
          bulkDeleting={bulkDeleting}
          onClose={() => setBulkCloseModalOpen(false)}
          onCancelBulkMode={cancelBulkModeAndCloseModal}
          onSelectAll={selectAllOrders}
          onSelectProfit={selectProfitOrders}
          onSelectLoss={selectLossOrders}
          onClearSelection={clearSelection}
          onSubmitClose={submitBulkDelete}
        />

        <BulkEditSlTpModal
          visible={bulkEditOpen}
          theme={theme}
          ongoingOrders={orders}
          pendingOrders={pendingOrders}
          symbols={symbolsList}
          saving={bulkEditSaving}
          onClose={() => setBulkEditOpen(false)}
          onSave={handleBulkSaveSlTp}
          validateSlTp={validateSlTp}
          getOrderId={getOrderId}
          getMarketReferencePrice={getMarketReferencePrice}
          getPriceDigits={getPriceDigits}
          getPriceStep={getPriceStep}
          formatWithDigits={formatWithDigits}
          adjustInputByStep={adjustInputByStep}
          toNumberOrZero={toNumberOrZero}
          styles={styles}
        />

        <AccountSummaryModal
          visible={summaryOpen}
          onClose={() => setSummaryOpen(false)}
          summaryContentReady={summaryContentReady}
          account={account}
          theme={theme}
        />

        <EditOrderModal
          visible={editOpen}
          theme={theme}
          order={liveEditOrder}
          saving={savingUpdate}
          partialSaving={partialSaving}
          targetsSaving={targetsSaving}
          onSubmit={submitEdit}
          onSubmitPartialClose={submitPartialClose}
          onDelete={deleteEditOrder}
          onClose={() => {
            setEditOpen(false);
            setEditOrder(null);
          }}
          updateError={updateError}
          setUpdateError={setUpdateError}
          slInput={slInput}
          setSlInput={setSlInput}
          tpInput={tpInput}
          setTpInput={setTpInput}
          remarkInput={remarkInput}
          setRemarkInput={setRemarkInput}
          slFieldError={slFieldError}
          tpFieldError={tpFieldError}
          lotSizeInput={lotSizeInput}
          setLotSizeInput={setLotSizeInput}
          entryPriceInput={entryPriceInput}
          setEntryPriceInput={setEntryPriceInput}
          expiryEnabled={expiryEnabled}
          setExpiryEnabled={setExpiryEnabled}
          expiryIso={expiryIso}
          setExpiryIso={setExpiryIso}
          shiftExpiry={shiftExpiry}
          remarkLocked={remarkLocked}
          partialLotInput={partialLotInput}
          setPartialLotInput={setPartialLotInput}
          partialError={partialError}
          targets={editTargets}
          onDeleteTarget={deleteTargetFromEditModal}
          getOrderId={getOrderId}
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
