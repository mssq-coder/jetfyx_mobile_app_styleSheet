import {
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AppIcon from "./AppIcon";

const DepositDetailsModal = ({
  visible,
  onClose,
  fields,
  additionalNotes,
  setAdditionalNotes,
  onProceed,
  theme,
}) => {
  const formatFieldsForAlert = (fields = {}) => {
    if (!fields || typeof fields !== "object") return "No details available.";
    return Object.entries(fields)
      .map(([key, value]) => {
        const label = key
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (s) => s.toUpperCase());
        return `${label}: ${value ?? "—"}`;
      })
      .join("\n");
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[{ backgroundColor: theme.background }, styles.modalContainer]}
      >
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>
            Deposit Details
          </Text>
          <TouchableOpacity onPress={onClose}>
            <AppIcon name="close" color={theme.secondary} size={24} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalContent}>
          <Text style={[styles.detailsText, { color: theme.text }]}>
            {formatFieldsForAlert(fields)}
          </Text>
          <TextInput
            style={[
              styles.notesInput,
              {
                color: theme.text,
                borderColor: theme.border,
                backgroundColor: theme.card,
              },
            ]}
            placeholder="Additional Notes (optional)"
            placeholderTextColor={theme.secondary}
            value={additionalNotes}
            onChangeText={setAdditionalNotes}
            multiline
            numberOfLines={4}
          />
        </ScrollView>
        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: theme.border }]}
            onPress={onClose}
          >
            <Text style={[styles.cancelText, { color: theme.text }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.proceedButton, { backgroundColor: theme.primary }]}
            onPress={onProceed}
          >
            <Text style={styles.proceedText}>Proceed</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "700" },
  modalContent: { flex: 1, padding: 20 },
  detailsText: { fontSize: 16, lineHeight: 24 },
  notesInput: {
    marginTop: 20,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: "top",
  },
  modalFooter: { flexDirection: "row", padding: 20, gap: 12 },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelText: { fontSize: 16, fontWeight: "600" },
  proceedButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  proceedText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});

export default DepositDetailsModal;
