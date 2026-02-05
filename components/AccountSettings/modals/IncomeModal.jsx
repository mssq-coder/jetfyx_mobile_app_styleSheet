import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AppIcon from "../../AppIcon";

const INCOME_RANGES = [
  "0-25000",
  "25000-50000",
  "50000-100000",
  "100000-250000",
  "250000+",
];

export default function IncomeModal({
  visible,
  theme,
  selectedIncome,
  onSelectIncome,
  onClose,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: theme.card,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 20,
              elevation: 10,
            },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Select Income Range
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.modalClose,
                { backgroundColor: `${theme.border}50` },
              ]}
            >
              <AppIcon name="close" color={theme.secondary} size={18} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalList}>
            {INCOME_RANGES.map((inc) => (
              <TouchableOpacity
                key={inc}
                onPress={() => {
                  onSelectIncome?.(inc);
                  onClose?.();
                }}
                style={[styles.modalItem, { borderBottomColor: theme.border }]}
              >
                <Text style={[styles.modalItemText, { color: theme.text }]}>
                  {inc}
                </Text>
                {selectedIncome === inc && (
                  <AppIcon name="check" color={theme.primary} size={20} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    borderRadius: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  modalList: {
    maxHeight: 400,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalItemText: {
    fontSize: 16,
    fontWeight: "500",
  },
});
