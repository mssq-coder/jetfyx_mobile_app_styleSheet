import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getUserDetails } from "../../api/getServices";
import AppIcon from "../../components/AppIcon";
import { useAppTheme } from "../../contexts/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import { useUserStore } from "../../store/userStore";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function RealAccountsScreen() {
  const { theme } = useAppTheme();
  const [activeTab, setActiveTab] = useState("ACTIONS");
  const [balanceScale] = useState(new Animated.Value(1));

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
    balance: selectedAccount?.balance ? parseFloat(selectedAccount.balance) : 0,
    type:
      selectedAccount?.accountTypeName ||
      selectedAccount?.type ||
      selectedAccount?.accountType ||
      "N/A",
    currency: selectedAccount?.currency || "USD",
    leverage: selectedAccount?.leverage || "1:100",
  };

  const actionItems = [
    { id: 1, icon: "account-balance", title: "Deposit", color: theme.positive },
    { id: 2, icon: "trending-up", title: "Trade", color: theme.primary },
    { id: 3, icon: "account-balance-wallet", title: "Withdrawal", color: theme.secondary },
    { id: 4, icon: "swap-horiz", title: "Internal Transfer", color: theme.positive },
    { id: 5, icon: "history", title: "History", color: theme.headerBlue },
    { id: 6, icon: "settings", title: "Settings", color: theme.secondary },
    { id: 7, icon: "receipt", title: "Statements", color: theme.primary },
    { id: 8, icon: "support-agent", title: "Support", color: theme.positive },
  ];

  const handleActionPress = (item) => {
    // Pulse animation on button press
    Animated.sequence([
      Animated.timing(balanceScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(balanceScale, {
        toValue: 1,
        tension: 150,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();

    switch (item.title) {
      case "Deposit":
        router.push("/(tabs2)/deposit");
        break;
      case "Trade":
        router.push("/(tabs2)/orderScreen");
        break;
      case "Withdrawal":
        router.push("/(tabs2)/withdrawal");
        break;
      case "Internal Transfer":
        router.push("/(tabs2)/internalTransfer");
        break;
      case "Settings":
        router.push("/(tabs2)/accountSettings");
        break;
      case "History":
        router.push("/history");
        break;
      case "Statements":
        router.push("/(tabs2)/statements");
        break;
      case "Support":
        router.push("/(tabs2)/support");
        break;
      default:
        break;
    }
  };

  const infoItems = [
    {
      icon: "account-balance",
      label: "Account Type",
      value: accountData.type,
      description: "Trading account type",
    },
    {
      icon: "speed",
      label: "Leverage",
      value: accountData.leverage,
      description: "Current leverage ratio",
    },
    {
      icon: "payments",
      label: "Currency",
      value: accountData.currency,
      description: "Base account currency",
    },
    {
      icon: "verified-user",
      label: "Status",
      value: "Active",
      description: "Account status",
    },
    {
      icon: "calendar-today",
      label: "Created",
      value: "2024-01-15",
      description: "Account creation date",
    },
    {
      icon: "credit-card",
      label: "Account Number",
      value: accountData.id,
      description: "Your unique account ID",
    },
  ];

  const statsItems = [
    { label: "Total Trades", value: "47", change: "+12%" },
    { label: "Win Rate", value: "78%", change: "+5%" },
    { label: "Avg. Profit", value: "$128", change: "+8%" },
    { label: "Active Trades", value: "8", change: "-2" },
  ];

  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!userId) return;
      try {
        const data = await getUserDetails(userId);
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

      {/* Enhanced Header */}
      <View style={[styles.header, { 
        backgroundColor: theme.primary,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
      }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { 
            backgroundColor: 'rgba(255,255,255,0.2)',
          }]}
        >
          <AppIcon name="arrow-back" color="#fff" size={22} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Account Dashboard</Text>
          <Text style={styles.headerSubtitle}>Manage your trading account</Text>
        </View>
        <TouchableOpacity style={[styles.headerButton, { 
          backgroundColor: 'rgba(255,255,255,0.2)',
        }]}>
          <AppIcon name="more-vert" color="#fff" size={22} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={[styles.scrollView, { backgroundColor: theme.background }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Enhanced Account Card */}
        <Animated.View 
          style={[
            styles.accountCard, 
            { 
              backgroundColor: theme.primary,
              transform: [{ scale: balanceScale }],
            }
          ]}
        >
          <View style={styles.accountCardHeader}>
            <View style={styles.accountCardHeaderLeft}>
              <View style={[styles.accountBadge, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                <AppIcon name="verified" color="#fff" size={14} />
                <Text style={styles.accountBadgeText}>Active</Text>
              </View>
              <Text style={styles.accountType}>{accountData.type}</Text>
            </View>
            <TouchableOpacity style={styles.accountMenu}>
              <AppIcon name="more-vert" color="#fff" size={20} />
            </TouchableOpacity>
          </View>

          <View style={styles.accountContent}>
            <View>
              <Text style={styles.accountIdLabel}>Account Number</Text>
              <Text style={styles.accountId}>{accountData.id}</Text>
            </View>
            <View style={styles.balanceContainer}>
              <Text style={styles.balanceLabel}>Current Balance</Text>
              <Text style={styles.balanceAmount}>
                {accountData.currency} {accountData.balance.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </Text>
              <View style={styles.balanceChange}>
                <AppIcon name="trending-up" color="#00E676" size={14} />
                <Text style={styles.balanceChangeText}>+$2,450 (12.5%)</Text>
              </View>
            </View>
          </View>

          <View style={styles.accountFooter}>
            <View style={styles.footerItem}>
              <Text style={styles.footerLabel}>Equity</Text>
              <Text style={styles.footerValue}>
                {accountData.currency} {(accountData.balance * 1.12).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </Text>
            </View>
            <View style={styles.footerDivider} />
            <View style={styles.footerItem}>
              <Text style={styles.footerLabel}>Free Margin</Text>
              <Text style={styles.footerValue}>
                {accountData.currency} {(accountData.balance * 0.85).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Quick Stats */}
        <View style={styles.statsSection}>
          <Text style={[styles.statsTitle, { color: theme.text }]}>Quick Stats</Text>
          <View style={styles.statsGrid}>
            {statsItems.map((stat, index) => (
              <View 
                key={index} 
                style={[
                  styles.statCard, 
                  { 
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  }
                ]}
              >
                <Text style={[styles.statValue, { color: theme.text }]}>
                  {stat.value}
                </Text>
                <Text style={[styles.statLabel, { color: theme.secondary }]}>
                  {stat.label}
                </Text>
                <View style={[
                  styles.statChange, 
                  { 
                    backgroundColor: stat.change.startsWith('+') 
                      ? `${theme.positive}20` 
                      : `${theme.negative}20` 
                  }
                ]}>
                  <Text style={[
                    styles.statChangeText, 
                    { 
                      color: stat.change.startsWith('+') 
                        ? theme.positive 
                        : theme.negative 
                    }
                  ]}>
                    {stat.change}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Enhanced Tabs */}
        <View style={[styles.tabsContainer, { backgroundColor: theme.card }]}>
          {["ACTIONS", "DETAILS"].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tab,
                activeTab === tab && styles.activeTab,
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: activeTab === tab ? theme.primary : theme.secondary,
                    fontWeight: activeTab === tab ? "700" : "600",
                  },
                ]}
              >
                {tab}
              </Text>
              {activeTab === tab && (
                <View style={[styles.tabIndicator, { backgroundColor: theme.primary }]} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {activeTab === "ACTIONS" ? (
            <View style={styles.actionsGrid}>
              {actionItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => handleActionPress(item)}
                  style={styles.actionCard}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.actionIconContainer,
                    { backgroundColor: `${item.color}20` }
                  ]}>
                    <AppIcon name={item.icon} color={item.color} size={24} />
                  </View>
                  <Text style={[styles.actionTitle, { color: theme.text }]}>
                    {item.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.detailsContainer}>
              <View style={[styles.detailsCard, { backgroundColor: theme.card }]}>
                {infoItems.map((item, index) => (
                  <View
                    key={index}
                    style={[
                      styles.detailItem,
                      index < infoItems.length - 1 && { 
                        borderBottomWidth: 1, 
                        borderBottomColor: theme.border,
                        paddingBottom: 16,
                        marginBottom: 16,
                      }
                    ]}
                  >
                    <View style={styles.detailLeft}>
                      <View style={[
                        styles.detailIcon, 
                        { backgroundColor: `${theme.primary}15` }
                      ]}>
                        <AppIcon name={item.icon} color={theme.primary} size={18} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.detailLabel, { color: theme.secondary }]}>
                          {item.label}
                        </Text>
                        <Text style={[styles.detailDescription, { color: theme.secondary }]}>
                          {item.description}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.detailValue, { color: theme.text }]}>
                      {item.value}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Account Actions */}
              <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 24 }]}>
                Account Actions
              </Text>
              <View style={styles.accountActions}>
                <TouchableOpacity style={[styles.actionButton, { backgroundColor: `${theme.positive}15` }]}>
                  <AppIcon name="add" color={theme.positive} size={18} />
                  <Text style={[styles.actionButtonText, { color: theme.positive }]}>
                    Fund Account
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, { backgroundColor: `${theme.secondary}15` }]}>
                  <AppIcon name="download" color={theme.secondary} size={18} />
                  <Text style={[styles.actionButtonText, { color: theme.secondary }]}>
                    Export Statement
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, { backgroundColor: `${theme.negative}15` }]}>
                  <AppIcon name="lock" color={theme.negative} size={18} />
                  <Text style={[styles.actionButtonText, { color: theme.negative }]}>
                    Close Account
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Security Notice */}
        <View style={[styles.securityNotice, { backgroundColor: `${theme.primary}10` }]}>
          <AppIcon name="security" color={theme.primary} size={18} />
          <Text style={[styles.securityText, { color: theme.text }]}>
            Your account is secured with 256-bit encryption & 2FA
          </Text>
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  accountCard: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  accountCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  accountCardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  accountBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  accountBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  accountType: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    opacity: 0.9,
  },
  accountMenu: {
    padding: 4,
  },
  accountContent: {
    gap: 16,
  },
  accountIdLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  accountId: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  balanceContainer: {
    gap: 4,
  },
  balanceLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: "600",
  },
  balanceAmount: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  balanceChange: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  balanceChangeText: {
    color: "#00E676",
    fontSize: 12,
    fontWeight: "600",
  },
  accountFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
  },
  footerItem: {
    flex: 1,
  },
  footerDivider: {
    width: 1,
    height: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginHorizontal: 12,
  },
  footerLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
  },
  footerValue: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  statsSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    width: (SCREEN_WIDTH - 52) / 2,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  statChange: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statChangeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  tabsContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 14,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    position: "relative",
  },
  activeTab: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
  },
  tabText: {
    fontSize: 14,
    letterSpacing: 0.5,
  },
  tabIndicator: {
    position: "absolute",
    bottom: -2,
    width: 30,
    height: 3,
    borderRadius: 1.5,
  },
  content: {
    paddingHorizontal: 20,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  actionCard: {
    width: (SCREEN_WIDTH - 52) / 2,
    padding: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.02)',
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  detailsContainer: {
    gap: 16,
  },
  detailsCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  detailLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  detailLabel: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  detailDescription: {
    fontSize: 11,
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
  },
  accountActions: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    flex: 1,
    minWidth: (SCREEN_WIDTH - 56) / 3,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  securityNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  securityText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
});