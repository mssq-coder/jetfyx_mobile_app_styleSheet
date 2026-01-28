import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { FlatList, InteractionManager, SafeAreaView } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { useAuthStore } from "@/store/authStore";
import AccountSummaryModal from "../../components/AccountSummaryModal";
import MultiTargetsModal from "../../components/OrderComponents/MultiTargetsModal";
import UpdateSlTpModal from "../../components/OrderComponents/UpdateSlTpModal";
import { useAppTheme } from "../../contexts/ThemeContext";

import AccountHeader from "../../components/OrderComponents/AccountHeader";
import EmptyState from "../../components/OrderComponents/EmptyState";
import FloatingHistoryButton from "../../components/OrderComponents/FloatingHistoryButton";
import OrderCard from "../../components/OrderComponents/OrderCard";
import ProfitCard from "../../components/OrderComponents/ProfitCard";
import TabNavigation from "../../components/OrderComponents/TabNavigation";

import { useOrderManagement } from "../../hooks/order/useOrderManagement";
import { useOrdersData } from "../../hooks/order/useOrdersData";
import { useTargetsManagement } from "../../hooks/order/useTargetsManagement";
import {
  extractTargetsFromOrder,
  getTargetId,
  getTargetKey,
  mergeTargetsFromHub,
} from "../../utils/order/orderHelpers";

const OrderListScreen = () => {
  const router = useRouter();
  const { theme } = useAppTheme();
  const [tab, setTab] = useState("market");
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryContentReady, setSummaryContentReady] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState({});
  const [bulkDeleting, setBulkDeleting] = useState(false);
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

  // These functions need to be defined or passed from hooks
  const patchOrderInLists = (orderIdToPatch, patch) => {
    // Implementation from original code
  };

  const removeOrderFromLists = (orderIdToRemove) => {
    // Implementation from original code
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
  } = useOrdersData({
    tab,
  });

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
    confirmClose,
    toggleSelectedOrder,
    cancelBulkMode,
    submitBulkDelete,
    selectedCount,
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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <FlatList
          data={listOrders}
          keyExtractor={(o) => String(getOrderId(o))}
          contentContainerStyle={{ paddingBottom: 140 }}
          ListHeaderComponent={() => (
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
                setBulkMode={setBulkMode}
                setSelectedOrderIds={setSelectedOrderIds}
                setExpandedOrderId={setExpandedOrderId}
                openSwipeRef={openSwipeRef}
                cancelBulkMode={cancelBulkMode}
                submitBulkDelete={submitBulkDelete}
                selectedCount={selectedCount}
                bulkDeleting={bulkDeleting}
              />
            </>
          )}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
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
          )}
          ListEmptyComponent={() => <EmptyState theme={theme} />}
        />

        <FloatingHistoryButton router={router} theme={theme} />

        <AccountSummaryModal
          visible={summaryOpen}
          onClose={() => setSummaryOpen(false)}
          summaryContentReady={summaryContentReady}
          account={account}
          theme={theme}
        />

        <UpdateSlTpModal
          visible={editOpen}
          theme={theme}
          order={editOrder}
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
