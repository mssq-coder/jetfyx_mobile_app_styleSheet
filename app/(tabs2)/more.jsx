import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    RefreshControl,
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
import usePullToRefresh from "../../hooks/usePullToRefresh";
import { useAuthStore } from "../../store/authStore";
import { useUserStore } from "../../store/userStore";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 40;
const ACTION_CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

export default function RealAccountsScreen() {
  const { theme } = useAppTheme();
  const { refreshing, runRefresh } = usePullToRefresh();
  const [activeTab, setActiveTab] = useState("ACTIONS");
  const balanceScale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const { accounts, selectedAccountId, userId } = useAuthStore();
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const selectedAccount =
    accounts.find((acc) => (acc.accountId || acc.id) === selectedAccountId) ||
    accounts[0];

  const setUserData = useUserStore((s) => s.setUserData);
  const userData = useUserStore((s) => s.userData);

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
  //console.log("Selected Account Data:", accountData);

  const normalizeApiPayload = (payload) => {
    // Support multiple shapes: {data:{...}}, {...}, {data:{data:{...}}}
    const p = payload?.data ?? payload;
    return p?.data ?? p;
  };

  const formatYyyyMmDd = (value) => {
    if (!value) return "—";
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return value.slice(0, 10);
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const userRoot = normalizeApiPayload(userData);
  const findAccountById = (list) => {
    if (!Array.isArray(list) || selectedAccountId == null) return null;
    return (
      list.find((a) => (a?.accountId ?? a?.id) === selectedAccountId) || null
    );
  };
  const accountFromUserPayload = findAccountById(userRoot?.accounts);
  const createdAtRaw = userRoot?.createdAt || null;
  const createdAtLabel = formatYyyyMmDd(createdAtRaw);

  const actionItems = [
    {
      id: 1,
      icon: "account-balance",
      title: "Deposit",
      color: "#00D9A3",
      gradient: ["#00D9A3", "#00B87C"],
    },
    {
      id: 2,
      icon: "trending-up",
      title: "Trade",
      color: "#4C6EF5",
      gradient: ["#4C6EF5", "#3B5BDB"],
    },
    {
      id: 3,
      icon: "account-balance-wallet",
      title: "Withdrawal",
      color: "#FF6B9D",
      gradient: ["#FF6B9D", "#F06595"],
    },
    {
      id: 4,
      icon: "swap-horiz",
      title: "Internal Transfer",
      color: "#FAB005",
      gradient: ["#FAB005", "#F59F00"],
    },
    {
      id: 5,
      icon: "history",
      title: "History",
      color: "#7950F2",
      gradient: ["#7950F2", "#6741D9"],
    },
    {
      id: 6,
      icon: "settings",
      title: "Settings",
      color: "#868E96",
      gradient: ["#868E96", "#495057"],
    },
    {
      id: 7,
      icon: "receipt",
      title: "Statements",
      color: "#FF8787",
      gradient: ["#FF8787", "#FA5252"],
    },
    {
      id: 8,
      icon: "support-agent",
      title: "Support",
      color: "#20C997",
      gradient: ["#20C997", "#12B886"],
    },
  ];

  const handleActionPress = (item) => {
    Animated.sequence([
      Animated.timing(balanceScale, {
        toValue: 0.97,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(balanceScale, {
        toValue: 1,
        tension: 200,
        friction: 4,
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
        router.push("/(tabs2)/supportTickets");
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
      color: "#4C6EF5",
    },
    {
      icon: "speed",
      label: "Leverage",
      value: accountData.leverage,
      description: "Current leverage ratio",
      color: "#FF6B9D",
    },
    {
      icon: "payments",
      label: "Currency",
      value: accountData.currency,
      description: "Base account currency",
      color: "#00D9A3",
    },
    {
      icon: "verified-user",
      label: "Status",
      value: "Active",
      description: "Account status",
      color: "#20C997",
    },
    {
      icon: "calendar-today",
      label: "Created",
      value: createdAtLabel,
      description: "Account creation date",
      color: "#7950F2",
    },
    {
      icon: "credit-card",
      label: "Account Number",
      value: accountData.id,
      description: "Your unique account ID",
      color: "#FAB005",
    },
  ];

  const statsItems = [
    {
      label: "Total Trades",
      value: "47",
      change: "+12%",
      icon: "bar-chart",
      color: "#4C6EF5",
    },
    {
      label: "Win Rate",
      value: "78%",
      change: "+5%",
      icon: "trending-up",
      color: "#00D9A3",
    },
    {
      label: "Avg. Profit",
      value: "$128",
      change: "+8%",
      icon: "attach-money",
      color: "#FAB005",
    },
    {
      label: "Active Trades",
      value: "8",
      change: "-2",
      icon: "show-chart",
      color: "#FF6B9D",
    },
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

    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [userId, setUserData]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <StatusBar backgroundColor={theme.primary} barStyle="light-content" />

      {/* Compact Header */}
      <LinearGradient
        colors={[theme.primary, `${theme.primary}dd`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <View style={styles.headerIconButton}>
              <AppIcon name="arrow-back" color="#fff" size={22} />
            </View>
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={styles.headerTitle}>Account Overview</Text>
          </View>
          <TouchableOpacity style={styles.headerButton}>
            <View style={styles.headerIconButton}>
              <AppIcon name="notifications-none" color="#fff" size={22} />
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationText}>3</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={[styles.scrollView, { backgroundColor: theme.background }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() =>
              runRefresh(() => (userId ? refreshProfile() : Promise.resolve()))
            }
            tintColor={theme.primary}
          />
        }
      >
        {/* Tab Navigation */}
        <View style={[styles.tabsContainer, { backgroundColor: theme.card }]}>
          {["ACTIONS", "DETAILS"].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tabButton,
                activeTab === tab && styles.activeTabButton,
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: activeTab === tab ? theme.primary : theme.secondary,
                    fontWeight: activeTab === tab ? "700" : "500",
                  },
                ]}
              >
                {tab}
              </Text>
              {activeTab === tab && (
                <View
                  style={[
                    styles.tabIndicator,
                    { backgroundColor: theme.primary },
                  ]}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Content Area */}
        {activeTab === "ACTIONS" ? (
          <View style={styles.actionsSection}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Quick Actions
            </Text>
            <ScrollView
              horizontal
              contentContainerStyle={styles.actionsGrid}
              showsHorizontalScrollIndicator={false}
            >
              {actionItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => handleActionPress(item)}
                  style={styles.actionCard}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={item.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.actionGradient}
                  >
                    <View style={styles.actionIconContainer}>
                      <AppIcon name={item.icon} color="#fff" size={22} />
                    </View>
                    <Text style={styles.actionTitle}>{item.title}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : (
          <View style={styles.detailsSection}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Account Details
            </Text>
            <View style={[styles.detailsCard, { backgroundColor: theme.card }]}>
              {infoItems.map((item, index) => (
                <View
                  key={index}
                  style={[
                    styles.detailRow,
                    index < infoItems.length - 1 && [
                      styles.detailRowBorder,
                      { borderBottomColor: theme.border },
                    ],
                  ]}
                >
                  <View style={styles.detailLeft}>
                    <View
                      style={[
                        styles.detailIconContainer,
                        { backgroundColor: `${item.color}15` },
                      ]}
                    >
                      <AppIcon name={item.icon} color={item.color} size={18} />
                    </View>
                    <View style={styles.detailInfo}>
                      <Text style={[styles.detailLabel, { color: theme.text }]}>
                        {item.label}
                      </Text>
                      <Text
                        style={[
                          styles.detailDescription,
                          { color: theme.secondary },
                        ]}
                      >
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

            {/* Account Management */}
            <Text
              style={[
                styles.sectionTitle,
                { color: theme.text, marginTop: 20 },
              ]}
            >
              Account Management
            </Text>
            <View style={styles.accountActions}>
              <TouchableOpacity style={styles.actionButton}>
                <LinearGradient
                  colors={["#00D9A3", "#00B87C"]}
                  style={styles.actionButtonGradient}
                >
                  <AppIcon name="add" color="#fff" size={18} />
                  <Text style={styles.actionButtonText}>Add Funds</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton}>
                <LinearGradient
                  colors={["#4C6EF5", "#3B5BDB"]}
                  style={styles.actionButtonGradient}
                >
                  <AppIcon name="download" color="#fff" size={18} />
                  <Text style={styles.actionButtonText}>Statement</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Performance Stats Grid */}
        {/* <View style={styles.statsSection}>
          <View style={styles.statsSectionHeader}>
            <Text style={[styles.statsTitle, { color: theme.text }]}>
              Performance
            </Text>
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={[styles.viewAllText, { color: theme.primary }]}>
                Details
              </Text>
              <AppIcon name="chevron-right" color={theme.primary} size={14} />
            </TouchableOpacity>
          </View>

          <View style={styles.statsGrid}>
            {statsItems.map((stat, index) => (
              <View key={index} style={styles.statCardWrapper}>
                <View
                  style={[
                    styles.statCard,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                >
                  <View
                    style={[
                      styles.statIconContainer,
                      { backgroundColor: `${stat.color}15` },
                    ]}
                  >
                    <AppIcon name={stat.icon} color={stat.color} size={18} />
                  </View>
                  <View style={styles.statContent}>
                    <Text
                      style={[styles.statLabel, { color: theme.secondary }]}
                    >
                      {stat.label}
                    </Text>
                    <Text style={[styles.statValue, { color: theme.text }]}>
                      {stat.value}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statChangeBadge,
                      {
                        backgroundColor: stat.change.startsWith("+")
                          ? "#00E67615"
                          : "#FF638415",
                      },
                    ]}
                  >
                    <AppIcon
                      name={
                        stat.change.startsWith("+")
                          ? "trending-up"
                          : "trending-down"
                      }
                      size={12}
                      color={
                        stat.change.startsWith("+") ? "#00E676" : "#FF6384"
                      }
                    />
                    <Text
                      style={[
                        styles.statChangeText,
                        {
                          color: stat.change.startsWith("+")
                            ? "#00E676"
                            : "#FF6384",
                        },
                      ]}
                    >
                      {stat.change}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View> */}

        {activeTab === "ACTIONS" ? (
          <Animated.View
            style={[
              styles.accountCardWrapper,
              {
                opacity: fadeAnim,
                transform: [{ scale: balanceScale }, { translateY: slideAnim }],
              },
            ]}
          >
            <LinearGradient
              colors={[theme.card, `${theme.card}ee`]}
              style={[styles.accountCard, { borderColor: theme.border }]}
            >
              {/* Account Info Row */}
              <View style={styles.accountCardHeader}>
                <View style={styles.accountTypeRow}>
                  <View
                    style={[
                      styles.accountIconBadge,
                      { backgroundColor: `${theme.primary}15` },
                    ]}
                  >
                    <AppIcon
                      name="account-balance-wallet"
                      color={theme.primary}
                      size={20}
                    />
                  </View>
                  <View style={styles.accountTypeInfo}>
                    <Text style={[styles.accountType, { color: theme.text }]}>
                      {accountData.type}
                    </Text>
                    <Text
                      style={[styles.accountId, { color: theme.secondary }]}
                    >
                      #{accountData.id}
                    </Text>
                  </View>
                </View>
                <View
                  style={[styles.statusBadge, { backgroundColor: "#00E67615" }]}
                >
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>Active</Text>
                </View>
              </View>

              {/* Balance Display */}
              <View style={styles.balanceSection}>
                <Text style={[styles.balanceLabel, { color: theme.secondary }]}>
                  Available Balance
                </Text>
                <Text style={[styles.balanceAmount, { color: theme.text }]}>
                  {accountData.currency}{" "}
                  {accountData.balance.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>

              {/* Quick Stats Row */}
              <View
                style={[styles.quickStatsRow, { borderTopColor: theme.border }]}
              >
                <View style={styles.quickStatItem}>
                  <Text
                    style={[styles.quickStatLabel, { color: theme.secondary }]}
                  >
                    Equity
                  </Text>
                  <Text style={[styles.quickStatValue, { color: theme.text }]}>
                    {accountData.currency}{" "}
                    {(accountData.balance * 1.12).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                </View>
                <View
                  style={[
                    styles.quickStatDivider,
                    { backgroundColor: theme.border },
                  ]}
                />
                <View style={styles.quickStatItem}>
                  <Text
                    style={[styles.quickStatLabel, { color: theme.secondary }]}
                  >
                    Margin
                  </Text>
                  <Text style={[styles.quickStatValue, { color: theme.text }]}>
                    {accountData.currency}{" "}
                    {(accountData.balance * 0.85).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                </View>
                <View
                  style={[
                    styles.quickStatDivider,
                    { backgroundColor: theme.border },
                  ]}
                />
                <View style={styles.quickStatItem}>
                  <Text
                    style={[styles.quickStatLabel, { color: theme.secondary }]}
                  >
                    Leverage
                  </Text>
                  <Text style={[styles.quickStatValue, { color: theme.text }]}>
                    {accountData.leverage}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        ) : null}

        {/* Footer Security Notice */}
        <View style={[styles.securityNotice, { backgroundColor: theme.card }]}>
          <View style={styles.securityContent}>
            <View
              style={[
                styles.securityIcon,
                { backgroundColor: `${theme.primary}15` },
              ]}
            >
              <AppIcon name="verified-user" color={theme.primary} size={18} />
            </View>
            <View style={styles.securityInfo}>
              <Text style={[styles.securityTitle, { color: theme.text }]}>
                Secure Account
              </Text>
              <Text style={[styles.securityText, { color: theme.secondary }]}>
                256-bit encryption • 2FA enabled
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: 8,
    paddingBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  backButton: {
    borderRadius: 12,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    position: "relative",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.3,
  },
  headerButton: {
    borderRadius: 12,
  },
  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#FF3B30",
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  notificationText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  accountCardWrapper: {
    marginHorizontal: 20,
    marginTop: -16,
    marginBottom: 16,
  },
  accountCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  accountCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  accountTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  accountIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  accountTypeInfo: {
    gap: 2,
  },
  accountType: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  accountId: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#00E676",
  },
  statusText: {
    color: "#00E676",
    fontSize: 11,
    fontWeight: "700",
  },
  balanceSection: {
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    opacity: 0.8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  quickStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
  },
  quickStatItem: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 4,
  },
  quickStatLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
    opacity: 0.8,
  },
  quickStatValue: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  quickStatDivider: {
    width: 1,
    height: 30,
    opacity: 0.5,
  },
  statsSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  statsSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCardWrapper: {
    width: (CARD_WIDTH - 10) / 2,
  },
  statCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  statContent: {
    gap: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    opacity: 0.8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  statChangeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statChangeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  tabsContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "transparent",
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    position: "relative",
  },
  activeTabButton: {
    backgroundColor: "transparent",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    left: "25%",
    right: "25%",
    height: 3,
    borderRadius: 1.5,
  },
  actionsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "nowrap",
    paddingHorizontal: 6,
    paddingVertical: 4,
    alignItems: "center",
  },
  actionCard: {
    width: ACTION_CARD_WIDTH,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginRight: 12,
  },
  actionGradient: {
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 100,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    color: "#fff",
    letterSpacing: 0.3,
  },
  detailsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  detailsCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  detailRowBorder: {
    borderBottomWidth: 1,
  },
  detailLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  detailIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  detailInfo: {
    gap: 2,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  detailDescription: {
    fontSize: 11,
    fontWeight: "500",
    opacity: 0.7,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  accountActions: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  actionButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.3,
  },
  securityNotice: {
    marginHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    overflow: "hidden",
  },
  securityContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  securityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  securityInfo: {
    flex: 1,
    gap: 2,
  },
  securityTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  securityText: {
    fontSize: 11,
    fontWeight: "500",
    opacity: 0.7,
  },
});
