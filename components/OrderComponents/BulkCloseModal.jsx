import {
    ActivityIndicator,
    Modal,
    Pressable,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const BulkCloseModal = ({
  visible,
  theme,
  totalCount = 0,
  selectedCount = 0,
  bulkDeleting = false,
  onClose,
  onCancelBulkMode,
  onSelectAll,
  onSelectProfit,
  onSelectLoss,
  onClearSelection,
  onSubmitClose,
}) => {
  const chipStyle = () => ({
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
  });

  const chipTextStyle = () => ({
    fontSize: 12,
    fontWeight: "700",
    color: theme.text,
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1 }}>
        <Pressable
          onPress={onClose}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: "rgba(0,0,0,0.45)",
          }}
        />

        <View
          style={{
            flex: 1,
            justifyContent: "center",
            paddingHorizontal: 16,
          }}
        >
          <View
            style={{
              width: "100%",
              borderRadius: 16,
              padding: 16,
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "800",
                  color: theme.text,
                }}
              >
                Bulk Close
              </Text>

              <TouchableOpacity
                onPress={onClose}
                disabled={bulkDeleting}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 10,
                  backgroundColor: theme.background,
                  opacity: bulkDeleting ? 0.6 : 1,
                }}
                accessibilityRole="button"
                accessibilityLabel="Close bulk close modal"
              >
                <Text style={{ fontWeight: "800", color: theme.text }}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ color: theme.secondary, fontSize: 12 }}>
              Selected {selectedCount} of {totalCount}
            </Text>

            <View style={{ height: 14 }} />

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              <TouchableOpacity
                onPress={onSelectAll}
                disabled={bulkDeleting || totalCount === 0}
                style={{ ...chipStyle(), opacity: bulkDeleting ? 0.6 : 1 }}
                accessibilityRole="button"
                accessibilityLabel="Select all orders"
              >
                <Text style={chipTextStyle()}>Select All</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onSelectProfit}
                disabled={bulkDeleting || totalCount === 0}
                style={{ ...chipStyle(), opacity: bulkDeleting ? 0.6 : 1 }}
                accessibilityRole="button"
                accessibilityLabel="Select profit orders"
              >
                <Text style={chipTextStyle()}>Profit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onSelectLoss}
                disabled={bulkDeleting || totalCount === 0}
                style={{ ...chipStyle(), opacity: bulkDeleting ? 0.6 : 1 }}
                accessibilityRole="button"
                accessibilityLabel="Select loss orders"
              >
                <Text style={chipTextStyle()}>Loss</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onClearSelection}
                disabled={bulkDeleting}
                style={{ ...chipStyle(), opacity: bulkDeleting ? 0.6 : 1 }}
                accessibilityRole="button"
                accessibilityLabel="Clear selection"
              >
                <Text style={chipTextStyle()}>Clear</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 18 }} />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={onCancelBulkMode}
                disabled={bulkDeleting}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: theme.background,
                  borderWidth: 1,
                  borderColor: theme.border,
                  alignItems: "center",
                  opacity: bulkDeleting ? 0.6 : 1,
                }}
                accessibilityRole="button"
                accessibilityLabel="Cancel bulk close"
              >
                <Text style={{ fontWeight: "800", color: theme.text }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onSubmitClose}
                disabled={bulkDeleting || selectedCount === 0}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: theme.negative,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 8,
                  opacity: bulkDeleting || selectedCount === 0 ? 0.6 : 1,
                }}
                accessibilityRole="button"
                accessibilityLabel="Close selected orders"
              >
                {bulkDeleting ? <ActivityIndicator color="#fff" /> : null}
                <Text style={{ fontWeight: "900", color: "#fff" }}>
                  Close ({selectedCount})
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 10 }} />

            <Text style={{ color: theme.secondary, fontSize: 11 }}>
              Tip: choose a filter above, then tap Close.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default BulkCloseModal;
