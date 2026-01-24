import { useNavigation } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
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

  const accounts = useAuthStore((state) => state.accounts);
  const sharedAccounts = useAuthStore((state) => state.sharedAccounts);
  const fullName = useAuthStore((state) => state.fullName);
  console.log("Header fullName:", fullName);
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
  console.log("Header selectedAccountId:", selectedAccountId);
  console.log("Header displayAccount:", displayAccount);

  // Owners and shared accounts handled by modal via fullName/sharedAccounts

  const openDrawer = () => {
    // Header is rendered inside Tabs, so the drawer actions live on a parent navigator.
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

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor:
            theme?.background ?? (isDark ? "#0f172a" : "#ffffff"),
        },
      ]}
    >
      <View style={styles.leftRow}>
        <TouchableOpacity
          onPress={() => {
            openDrawer();
          }}
          style={[
            styles.menuButton,
            { backgroundColor: theme?.card ?? "#ffffff" },
          ]}
        >
          <AppIcon
            name="menu"
            size={18}
            color={theme?.icon ?? (isDark ? "white" : "black")}
          />
        </TouchableOpacity>

        <LogoComp size={36} imageIndex={1} />
      </View>

      <View>
        <TouchableOpacity
          onPress={() => setOpen(true)}
          style={[
            styles.accountButton,
            { backgroundColor: theme?.card ?? "#ffffff" },
          ]}
        >
          <Text
            style={[
              styles.accountName,
              { color: theme?.text ?? (isDark ? "#fff" : "#0f172a") },
            ]}
          >
            {fullName ? fullName || "ACC" : "Select"}
          </Text>
          <Text
            style={[
              styles.accountNumber,
              { color: theme?.text ?? (isDark ? "#fff" : "#0f172a") },
            ]}
          >
            (
            {displayAccount
              ? displayAccount.accountNumber || "N/A"
              : "No Account"}
            )
          </Text>
          <AppIcon
            name="expand-more"
            color={theme?.icon ?? (isDark ? "white" : "black")}
            size={16}
          />
        </TouchableOpacity>

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
            // Refresh store-backed accounts/sharedAccounts so new profiles appear.
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuButton: {
    padding: 8,
    marginRight: 8,
    borderRadius: 9999,
  },
  accountButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  accountName: {
    fontWeight: "600",
    marginRight: 8,
  },
  accountNumber: {
    fontSize: 12,
    marginRight: 8,
  },
});

export default Header;
