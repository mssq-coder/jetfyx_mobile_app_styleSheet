import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

const ProfitCard = ({
  theme,
  floatingProfit,
  bulkMode,
  setBulkMode,
  setSelectedOrderIds,
  setExpandedOrderId,
  openSwipeRef,
  cancelBulkMode,
  submitBulkDelete,
  selectedCount,
  bulkDeleting,
}) => {
  return (
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
              color: floatingProfit >= 0 ? theme.positive : theme.negative,
            }}
          >
            ${floatingProfit.toFixed(2)}
          </Text>
        </View>

        {!bulkMode ? (
          <TouchableOpacity
            onPress={() => {
              setBulkMode(true);
              setSelectedOrderIds({});
              setExpandedOrderId(null);
              openSwipeRef.current?.close?.();
            }}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 12,
              backgroundColor: theme.background,
            }}
            accessibilityRole="button"
            accessibilityLabel="Enable multi-select close"
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
        ) : (
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              onPress={cancelBulkMode}
              disabled={bulkDeleting}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 12,
                backgroundColor: theme.background,
                opacity: bulkDeleting ? 0.6 : 1,
              }}
              accessibilityRole="button"
              accessibilityLabel="Cancel multi-select"
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: theme.text,
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={submitBulkDelete}
              disabled={bulkDeleting}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 12,
                backgroundColor: theme.negative,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                opacity: bulkDeleting ? 0.6 : 1,
              }}
              accessibilityRole="button"
              accessibilityLabel="Delete selected orders"
            >
              {bulkDeleting ? <ActivityIndicator color="#fff" /> : null}
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: "#fff",
                }}
              >
                Close ({selectedCount})
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

export default ProfitCard;
