import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import AccountSummary from "../components/Accounts/AccountSummary";

const AccountSummaryModal = ({
  visible,
  onClose,
  summaryContentReady,
  account,
  theme,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1 }}>
        {/* Backdrop */}
        <Pressable
          style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: "rgba(190, 190, 190, 0.35)",
          }}
          onPress={onClose}
        />

        {/* Centered Content */}
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 16,
          }}
          pointerEvents="box-none"
        >
          {summaryContentReady ? (
            <View style={{ width: "100%", maxWidth: 420 }}>
              <AccountSummary account={account} />
            </View>
          ) : (
            <View
              style={{
                width: "100%",
                maxWidth: 420,
                borderRadius: 16,
                padding: 16,
                backgroundColor: theme.card,
              }}
            >
              <Text style={{ color: theme.secondary, fontSize: 12 }}>
                Loading…
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default AccountSummaryModal;
