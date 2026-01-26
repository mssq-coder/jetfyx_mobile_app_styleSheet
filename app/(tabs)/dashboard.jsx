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
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppIcon from "../../components/AppIcon";
import { useAppTheme } from "../../contexts/ThemeContext";
import { useAuthStore } from "../../store/authStore";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function Dashboard() {
  const { theme, themeName, setAppTheme } = useAppTheme();
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const userData = useAuthStore((state) => state.userData);
  const firstName = userData?.firstName || "Trader";
  const lastName = userData?.lastName || "";

  const dashboardThemes = ["light", "dark", "green", "purple"];

  const themeLabel = (name) => {
    switch (name) {
      case "light":
        return "Light";
      case "dark":
        return "Dark";
      case "green":
        return "Green";
      case "purple":
        return "Purple";  
      default:
        return String(name);
    }
  };

  const getThemeColor = (name) => {
    switch (name) {
      case "light":
        return "#FFFFFF";
      case "dark":
        return "#1A1A1A";
      case "green":
        return "#16A34A";
      case "purple":
        return "#8B5CF6";
      default:
        return "#4285F4";
    }
  };

  return (
    <SafeAreaView
      edges={["bottom", "left", "right"]}
      style={{ flex: 1, backgroundColor: theme.background }}
    >
      <StatusBar 
        backgroundColor={theme.primary} 
        barStyle={themeName === "dark" ? "light-content" : "dark-content"}
      />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Enhanced Header Section */}
        <View style={[styles.headerSection, { 
          backgroundColor: theme.primary,
          paddingBottom: 32,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 8,
        }]}>
          {/* User Greeting & Theme Picker */}
          <View style={styles.headerTopRow}>
            <View style={styles.userGreeting}>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.userName}>{firstName} {lastName}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setThemePickerOpen(true)}
              style={[styles.themeButton, { 
                backgroundColor: `${theme.card}40`,
                borderWidth: 1,
                borderColor: `${theme.card}80`,
              }]}
              accessibilityRole="button"
              accessibilityLabel="Change theme"
            >
              <View style={[styles.themeDot, { backgroundColor: getThemeColor(themeName) }]} />
              <Text style={styles.themeButtonText}>
                {themeLabel(themeName)}
              </Text>
              <AppIcon name="expand-more" color={theme.text} size={16} />
            </TouchableOpacity>
          </View>

          {/* Action Buttons Grid */}
          <View style={styles.actionGrid}>
            <TouchableOpacity
              onPress={() => router.push("/deposit")}
              style={styles.actionGridItem}
            >
              <View style={[styles.actionGridIcon, { backgroundColor: `${theme.positive}20` }]}>
                <AppIcon name="account-balance" color={theme.positive} size={24} />
              </View>
              <Text style={styles.actionGridLabel}>Deposit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/orderScreen")}
              style={styles.actionGridItem}
            >
              <View style={[styles.actionGridIcon, { backgroundColor: `${theme.primary}20` }]}>
                <AppIcon name="trending-up" color={theme.primary} size={24} />
              </View>
              <Text style={styles.actionGridLabel}>Trade</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/withdrawal")}
              style={styles.actionGridItem}
            >
              <View style={[styles.actionGridIcon, { backgroundColor: `${theme.secondary}20` }]}>
                <AppIcon name="account-balance-wallet" color={theme.secondary} size={24} />
              </View>
              <Text style={styles.actionGridLabel}>Withdraw</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/more")}
              style={styles.actionGridItem}
            >
              <View style={[styles.actionGridIcon, { backgroundColor: `${theme.headerBlue}20` }]}>
                <AppIcon name="menu" color={theme.headerBlue} size={24} />
              </View>
              <Text style={styles.actionGridLabel}>More</Text>
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
              style={[styles.modalCard, { 
                backgroundColor: theme.card,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 16,
                elevation: 10,
              }]}
              onPress={() => {}}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  Choose Theme
                </Text>
                <TouchableOpacity 
                  onPress={() => setThemePickerOpen(false)}
                  style={styles.modalCloseButton}
                >
                  <AppIcon name="close" color={theme.secondary} size={20} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalOptions}>
                {dashboardThemes.map((name) => {
                  const selected = themeName === name;
                  const themeColor = getThemeColor(name);
                  
                  return (
                    <TouchableOpacity
                      key={name}
                      style={[
                        styles.modalOption,
                        { 
                          backgroundColor: selected ? `${theme.primary}15` : theme.background,
                          borderWidth: selected ? 2 : 1,
                          borderColor: selected ? theme.primary : theme.border,
                        }
                      ]}
                      onPress={() => {
                        setAppTheme(name);
                        setThemePickerOpen(false);
                      }}
                    >
                      <View style={styles.optionLeft}>
                        <View style={[styles.optionColorPreview, { backgroundColor: themeColor }]} />
                        <View>
                          <Text style={[styles.optionText, { color: theme.text }]}>
                            {themeLabel(name)}
                          </Text>
                          <Text style={[styles.optionDescription, { color: theme.secondary }]}>
                            {name === "light" ? "Bright & Clean" : 
                             name === "dark" ? "Easy on Eyes" : 
                             name === "green" ? "Trading Focus" : "Modern & Vibrant"}
                          </Text>
                        </View>
                      </View>

                      {selected && (
                        <View style={[styles.selectedIndicator, { backgroundColor: theme.primary }]}>
                          <AppIcon name="check" color="#FFFFFF" size={14} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Payment Methods Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Quick Deposit
            </Text>
            <TouchableOpacity>
              <Text style={[styles.sectionLink, { color: theme.primary }]}>
                View All
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.paymentMethodsGrid}>
            <PaymentMethod 
              icon="account-balance" 
              label="Bank Transfer" 
              color="#00C851"
              description="Instant"
            />
            <PaymentMethod 
              icon="payment" 
              label="UPI" 
              color="#FF6B35"
              description="Fast"
            />
            <PaymentMethod 
              icon="credit-card" 
              label="Credit Card" 
              color="#4285F4"
              description="Secure"
            />
            <PaymentMethod 
              icon="account-balance-wallet" 
              label="E-Wallet" 
              color="#8B5CF6"
              description="Easy"
            />
          </View>
        </View>

        {/* Features Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Trading Features
            </Text>
            <TouchableOpacity>
              <Text style={[styles.sectionLink, { color: theme.primary }]}>
                Explore
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.featuresGrid}>
            <FeatureCard 
              icon="people" 
              title="Become IB" 
              description="Join our partner program"
              color={theme.primary}
              onPress={() => router.push("/ibProgram")}
            />
            <FeatureCard 
              icon="content-copy" 
              title="Copy Trading" 
              description="Follow expert traders"
              color={theme.positive}
              onPress={() => router.push("/copyTrading")}
            />
            <FeatureCard 
              icon="history" 
              title="Trade History" 
              description="View your activity"
              color={theme.secondary}
              onPress={() => router.push("/tradeHistory")}
            />
            <FeatureCard 
              icon="support-agent" 
              title="Support" 
              description="24/7 Customer help"
              color={theme.headerBlue}
              onPress={() => router.push("/support")}
            />
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Trading Stats
            </Text>
          </View>
          
          <View style={styles.statsContainer}>
            <StatCard 
              icon="trending-up" 
              label="Active Trades" 
              value="12"
              color={theme.positive}
            />
            <StatCard 
              icon="bar-chart" 
              label="Win Rate" 
              value="78%"
              color={theme.primary}
            />
            <StatCard 
              icon="attach-money" 
              label="Total P&L" 
              value="+$2,450"
              color={theme.positive}
            />
            <StatCard 
              icon="schedule" 
              label="Avg. Hold Time" 
              value="4.2h"
              color={theme.secondary}
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Quick Actions
            </Text>
          </View>

          <View style={styles.quickActions}>
            <QuickAction 
              icon="settings" 
              label="Settings" 
              onPress={() => router.push("/settings")}
              theme={theme}
            />
            <QuickAction 
              icon="help-outline" 
              label="Help Center" 
              onPress={() => router.push("/help")}
              theme={theme}
            />
            <QuickAction 
              icon="notifications" 
              label="Notifications" 
              badge={3}
              onPress={() => router.push("/notifications")}
              theme={theme}
            />
            <QuickAction 
              icon="logout" 
              label="Logout" 
              isLogout={true}
              onPress={async () => {
                try {
                  const logout = useAuthStore.getState().logout;
                  if (typeof logout === "function") await logout();
                } catch (err) {
                  console.warn("Logout failed", err);
                }
                router.push("/login");
              }}
              theme={theme}
            />
          </View>
        </View>

        {/* Footer Note */}
        <View style={[styles.footerNote, { backgroundColor: theme.card }]}>
          <AppIcon name="security" color={theme.primary} size={18} />
          <Text style={[styles.footerText, { color: theme.secondary }]}>
            Your account is secured with 256-bit encryption
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Payment Method Component
function PaymentMethod({ icon, label, color, description }) {
  const { theme } = useAppTheme();
  return (
    <TouchableOpacity style={styles.paymentMethod}>
      <View style={[styles.paymentIcon, { backgroundColor: `${color}20` }]}>
        <AppIcon name={icon} color={color} size={22} />
      </View>
      <Text style={[styles.paymentLabel, { color: theme.text }]}>{label}</Text>
      <Text style={[styles.paymentDescription, { color: theme.secondary }]}>{description}</Text>
    </TouchableOpacity>
  );
}

// Feature Card Component
function FeatureCard({ icon, title, description, color, onPress }) {
  const { theme } = useAppTheme();
  return (
    <TouchableOpacity 
      onPress={onPress}
      style={[styles.featureCard, { 
        backgroundColor: theme.card,
        borderWidth: 1,
        borderColor: theme.border,
      }]}
    >
      <View style={[styles.featureIcon, { backgroundColor: `${color}15` }]}>
        <AppIcon name={icon} color={color} size={22} />
      </View>
      <Text style={[styles.featureTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.featureDescription, { color: theme.secondary }]}>{description}</Text>
    </TouchableOpacity>
  );
}

// Stat Card Component
function StatCard({ icon, label, value, color }) {
  const { theme } = useAppTheme();
  return (
    <View style={[styles.statCard, { backgroundColor: theme.card }]}>
      <View style={styles.statTop}>
        <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
          <AppIcon name={icon} color={color} size={18} />
        </View>
        <Text style={[styles.statValue, { color: color }]}>{value}</Text>
      </View>
      <Text style={[styles.statLabel, { color: theme.secondary }]}>{label}</Text>
    </View>
  );
}

// Quick Action Component
function QuickAction({ icon, label, badge, isLogout = false, onPress, theme }) {
  return (
    <TouchableOpacity 
      onPress={onPress}
      style={[
        styles.quickAction, 
        { 
          backgroundColor: theme.card,
          borderColor: isLogout ? theme.negative : theme.border,
          borderWidth: isLogout ? 1 : 1,
        }
      ]}
    >
      <View style={styles.quickActionLeft}>
        <View style={[
          styles.quickActionIcon, 
          { backgroundColor: isLogout ? `${theme.negative}15` : `${theme.primary}15` }
        ]}>
          <AppIcon 
            name={icon} 
            color={isLogout ? theme.negative : theme.primary} 
            size={20} 
          />
        </View>
        <Text style={[
          styles.quickActionLabel, 
          { color: isLogout ? theme.negative : theme.text }
        ]}>
          {label}
        </Text>
      </View>
      <View style={styles.quickActionRight}>
        {badge && (
          <View style={[styles.badge, { backgroundColor: theme.primary }]}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
        <AppIcon 
          name="chevron-right" 
          color={isLogout ? theme.negative : theme.secondary} 
          size={18} 
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  headerSection: { 
    paddingHorizontal: 20, 
    paddingTop: 20,
    marginBottom: 20,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  userGreeting: {
    flex: 1,
  },
  welcomeText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: "800",
  },
  themeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  themeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  themeButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: "600",
  },
  actionGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  actionGridItem: {
    alignItems: "center",
    width: (SCREEN_WIDTH - 80) / 4,
  },
  actionGridIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  actionGridLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  sectionContainer: { 
    paddingHorizontal: 20, 
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: { 
    fontSize: 20, 
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  sectionLink: {
    fontSize: 14,
    fontWeight: "600",
  },
  paymentMethodsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  paymentMethod: {
    width: (SCREEN_WIDTH - 60) / 2,
    backgroundColor: 'transparent',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    alignItems: "center",
  },
  paymentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  paymentLabel: { 
    fontSize: 15, 
    fontWeight: "700",
    marginBottom: 4,
  },
  paymentDescription: {
    fontSize: 12,
    fontWeight: "500",
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  featureCard: {
    width: (SCREEN_WIDTH - 60) / 2,
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  statCard: {
    width: (SCREEN_WIDTH - 60) / 2,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  statTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  quickActions: {
    gap: 8,
  },
  quickAction: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  quickActionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  quickActionLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  quickActionRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: "700",
  },
  footerNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 20,
    gap: 8,
  },
  footerText: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  modalCard: {
    borderRadius: 20,
    padding: 20,
    maxHeight: SCREEN_WIDTH,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: "center",
    alignItems: "center",
  },
  modalOptions: {
    gap: 8,
  },
  modalOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  optionColorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  optionText: {
    fontSize: 15,
    fontWeight: "700",
  },
  optionDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  selectedIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
});