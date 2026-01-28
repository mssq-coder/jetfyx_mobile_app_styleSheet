import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

const OrderExpandedView = ({
  order,
  theme,
  bulkMode,
  isSelected,
  getTargetsForOrderId,
  getTargetId,
  getTargetKey,
  toNumberOrZero,
  openEdit,
  confirmClose,
  savingUpdate,
  updateError,
  orderId,
}) => {
  const symbol =
    order.symbol ?? order.instrument ?? order.instrumentName ?? "—";
  const orderType = order.orderType ?? order.side ?? order.direction ?? "BUY";
  const entryPrice = order.entryPrice ?? 0;
  const marketPrice = order.marketPrice ?? 0;
  const lotSize = order.lotSize ?? order.remainingLotSize ?? 0;
  const pnl = order.profitOrLoss ?? 0;
  const pnlPercent = order.profitOrLossInPercentage ?? 0;
  const status = order.status ?? "Ongoing";
  const orderTime = order.orderTime ?? order.createdAt;
  const isPositive = pnl >= 0;
  const isBuy = String(orderType).toLowerCase().includes("buy");

  const targets = orderId != null ? getTargetsForOrderId(orderId) : [];

  return (
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
              marginRight: 10,
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
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 12,
              color: theme.secondary,
              marginBottom: 2,
              fontWeight: "500",
            }}
          >
            {orderTime ? new Date(orderTime).toLocaleTimeString() : "--"}
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
              color: isPositive ? theme.positive : theme.negative,
              letterSpacing: 0.3,
            }}
          >
            ${pnl.toFixed(2)}
          </Text>
        </View>
        <View style={{ width: 1, backgroundColor: theme.border }} />
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
              color: isPositive ? theme.positive : theme.negative,
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
            ${(order.orderMargin ?? 0).toFixed(2)}
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
            ${(order.commission ?? 0).toFixed(2)}
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
            {(order.stopLoss ?? 0) > 0 ? order.stopLoss.toFixed(2) : "--"}
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
            {(order.takeProfit ?? 0 > 0)
              ? (order.takeProfit ?? 0).toFixed(2)
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
              color: order.swap < 0 ? theme.negative : theme.positive,
              fontWeight: "700",
            }}
          >
            ${(order.swap ?? 0).toFixed(2)}
          </Text>
        </View>
      </View>

      {targets.length > 0 && (
        <TargetsSection
          targets={targets}
          theme={theme}
          getTargetId={getTargetId}
          getTargetKey={getTargetKey}
          toNumberOrZero={toNumberOrZero}
        />
      )}

      {/* Actions */}
      <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
        <TouchableOpacity
          onPress={() => openEdit(order)}
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
          onPress={() => confirmClose(order)}
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
  );
};

const TargetsSection = ({
  targets,
  theme,
  getTargetId,
  getTargetKey,
  toNumberOrZero,
}) => (
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
              Lot: {toNumberOrZero(t?.lotSize).toFixed(2)}
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

export default OrderExpandedView;
