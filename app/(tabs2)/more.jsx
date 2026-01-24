import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getUserDetails } from "../../api/getServices";
import AppIcon from "../../components/AppIcon";
import { useAppTheme } from "../../contexts/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import { useUserStore } from "../../store/userStore";

export default function RealAccountsScreen() {
  const { theme } = useAppTheme();
  const [activeTab, setActiveTab] = useState("ACTIONS");

  const { accounts, selectedAccountId, userId } = useAuthStore();
  const selectedAccount =
    accounts.find((acc) => (acc.accountId || acc.id) === selectedAccountId) ||
    accounts[0];

  const setUserData = useUserStore((s) => s.setUserData);

  const accountData = {
    id:
      selectedAccount?.accountNumber ||
      selectedAccount?.accountId ||
      selectedAccount?.id ||
      "N/A",
    balance: selectedAccount?.balance ? `$${selectedAccount.balance}` : "$0.00",
    type:
      selectedAccount?.accountTypeName ||
      selectedAccount?.type ||
      selectedAccount?.accountType ||
      "N/A",
  };

  const actionItems = [
    { id: 1, icon: "account-balance-wallet", title: "Deposit" },
    { id: 2, icon: "trending-up", title: "Trade" },
    { id: 3, icon: "account-balance-wallet", title: "Withdrawal" },
    { id: 4, icon: "swap-horiz", title: "Internal transfer" },
    { id: 5, icon: "history", title: "Operation history" },
    { id: 6, icon: "settings", title: "Account settings" },
  ];

  const handleActionPress = (item) => {
    if (item.title === "Account settings") {
      router.push("/(tabs2)/accountSettings");
      return;
    }
    if (item.title === "Deposit") {
      router.push("/(tabs2)/deposit");
      return;
    }
    if (item.title === "Trade") {
      router.push("/(tabs2)/orderScreen");
      return;
    }
    if (item.title === "Withdrawal") {
      router.push("/(tabs2)/withdrawal");
      return;
    }
    if (item.title === "Internal transfer") {
      router.push("/(tabs2)/internalTransfer");
      return;
    }
  };

  const infoItems = [
    {
      label: "Account Type",
      value:
        selectedAccount?.accountTypeName ||
        selectedAccount?.type ||
        selectedAccount?.accountType ||
        "N/A",
    },
    { label: "Leverage", value: selectedAccount?.leverage || "N/A" },
    { label: "Currency", value: selectedAccount?.currency || "N/A" },
  ];

  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!userId) return;
      try {
        const data = await getUserDetails(userId);
        // persist user details in zustand user store
        console.log("Fetched user details:", data);
        setUserData(data);
      } catch (error) {
        console.error("Error fetching user details:", error);
      }
    };

    fetchUserDetails();
  }, [userId, setUserData]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <StatusBar backgroundColor={theme.primary} barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <AppIcon name="arrow-back" color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account</Text>
      </View>

      <ScrollView
        style={[styles.scrollView, { backgroundColor: theme.background }]}
      >
        {/* Account Card */}
        <View style={[styles.accountCard, { backgroundColor: theme.card }]}>
          <View style={styles.accountCardHeader}>
            <View style={styles.accountCardHeaderLeft}>
              <View
                style={[
                  styles.accountTypeBadge,
                  { backgroundColor: theme.primary },
                ]}
              >
                <Text style={styles.accountTypeText}>{accountData.type}</Text>
              </View>
            </View>
          </View>

          <View style={styles.accountBalance}>
            <Text style={[styles.accountId, { color: theme.text }]}>
              {accountData.id}
            </Text>
            <Text style={[styles.balanceAmount, { color: theme.text }]}>
              {accountData.balance}
            </Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {["ACTIONS", "INFO"].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tab,
                {
                  borderBottomWidth: 2,
                  borderBottomColor:
                    activeTab === tab ? theme.primary : "transparent",
                },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: activeTab === tab ? theme.primary : theme.secondary,
                  },
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {activeTab === "ACTIONS" && (
            <View>
              {actionItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => handleActionPress(item)}
                  style={[
                    styles.actionItem,
                    { borderBottomColor: theme.border },
                  ]}
                >
                  <View
                    style={[
                      styles.actionIconContainer,
                      { backgroundColor: theme.card },
                    ]}
                  >
                    <AppIcon name={item.icon} color={theme.text} size={20} />
                  </View>
                  <Text style={[styles.actionTitle, { color: theme.text }]}>
                    {item.title}
                  </Text>
                  <AppIcon
                    name="chevron-right"
                    color={theme.secondary}
                    size={20}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {activeTab === "INFO" && (
            <View>
              {infoItems.map((item, index) => (
                <View
                  key={index}
                  style={[styles.infoItem, { borderBottomColor: theme.border }]}
                >
                  <Text style={[styles.infoLabel, { color: theme.secondary }]}>
                    {item.label}
                  </Text>
                  <Text style={[styles.infoValue, { color: theme.text }]}>
                    {item.value}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  accountCard: {
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  accountCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  accountCardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  accountIcon: {
    width: 32,
    height: 32,
    borderRadius: 4,
    marginRight: 12,
  },
  accountIconInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  accountIconText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  accountTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  accountTypeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },
  accountBalance: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  accountId: {
    fontSize: 18,
    fontWeight: "500",
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: "bold",
  },
  tabsContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
  },
  tabText: {
    textAlign: "center",
    fontWeight: "500",
  },
  content: {
    paddingHorizontal: 16,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  actionTitle: {
    flex: 1,
    fontSize: 16,
  },
  infoItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  infoLabel: {
    fontSize: 16,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "500",
  },
});
