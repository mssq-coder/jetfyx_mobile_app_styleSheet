import { router } from "expo-router";
import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppIcon from "../../components/AppIcon";
import { useAppTheme } from "../../contexts/ThemeContext";
import { useAuthStore } from "../../store/authStore";

export default function Dashboard() {
  const { theme, themeName, setAppTheme } = useAppTheme();
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState({
    id: "125269143",
    type: "REAL",
    currency: "USD",
    balance: 0,
  });

  // Keep this list small and intentional for now.
  // To add a new theme in the future: add it to constants/theme.js + ThemeContext buildTw + include it here.
  const dashboardThemes = ["light", "dark", "green"];

  const themeLabel = (name) => {
    switch (name) {
      case "light":
        return "Light";
      case "dark":
        return "Dark";
      case "green":
        return "Green";
      default:
        return String(name);
    }
  };

  return (
    <SafeAreaView
      edges={["bottom", "left", "right"]}
      style={{ flex: 1, backgroundColor: theme.background }}
    >
      <StatusBar backgroundColor={theme.primary} barStyle="light-content" />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section with Gradient Background */}
        <View
          style={[styles.headerSection, { backgroundColor: theme.primary }]}
        >
          {/* Theme Picker */}
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              onPress={() => setThemePickerOpen(true)}
              style={styles.themeButton}
              accessibilityRole="button"
              accessibilityLabel="Change theme"
            >
              <AppIcon name="palette" color="white" size={18} />
              <Text style={styles.themeButtonText}>
                {themeLabel(themeName)}
              </Text>
              <AppIcon name="expand-more" color="white" size={18} />
            </TouchableOpacity>
          </View>

          {/* Balance Display */}
          {/* <View className="items-center mb-10">
            <Text className="text-white text-4xl font-bold">$0.00</Text>
          </View> */}

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <ActionButton
              icon="account-balance"
              label="Deposit"
              active
              headerBlue={theme.headerBlue}
            />
            <ActionButton
              icon="trending-up"
              label="Trade"
              headerBlue={theme.headerBlue}
            />
            <ActionButton
              icon="account-balance-wallet"
              label="Withdraw"
              headerBlue={theme.headerBlue}
            />
            <TouchableOpacity
              onPress={() => {
                router.push("/more");
              }}
            >
              <ActionButton
                icon="menu"
                label="More"
                headerBlue={theme.headerBlue}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Theme Picker Modal */}
        <Modal
          animationType="fade"
          transparent
          visible={themePickerOpen}
          onRequestClose={() => setThemePickerOpen(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setThemePickerOpen(false)}
          >
            <Pressable
              style={[styles.modalCard, { backgroundColor: theme.card }]}
              onPress={() => {}}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  Choose theme
                </Text>
                <TouchableOpacity onPress={() => setThemePickerOpen(false)}>
                  <AppIcon name="close" color={theme.icon} size={20} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalOptions}>
                {dashboardThemes.map((name) => {
                  const selected = themeName === name;
                  return (
                    <TouchableOpacity
                      key={name}
                      style={styles.modalOption}
                      onPress={() => {
                        setAppTheme(name);
                        setThemePickerOpen(false);
                      }}
                    >
                      <View style={styles.optionLeft}>
                        <View
                          style={[
                            styles.optionDot,
                            {
                              backgroundColor:
                                name === "light"
                                  ? "#ffffff"
                                  : name === "dark"
                                    ? "#0d0d0d"
                                    : "#16A34A",
                              borderColor: theme.border,
                            },
                          ]}
                        />
                        <Text
                          style={[styles.optionText, { color: theme.text }]}
                        >
                          {themeLabel(name)}
                        </Text>
                      </View>

                      {selected ? (
                        <AppIcon name="check" color={theme.icon} size={20} />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Popular Deposit Methods */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Popular deposit methods
            </Text>
            <AppIcon name="chevron-right" color={theme.icon} size={20} />
          </View>

          <View
            style={[styles.depositMethods, { backgroundColor: theme.card }]}
          >
            <DepositMethod icon="flash-on" label="Bank" color="#00C851" />
            <DepositMethod icon="payment" label="UPI" color="#FF6B35" />
            <DepositMethod icon="attach-money" label="Cards" color="#00C851" />
          </View>
        </View>

        {/* Rewards Section */}
        <View style={styles.sectionContainer}>
          <TouchableOpacity
            onPress={() => {
              router.push("/themeChange");
            }}
            style={styles.sectionHeader}
          >
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              More
            </Text>
            <AppIcon name="chevron-right" color={theme.icon} size={20} />
          </TouchableOpacity>

          {/* Limited Time Offer */}
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <View style={styles.cardContent}>
              <View style={styles.iconRow}>
                <AppIcon name="people" color={theme.icon} size={16} />
                <Text style={[styles.smallText, { color: theme.icon }]}>
                  Become IB
                </Text>
              </View>
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                {"Unlock your welcome\n" + "cashback reward"}
              </Text>
            </View>
            <View
              style={[styles.cardBadge, { backgroundColor: theme.headerBlue }]}
            >
              <AppIcon name="attach-money" color="white" size={30} />
            </View>
          </View>

          <View
            style={[styles.card, { backgroundColor: theme.card, marginTop: 8 }]}
          >
            <View style={styles.cardContent}>
              <View style={styles.iconRow}>
                <AppIcon name="monetization-on" color={theme.icon} size={16} />
                <Text style={[styles.smallText, { color: theme.icon }]}>
                  Copy Trade
                </Text>
              </View>
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                {"Unlock your welcome\n" + "cashback reward"}
              </Text>
            </View>
            <View
              style={[styles.cardBadge, { backgroundColor: theme.headerBlue }]}
            >
              <AppIcon name="trending-up" color="white" size={30} />
            </View>
          </View>

          <View
            style={[styles.card, { backgroundColor: theme.card, marginTop: 8 }]}
          >
            <View style={styles.cardContent}>
              <View style={styles.iconRow}>
                <AppIcon name="textsms" color={theme.icon} size={16} />
                <Text style={[styles.smallText, { color: theme.icon }]}>
                  Logs
                </Text>
              </View>
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                {"Unlock your welcome\n" + "cashback reward"}
              </Text>
            </View>
            <View
              style={[styles.cardBadge, { backgroundColor: theme.headerBlue }]}
            >
              <AppIcon name="notifications" color="white" size={30} />
            </View>
          </View>

          <TouchableOpacity
            onPress={async () => {
              try {
                const logout = useAuthStore.getState().logout;
                if (typeof logout === "function") await logout();
              } catch (err) {
                console.warn("Logout failed", err);
              }
              router.push("/login");
            }}
            style={[styles.logoutButton, { backgroundColor: theme.headerBlue }]}
          >
            <Text className="text-white font-semibold">Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Action Button Component
function ActionButton({ icon, label, active = false, headerBlue }) {
  const primary = headerBlue || "#4285F4";
  return (
    <View style={styles.actionButtonWrapper}>
      <View
        style={[
          styles.actionButtonCircle,
          {
            backgroundColor: active ? "white" : "transparent",
            borderWidth: active ? 0 : 2,
          },
        ]}
      >
        <AppIcon name={icon} color={active ? primary : "white"} size={24} />
      </View>
      <Text style={styles.actionButtonLabel}>{label}</Text>
    </View>
  );
}

// Deposit Method Component
function DepositMethod({ icon, label, color }) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.depositMethod}>
      <View style={[styles.depositIcon, { backgroundColor: color }]}>
        <AppIcon name={icon} color="white" size={24} />
      </View>
      <Text style={[styles.depositLabel, { color: theme.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  headerSection: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 12,
  },
  themeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  themeButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    marginHorizontal: 6,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionContainer: { paddingHorizontal: 20, marginBottom: 20, marginTop: 4 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: "600" },
  depositMethods: {
    borderRadius: 12,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  card: {
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardContent: { flex: 1, marginRight: 12 },
  iconRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  smallText: { fontSize: 12, marginLeft: 8 },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  cardBadge: {
    borderRadius: 8,
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  logoutButton: {
    marginTop: 16,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  actionButtonWrapper: { alignItems: "center" },
  actionButtonCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    borderColor: "white",
  },
  actionButtonLabel: { color: "white", fontSize: 12, fontWeight: "500" },
  depositMethod: { alignItems: "center", flex: 1 },
  depositIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  depositLabel: { fontSize: 12, textAlign: "center", color: "#333" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  modalCard: {
    borderRadius: 14,
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  modalOptions: {
    gap: 8,
  },
  modalOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  optionDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    marginRight: 10,
  },
  optionText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
