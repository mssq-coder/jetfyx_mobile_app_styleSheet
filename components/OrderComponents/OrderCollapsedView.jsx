import { View, Text } from "react-native";

const OrderCollapsedView = ({ order, theme, bulkMode, isSelected, getOrderId }) => {
  const orderId = getOrderId(order);
  const symbol = order.symbol ?? order.instrument ?? order.instrumentName ?? "—";
  const orderType = order.orderType ?? order.side ?? order.direction ?? "BUY";
  const entryPrice = order.entryPrice ?? 0;
  const lotSize = order.lotSize ?? order.remainingLotSize ?? 0;
  const pnl = order.profitOrLoss ?? 0;
  const pnlPercent = order.profitOrLossInPercentage ?? 0;
  const isPositive = pnl >= 0;
  const isBuy = String(orderType).toLowerCase().includes("buy");

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 14,
        gap: 8,
      }}
    >
      {bulkMode ? (
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            borderWidth: 1.5,
            borderColor: isSelected ? theme.primary : theme.border,
            backgroundColor: isSelected ? theme.primary : "transparent",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isSelected ? (
            <Text
              style={{
                color: "#fff",
                fontSize: 14,
                fontWeight: "800",
                lineHeight: 16,
              }}
            >
              ✓
            </Text>
          ) : null}
        </View>
      ) : null}

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
  );
};

export default OrderCollapsedView;