import { router } from "expo-router";
import { useEffect, useState, useRef } from "react";
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
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function RealAccountsScreen() {
  const { theme } = useAppTheme();
  const [activeTab, setActiveTab] = useState("ACTIONS");
  const balanceScale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const statsAnimations = useRef(
    Array(4).fill(0).map(() => new Animated.Value(0))
  ).current;

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
    { id: 1, icon: "account-balance", title: "Deposit", color: "#00D9A3", gradient: ["#00D9A3", "#00B87C"] },
    { id: 2, icon: "trending-up", title: "Trade", color: "#4C6EF5", gradient: ["#4C6EF5", "#3B5BDB"] },
    { id: 3, icon: "account-balance-wallet", title: "Withdrawal", color: "#FF6B9D", gradient: ["#FF6B9D", "#F06595"] },
    { id: 4, icon: "swap-horiz", title: "Internal Transfer", color: "#FAB005", gradient: ["#FAB005", "#F59F00"] },
    { id: 5, icon: "history", title: "History", color: "#7950F2", gradient: ["#7950F2", "#6741D9"] },
    { id: 6, icon: "settings", title: "Settings", color: "#868E96", gradient: ["#868E96", "#495057"] },
    { id: 7, icon: "receipt", title: "Statements", color: "#FF8787", gradient: ["#FF8787", "#FA5252"] },
    { id: 8, icon: "support-agent", title: "Support", color: "#20C997", gradient: ["#20C997", "#12B886"] },
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
      value: "2024-01-15",
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
    { label: "Total Trades", value: "47", change: "+12%", icon: "bar-chart", color: "#4C6EF5" },
    { label: "Win Rate", value: "78%", change: "+5%", icon: "trending-up", color: "#00D9A3" },
    { label: "Avg. Profit", value: "$128", change: "+8%", icon: "attach-money", color: "#FAB005" },
    { label: "Active Trades", value: "8", change: "-2", icon: "show-chart", color: "#FF6B9D" },
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
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Stagger stats animations
    Animated.stagger(
      150,
      statsAnimations.map((anim) =>
        Animated.spring(anim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        })
      )
    ).start();
  }, [userId, setUserData]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <StatusBar backgroundColor={theme.primary} barStyle="light-content" />

      {/* Enhanced Gradient Header */}
      <LinearGradient
        colors={[theme.primary, `${theme.primary}dd`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
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
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.headerTitle}>Account Dashboard</Text>
            <Text style={styles.headerSubtitle}>Manage your trading account</Text>
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
      >
        {/* Clean Modern Account Card */}
        <Animated.View 
          style={[
            styles.accountCardWrapper,
            {
              opacity: fadeAnim,
              transform: [
                { scale: balanceScale },
                { translateY: slideAnim }
              ],
            }
          ]}
        >
          <View style={[styles.accountCard, { backgroundColor: theme.card }]}>
            {/* Header Section */}
            <View style={styles.accountCardHeader}>
              <View style={styles.accountInfoRow}>
                <View style={[styles.accountIconBadge, { backgroundColor: `${theme.primary}15` }]}>
                  <AppIcon name="account-balance-wallet" color={theme.primary} size={22} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.accountType, { color: theme.text }]}>{accountData.type}</Text>
                  <View style={styles.accountIdRow}>
                    <Text style={[styles.accountId, { color: theme.secondary }]}>#{accountData.id}</Text>
                    <TouchableOpacity style={styles.copyButton}>
                      <AppIcon name="content-copy" color={theme.secondary} size={14} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: '#00E67615' }]}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Active</Text>
              </View>
            </View>

            {/* Balance Section */}
            <View style={styles.balanceSection}>
              <Text style={[styles.balanceLabel, { color: theme.secondary }]}>Total Balance</Text>
              <Text style={[styles.balanceAmount, { color: theme.text }]}>
                {accountData.currency} {accountData.balance.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </Text>
              <View style={styles.profitRow}>
                <View style={styles.profitBadge}>
                  <AppIcon name="trending-up" color="#00E676" size={14} />
                  <Text style={styles.profitText}>+$2,450.00</Text>
                  <Text style={styles.profitPercent}>(+12.5%)</Text>
                </View>
              </View>
            </View>

            {/* Quick Info Grid */}
            <View style={[styles.quickInfoGrid, { borderTopColor: theme.border }]}>
              <View style={styles.quickInfoItem}>
                <Text style={[styles.quickInfoLabel, { color: theme.secondary }]}>Equity</Text>
                <Text style={[styles.quickInfoValue, { color: theme.text }]}>
                  {accountData.currency} {(accountData.balance * 1.12).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </Text>
              </View>
              <View style={[styles.quickInfoDivider, { backgroundColor: theme.border }]} />
              <View style={styles.quickInfoItem}>
                <Text style={[styles.quickInfoLabel, { color: theme.secondary }]}>Free Margin</Text>
                <Text style={[styles.quickInfoValue, { color: theme.text }]}>
                  {accountData.currency} {(accountData.balance * 0.85).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </Text>
              </View>
              <View style={[styles.quickInfoDivider, { backgroundColor: theme.border }]} />
              <View style={styles.quickInfoItem}>
                <Text style={[styles.quickInfoLabel, { color: theme.secondary }]}>Leverage</Text>
                <Text style={[styles.quickInfoValue, { color: theme.text }]}>
                  {accountData.leverage}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Enhanced Quick Stats */}
        <View style={styles.statsSection}>
          <View style={styles.statsSectionHeader}>
            <Text style={[styles.statsTitle, { color: theme.text }]}>Performance Overview</Text>
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={[styles.viewAllText, { color: theme.primary }]}>View All</Text>
              <AppIcon name="arrow-forward" color={theme.primary} size={14} />
            </TouchableOpacity>
          </View>
          <View style={styles.statsGrid}>
            {statsItems.map((stat, index) => (
              <Animated.View
                key={index}
                style={[
                  {
                    opacity: statsAnimations[index],
                    transform: [{
                      translateY: statsAnimations[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [30, 0],
                      }),
                    }],
                  }
                ]}
              >
                <LinearGradient
                  colors={[theme.card, theme.card]}
                  style={[styles.statCard, { borderColor: theme.border }]}
                >
                  <View style={[styles.statIconContainer, { backgroundColor: `${stat.color}15` }]}>
                    <AppIcon name={stat.icon} color={stat.color} size={20} />
                  </View>
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
                        ? '#00E67620' 
                        : '#FF638420' 
                    }
                  ]}>
                    <AppIcon 
                      name={stat.change.startsWith('+') ? "arrow-upward" : "arrow-downward"} 
                      color={stat.change.startsWith('+') ? '#00E676' : '#FF6384'} 
                      size={10} 
                    />
                    <Text style={[
                      styles.statChangeText, 
                      { 
                        color: stat.change.startsWith('+') ? '#00E676' : '#FF6384'
                      }
                    ]}>
                      {stat.change}
                    </Text>
                  </View>
                </LinearGradient>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* Modern Tabs with Slider */}
        <View style={[styles.tabsContainer, { backgroundColor: theme.card }]}>
          <View style={styles.tabsInner}>
            {["ACTIONS", "DETAILS"].map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={styles.tab}
              >
                {activeTab === tab && (
                  <LinearGradient
                    colors={[theme.primary, `${theme.primary}cc`]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.activeTabBackground}
                  />
                )}
                <Text
                  style={[
                    styles.tabText,
                    {
                      color: activeTab === tab ? "#fff" : theme.secondary,
                      fontWeight: activeTab === tab ? "700" : "600",
                    },
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {activeTab === "ACTIONS" ? (
            <View style={styles.actionsGrid}>
              {actionItems.map((item, index) => (
                <Animated.View
                  key={item.id}
                  style={[
                    {
                      opacity: fadeAnim,
                      transform: [{
                        scale: fadeAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1],
                        }),
                      }],
                    }
                  ]}
                >
                  <TouchableOpacity
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
                        <AppIcon name={item.icon} color="#fff" size={26} />
                      </View>
                      <Text style={styles.actionTitle}>
                        {item.title}
                      </Text>
                      <View style={styles.actionArrow}>
                        <AppIcon name="arrow-forward" color="rgba(255,255,255,0.7)" size={14} />
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
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
                        paddingBottom: 18,
                        marginBottom: 18,
                      }
                    ]}
                  >
                    <View style={styles.detailLeft}>
                      <LinearGradient
                        colors={[`${item.color}25`, `${item.color}15`]}
                        style={styles.detailIcon}
                      >
                        <AppIcon name={item.icon} color={item.color} size={20} />
                      </LinearGradient>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.detailLabel, { color: theme.text }]}>
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

              {/* Enhanced Account Actions */}
              <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 24 }]}>
                Quick Actions
              </Text>
              <View style={styles.accountActions}>
                <TouchableOpacity style={styles.actionButtonContainer}>
                  <LinearGradient
                    colors={['#00D9A3', '#00B87C']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.actionButtonGradient}
                  >
                    <AppIcon name="add-circle" color="#fff" size={20} />
                    <Text style={styles.actionButtonText}>Fund Account</Text>
                  </LinearGradient>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.actionButtonContainer}>
                  <LinearGradient
                    colors={['#4C6EF5', '#3B5BDB']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.actionButtonGradient}
                  >
                    <AppIcon name="download" color="#fff" size={20} />
                    <Text style={styles.actionButtonText}>Export Statement</Text>
                  </LinearGradient>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.actionButtonContainer}>
                  <View style={[styles.actionButtonOutline, { borderColor: theme.border }]}>
                    <AppIcon name="lock-outline" color={theme.negative} size={20} />
                    <Text style={[styles.actionButtonTextOutline, { color: theme.negative }]}>
                      Close Account
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Enhanced Security Notice */}
        <View style={[styles.securityNotice, { backgroundColor: theme.card }]}>
          <LinearGradient
            colors={[`${theme.primary}15`, `${theme.primary}08`]}
            style={styles.securityGradient}
          >
            <View style={[styles.securityIcon, { backgroundColor: `${theme.primary}25` }]}>
              <AppIcon name="verified-user" color={theme.primary} size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.securityTitle, { color: theme.text }]}>
                Bank-Level Security
              </Text>
              <Text style={[styles.securityText, { color: theme.secondary }]}>
                256-bit encryption • 2FA enabled • Insured funds
              </Text>
            </View>
            <AppIcon name="shield-checkmark" color={theme.positive} size={24} />
          </LinearGradient>
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  backButton: {
    borderRadius: 20,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: 'rgba(255,255,255,0.2)',
    position: 'relative',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
    fontWeight: "500",
  },
  headerButton: {
    borderRadius: 20,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FF3B30',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  notificationText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  accountCardWrapper: {
    marginHorizontal: 20,
    marginTop: -30,
    marginBottom: 24,
  },
  accountCard: {
    padding: 24,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  accountCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  accountInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  accountIconBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  accountType: {
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  accountIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accountId: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  copyButton: {
    padding: 4,
    borderRadius: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00E676',
  },
  statusText: {
    color: '#00E676',
    fontSize: 12,
    fontWeight: '700',
  },
  balanceSection: {
    marginBottom: 24,
  },
  balanceLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 40,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  profitRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#00E67615',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  profitText: {
    color: '#00E676',
    fontSize: 14,
    fontWeight: '700',
  },
  profitPercent: {
    color: '#00E676',
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.8,
  },
  quickInfoGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 20,
  },
  quickInfoItem: {
    flex: 1,
    alignItems: 'center',
  },
  quickInfoLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  quickInfoValue: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  quickInfoDivider: {
    width: 1,
    height: 32,
  },
  statsSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  statsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    width: (SCREEN_WIDTH - 52) / 2,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 10,
  },
  statChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statChangeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  tabsContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  tabsInner: {
    flexDirection: "row",
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    position: "relative",
    borderRadius: 14,
  },
  activeTabBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 14,
  },
  tabText: {
    fontSize: 14,
    letterSpacing: 0.5,
    zIndex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  actionCard: {
    width: (SCREEN_WIDTH - 54) / 2,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  actionGradient: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 140,
  },
  actionIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    color: '#fff',
    letterSpacing: 0.3,
  },
  actionArrow: {
    marginTop: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsContainer: {
    gap: 16,
  },
  detailsCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  detailLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  detailIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  detailLabel: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 3,
    letterSpacing: 0.2,
  },
  detailDescription: {
    fontSize: 12,
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  accountActions: {
    gap: 12,
  },
  actionButtonContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  actionButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: '#fff',
    letterSpacing: 0.3,
  },
  actionButtonOutline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 2,
    borderRadius: 16,
  },
  actionButtonTextOutline: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  securityNotice: {
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  securityGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 18,
  },
  securityIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 3,
    letterSpacing: 0.2,
  },
  securityText: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
  },
});