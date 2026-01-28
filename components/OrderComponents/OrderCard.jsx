import { useCallback } from "react";
import { Alert, TouchableOpacity, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import AppIcon from "../AppIcon";
import OrderCollapsedView from "./OrderCollapsedView";
import OrderExpandedView from "./OrderExpandedView";

const OrderCard = ({
  order,
  theme,
  expandedOrderId,
  setExpandedOrderId,
  bulkMode,
  selectedOrderIds,
  toggleSelectedOrder,
  openEdit,
  confirmClose,
  openTargets,
  savingUpdate,
  updateError,
  getOrderId,
  getOrderLotSize,
  getMinLotSizeForOrder,
  getTargetsForOrderId,
  getTargetId,
  getTargetKey,
  toNumberOrZero,
  closeSwipe,
  swipeRefs,
  openSwipeRef,
  targetsSaving,
}) => {
  const orderId = getOrderId(order);
  const isExpanded = expandedOrderId === orderId;
  const isSelected = Boolean(selectedOrderIds?.[String(orderId)]);
  const orderLot = getOrderLotSize(order);
  const minLot = getMinLotSizeForOrder(order);
  const multiTargetEnabled = Boolean(minLot > 0 && orderLot > minLot);

  const setSwipeRef = useCallback(
    (ref) => {
      if (ref) {
        swipeRefs.current.set(String(orderId), ref);
      } else {
        swipeRefs.current.delete(String(orderId));
      }
    },
    [orderId],
  );

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
          openTargets(order);
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
          confirmClose(order);
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
      enabled={!bulkMode}
      renderRightActions={bulkMode ? undefined : renderRightActions}
      rightThreshold={30}
      friction={1.8}
      overshootRight={false}
      useNativeAnimations
      onSwipeableWillOpen={() => {
        if (bulkMode) return;
        const current = swipeRefs.current.get(String(orderId));
        if (openSwipeRef.current && openSwipeRef.current !== current) {
          openSwipeRef.current?.close?.();
        }
        openSwipeRef.current = current;
      }}
    >
      <TouchableOpacity
        onPress={() => {
          if (bulkMode) {
            toggleSelectedOrder(order);
            return;
          }
          setExpandedOrderId(isExpanded ? null : orderId);
        }}
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
        {!isExpanded ? (
          <OrderCollapsedView
            order={order}
            theme={theme}
            bulkMode={bulkMode}
            isSelected={isSelected}
            getOrderId={getOrderId}
          />
        ) : (
          <OrderExpandedView
            order={order}
            theme={theme}
            bulkMode={bulkMode}
            isSelected={isSelected}
            getOrderId={getOrderId}
            getTargetsForOrderId={getTargetsForOrderId}
            getTargetId={getTargetId}
            getTargetKey={getTargetKey}
            toNumberOrZero={toNumberOrZero}
            openEdit={openEdit}
            confirmClose={confirmClose}
            savingUpdate={savingUpdate}
            updateError={updateError}
            orderId={orderId}
          />
        )}
      </TouchableOpacity>
    </Swipeable>
  );
};

export default OrderCard;
