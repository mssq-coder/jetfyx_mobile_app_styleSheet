import { useNavigation } from "expo-router";
import { useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../hooks/useTheme";
import { useAuthStore } from "../store/authStore";
import AccountSelectorModal from "./Accounts/AccountSelectorModal";
import AppIcon from "./AppIcon";
import LogoComp from "./LogoComp";

const Header = ({
  currentAccount = null,
  onSelect = () => {},
  imageIndex = 1,
  onRefresh = () => {},
}) => {
  const [open, setOpen] = useState(false);
  const { themeName, theme } = useTheme();
  const isDark = themeName === "dark";
  const navigation = useNavigation();
  
  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const accounts = useAuthStore((state) => state.accounts);
  const sharedAccounts = useAuthStore((state) => state.sharedAccounts);
  const fullName = useAuthStore((state) => state.fullName);
  const selectedAccountId = useAuthStore((state) => state.selectedAccountId);
  const setSelectedAccount = useAuthStore((state) => state.setSelectedAccount);
  const refreshProfile = useAuthStore((state) => state.refreshProfile);

  // Include both own and shared accounts when resolving the selected account
  const sharedList = (sharedAccounts || []).flatMap((s) => s?.accounts || []);
  const allAccounts = [...(accounts || []), ...sharedList];
  const selectedAccount =
    allAccounts.find((a) => (a.accountId ?? a.id) === selectedAccountId) ||
    null;
  const displayAccount = currentAccount || selectedAccount;

  const openDrawer = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start();

    let nav = navigation;
    for (let i = 0; i < 6; i++) {
      if (
        nav &&
        (typeof nav.toggleDrawer === "function" ||
          typeof nav.openDrawer === "function")
      ) {
        break;
      }
      nav = typeof nav?.getParent === "function" ? nav.getParent() : null;
    }

    try {
      if (typeof nav?.toggleDrawer === "function") nav.toggleDrawer();
      else if (typeof nav?.openDrawer === "function") nav.openDrawer();
    } catch {}
  };

  const handleAccountPress = () => {
    setOpen(true);
  };

  const getAccountTypeColor = (type) => {
    if (!type) return theme?.primary;
    const typeLower = type.toLowerCase();
    if (typeLower.includes('saving') || typeLower.includes('deposit')) return theme?.success || '#10b981';
    if (typeLower.includes('checking') || typeLower.includes('current')) return theme?.info || '#3b82f6';
    if (typeLower.includes('credit') || typeLower.includes('loan')) return theme?.warning || '#f59e0b';
    return theme?.primary;
  };

  const accountTypeColor = displayAccount ? getAccountTypeColor(displayAccount.accountTypeName) : theme?.primary;

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: theme?.background ?? (isDark ? "#0f172a" : "#ffffff"),
        },
      ]}
      edges={['top']}
    >
      <View style={styles.content}>
        {/* Left Section - Logo */}
        <View style={styles.leftSection}>
          <LogoComp size={36} imageIndex={imageIndex} />
        </View>

        {/* Right Section */}
        <View style={styles.rightSection}>
          {/* Menu Button */}
          <Animated.View 
            style={{ 
              transform: [{ scale: scaleAnim }] 
            }}
          >
            <TouchableOpacity
              onPress={openDrawer}
              style={[
                styles.menuButton,
                { 
                  backgroundColor: theme?.card ?? "#ffffff",
                  borderColor: theme?.border + '30' ?? "#e2e8f0",
                },
              ]}
              activeOpacity={0.7}
            >
              <AppIcon
                name="menu"
                size={20}
                color={theme?.icon ?? (isDark ? "#cbd5e1" : "#475569")}
              />
            </TouchableOpacity>
          </Animated.View>

          {/* Account Selector */}
          <TouchableOpacity
            onPress={handleAccountPress}
            style={[
              styles.accountButton,
              { 
                backgroundColor: theme?.card ?? "#ffffff",
                borderColor: theme?.border + '30' ?? "#e2e8f0",
              },
            ]}
            activeOpacity={0.8}
          >
            <View style={[
              styles.accountIcon,
              { backgroundColor: accountTypeColor + '15' }
            ]}>
              <AppIcon
                name="account-balance"
                size={16}
                color={accountTypeColor}
              />
            </View>
            
            <View style={styles.accountInfo}>
              <Text
                style={[
                  styles.accountText,
                  { 
                    color: theme?.text ?? (isDark ? "#fff" : "#0f172a"),
                  },
                ]}
                numberOfLines={1}
              >
                {displayAccount
                  ? displayAccount.accountNumber || "Account"
                  : "Select Account"}
              </Text>
              {displayAccount?.accountTypeName && (
                <Text
                  style={[
                    styles.accountType,
                    { 
                      color: accountTypeColor,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {displayAccount.accountTypeName}
                </Text>
              )}
            </View>
            
            <AppIcon
              name="expand-more"
              color={theme?.secondary ?? (isDark ? "#94a3b8" : "#64748b")}
              size={18}
              style={styles.dropdownIcon}
            />
          </TouchableOpacity>
        </View>

        <AccountSelectorModal
          visible={open}
          onClose={() => setOpen(false)}
          accounts={accounts}
          sharedAccounts={sharedAccounts}
          fullName={fullName || ""}
          selectedAccountId={
            displayAccount
              ? (displayAccount.accountId ?? displayAccount.id)
              : selectedAccountId
          }
          onSelectAccount={(a) => {
            setSelectedAccount(a);
            onSelect(a);
            setOpen(false);
          }}
          onRefresh={async () => {
            try {
              await refreshProfile?.();
            } catch {}
            try {
              await onRefresh?.();
            } catch {}
          }}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: '100%',
  },
  leftSection: {
    flex: 1,
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  accountButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    minWidth: 140,
    maxWidth: 180,
  },
  accountIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  accountInfo: {
    flex: 1,
    minWidth: 0,
  },
  accountText: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2,
  },
  accountType: {
    fontSize: 11,
    fontWeight: "500",
    opacity: 0.8,
  },
  dropdownIcon: {
    marginLeft: 4,
    opacity: 0.6,
  },
});

export default Header;