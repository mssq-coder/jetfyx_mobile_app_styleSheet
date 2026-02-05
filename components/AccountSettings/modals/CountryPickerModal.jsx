import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AppIcon from "../../AppIcon";

export default function CountryPickerModal({
  visible,
  theme,
  countriesLoading,
  countries,
  selectedCountry,
  onSelectCountry,
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
              Select Country
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

          {countriesLoading ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator color={theme.primary} size="large" />
              <Text
                style={[styles.modalLoadingText, { color: theme.secondary }]}
              >
                Loading countries...
              </Text>
            </View>
          ) : Array.isArray(countries) && countries.length > 0 ? (
            <ScrollView style={styles.modalList}>
              {countries.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => {
                    onSelectCountry?.(c);
                    onClose?.();
                  }}
                  style={[
                    styles.modalItem,
                    { borderBottomColor: theme.border },
                  ]}
                >
                  <Text style={[styles.modalItemText, { color: theme.text }]}>
                    {c}
                  </Text>
                  {selectedCountry === c && (
                    <AppIcon name="check" color={theme.primary} size={20} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.modalEmpty}>
              <AppIcon name="search-off" color={theme.secondary} size={40} />
              <Text style={[styles.modalEmptyText, { color: theme.secondary }]}>
                No countries available
              </Text>
            </View>
          )}
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
  modalLoading: {
    padding: 40,
    alignItems: "center",
  },
  modalLoadingText: {
    marginTop: 12,
    fontSize: 14,
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
  modalEmpty: {
    padding: 40,
    alignItems: "center",
  },
  modalEmptyText: {
    marginTop: 12,
    fontSize: 16,
  },
});
