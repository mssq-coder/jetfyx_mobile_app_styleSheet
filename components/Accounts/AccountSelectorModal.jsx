import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
  View,
} from "react-native";
import { useAppTheme } from "../../contexts/ThemeContext";
import AppIcon from "../AppIcon";
import { addUserToProfile } from "../../api/auth";
import { useAuthStore } from "../../store/authStore";
import { Alert } from "react-native";

// Modal lists accounts grouped by owner: main user fullName + shared owners
export default function AccountSelectorModal({
  visible,
  onClose,
  accounts = [],
  sharedAccounts = [],
  fullName = "",
  selectedAccountId,
  onSelectAccount,
  onRefresh,
}) {
  const { theme } = useAppTheme();
  const owners = useMemo(() => {
    const currentUser = { id: "currentUser", name: fullName || "My Accounts" };
    const shared = (sharedAccounts || []).map((sharedAccount) => ({
      id: String(sharedAccount?.accountOwner?.userId ?? "shared"),
      name: sharedAccount?.accountOwner?.fullName ?? "Shared Account",
      email: sharedAccount?.accountOwner?.email ?? "",
    }));
    return [currentUser, ...shared];
  }, [fullName, sharedAccounts]);

  const [activeOwner, setActiveOwner] = useState(
    owners.length ? owners[0].id : "currentUser",
  );
  const [ownersOpen, setOwnersOpen] = useState(false);
  const { userId, login, refreshProfile } = useAuthStore();

  // Switch-profile login modal state
  const [switchModalVisible, setSwitchModalVisible] = useState(false);
  const [switchEmail, setSwitchEmail] = useState("");
  const [switchPassword, setSwitchPassword] = useState("");
  const [switching, setSwitching] = useState(false);
  const [pendingOwner, setPendingOwner] = useState(null);

  // Add user modal state
  const [addUserModalVisible, setAddUserModalVisible] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addingUser, setAddingUser] = useState(false);

  // Ensure active owner stays valid when owners list changes (e.g., after login loads)
  useEffect(() => {
    if (!owners.find((o) => o.id === activeOwner)) {
      setActiveOwner(owners.length ? owners[0].id : "currentUser");
    }
  }, [owners, activeOwner]);
  const filteredAccounts = useMemo(() => {
    if (activeOwner === "currentUser") return accounts;
    const entry = (sharedAccounts || []).find(
      (s) =>
        String(
          s?.accountOwner?.userId ?? s?.accountOwner?.email ?? "shared",
        ) === String(activeOwner),
    );
    return entry?.accounts ?? [];
  }, [activeOwner, accounts, sharedAccounts]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity style={styles.backdrop} onPress={onClose}>
        <View style={styles.backdropInner} />
      </TouchableOpacity>

      <View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.background,
            shadowColor: "#000",
          },
        ]}
      >
        {/* Drag handle */}
        <View style={styles.handleWrapper}>
          <View style={[styles.handle, { backgroundColor: theme.secondary }]} />
        </View>

        {/* Add User Modal */}
        <Modal visible={addUserModalVisible} transparent animationType="fade">
          <TouchableOpacity style={styles.backdrop} onPress={() => setAddUserModalVisible(false)}>
            <View style={styles.backdropInner} />
          </TouchableOpacity>
          <View style={[styles.addModalBox, { backgroundColor: theme.background, shadowColor: "#000" }]}>
            <Text style={[styles.title, { color: theme.text, marginBottom: 8 }]}>Add User To Profile</Text>
            <Text style={[styles.label, { color: theme.secondary }]}>Email</Text>
            <TextInput
              value={addEmail}
              onChangeText={setAddEmail}
              placeholder="user@example.com"
              placeholderTextColor={theme.secondary}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[styles.modalInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
            />
            <Text style={[styles.label, { color: theme.secondary, marginTop: 10 }]}>Password</Text>
            <TextInput
              value={addPassword}
              onChangeText={setAddPassword}
              placeholder="password"
              placeholderTextColor={theme.secondary}
              secureTextEntry
              style={[styles.modalInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
            />

            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
              <TouchableOpacity onPress={() => setAddUserModalVisible(false)} style={[styles.iconButton, { paddingHorizontal: 14, backgroundColor: theme.card }]}> 
                <Text style={{ color: theme.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  if (!userId) {
                    Alert.alert("Not signed in", "Unable to determine current user. Please login again.");
                    return;
                  }

                  if (!addEmail || !addPassword) {
                    Alert.alert("Missing fields", "Please enter email and password.");
                    return;
                  }

                  // Basic validation
                  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addEmail);
                  if (!emailValid) {
                    Alert.alert("Invalid Email", "Please enter a valid email address.");
                    return;
                  }
                  if (addPassword.length < 6) {
                    Alert.alert("Weak Password", "Password must be at least 6 characters.");
                    return;
                  }

                  setAddingUser(true);
                  console.log("User added to profile", { userId, addEmail, addPassword });
                  try {
                    const result = await addUserToProfile(userId, addEmail, addPassword);
                    console.log("Add user to profile result", result);
                    setAddUserModalVisible(false);
                    setAddEmail("");
                    setAddPassword("");
                    try {
                      await refreshProfile?.();
                    } catch {}
                    try {
                      await onRefresh?.();
                    } catch {}
                    Alert.alert("Success", "User added to profile.");
                  } catch (err) {
                    console.error("Error adding user to profile", err);
                    const resp = err?.response?.data;
                    // Prefer explicit message, fall back to full response JSON when available
                    const message = resp?.message || (resp ? JSON.stringify(resp) : err?.message) || "Failed to add user.";
                    Alert.alert("Error", message);
                  } finally {
                    setAddingUser(false);
                  }
                }}
                style={[styles.iconButton, { paddingHorizontal: 14, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center" }]}
              >
                {addingUser ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff" }}>Add</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <View style={{ flexShrink: 0 }}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: theme.text }]}>Select Account</Text>

            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                onPress={() => setAddUserModalVisible(true)}
                style={[styles.iconButton, { backgroundColor: theme.card, marginRight: 8 }]}
              >
                <AppIcon name="person-add" size={18} color={theme.text} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onClose}
                style={[styles.iconButton, { backgroundColor: theme.card }]}
              >
                <AppIcon name="close" size={18} color={theme.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Owner Dropdown */}
          <View style={styles.blockSpacing}>
            <Text
              style={[
                styles.label,
                styles.labelTight,
                { color: theme.secondary },
              ]}
            >
              Owner
            </Text>
            <TouchableOpacity
              onPress={() => setOwnersOpen((s) => !s)}
              style={[
                styles.dropdown,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <View style={styles.rowCenter}>
                <AppIcon name="person" size={16} color={theme.primary} />
                <Text style={[styles.dropdownText, { color: theme.text }]}>
                  {owners.find((p) => p.id === activeOwner)?.name ??
                    "Select Owner"}
                </Text>
              </View>
              <AppIcon
                name={ownersOpen ? "expand-less" : "expand-more"}
                size={18}
                color={theme.secondary}
              />
            </TouchableOpacity>
            {ownersOpen && (
              <View
                style={[
                  styles.dropdownList,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <ScrollView showsVerticalScrollIndicator>
                  {owners.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => {
                        // Only require login when switching to another profile owner
                        if (p.id === "currentUser") {
                          setActiveOwner(p.id);
                          setOwnersOpen(false);
                          return;
                        }

                        setPendingOwner(p);
                        setSwitchEmail(p.email || "");
                        setSwitchPassword("");
                        setSwitchModalVisible(true);
                        setOwnersOpen(false);
                      }}
                      style={[
                        styles.dropdownItem,
                        {
                          backgroundColor:
                            activeOwner === p.id
                              ? theme.primary
                              : "transparent",
                        },
                      ]}
                    >
                      <AppIcon
                        name="person"
                        size={14}
                        color={activeOwner === p.id ? "#fff" : theme.secondary}
                      />
                      <Text
                        style={[
                          styles.dropdownItemText,
                          {
                            color: activeOwner === p.id ? "#fff" : theme.text,
                          },
                        ]}
                      >
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </View>

        {/* Switch Profile Login Modal */}
        <Modal visible={switchModalVisible} transparent animationType="fade">
          <TouchableOpacity
            style={styles.backdrop}
            onPress={() => {
              setSwitchModalVisible(false);
              setPendingOwner(null);
            }}
          >
            <View style={styles.backdropInner} />
          </TouchableOpacity>

          <View
            style={[
              styles.addModalBox,
              { backgroundColor: theme.background, shadowColor: "#000" },
            ]}
          >
            <Text style={[styles.title, { color: theme.text, marginBottom: 8 }]}
            >
              Switch Profile
            </Text>

            <Text style={[styles.label, { color: theme.secondary }]}>Email</Text>
            <TextInput
              value={switchEmail}
              onChangeText={setSwitchEmail}
              placeholder="user@example.com"
              placeholderTextColor={theme.secondary}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[
                styles.modalInput,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.card,
                },
              ]}
            />

            <Text style={[styles.label, { color: theme.secondary, marginTop: 10 }]}
            >
              Password
            </Text>
            <TextInput
              value={switchPassword}
              onChangeText={setSwitchPassword}
              placeholder="password"
              placeholderTextColor={theme.secondary}
              secureTextEntry
              style={[
                styles.modalInput,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.card,
                },
              ]}
            />

            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 14,
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  setSwitchModalVisible(false);
                  setPendingOwner(null);
                }}
                style={[
                  styles.iconButton,
                  { paddingHorizontal: 14, backgroundColor: theme.card },
                ]}
              >
                <Text style={{ color: theme.text }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={async () => {
                  if (!switchEmail || !switchPassword) {
                    Alert.alert("Missing fields", "Please enter email and password.");
                    return;
                  }

                  setSwitching(true);
                  try {
                    const res = await login({ email: switchEmail, password: switchPassword });
                    if (!res?.success) {
                      Alert.alert("Login failed", res?.error || "Unable to switch profile.");
                      return;
                    }

                    // After switching user, we're now in that profile; show its accounts.
                    setActiveOwner("currentUser");
                    setSwitchModalVisible(false);
                    setPendingOwner(null);
                    try {
                      await refreshProfile?.();
                    } catch {}
                    try {
                      await onRefresh?.();
                    } catch {}
                    Alert.alert(
                      "Switched",
                      pendingOwner?.name
                        ? `Switched to ${pendingOwner.name}.`
                        : "Profile switched.",
                    );
                  } catch (e) {
                    const message =
                      e?.response?.data?.message || e?.message || "Unable to switch profile.";
                    Alert.alert("Login failed", message);
                  } finally {
                    setSwitching(false);
                  }
                }}
                style={[
                  styles.iconButton,
                  {
                    paddingHorizontal: 14,
                    backgroundColor: theme.primary,
                    alignItems: "center",
                    justifyContent: "center",
                  },
                ]}
              >
                {switching ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: "#fff" }}>Login</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Accounts List (scrollable) */}
        <View style={styles.listContainer}>
          <Text style={[styles.label, { color: theme.secondary }]}>
            Accounts ({filteredAccounts.length})
          </Text>
          <FlatList
            data={filteredAccounts}
            keyExtractor={(i) => String(i.accountId ?? i.id)}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  // If user is viewing a shared owner's accounts without switching auth,
                  // force a profile switch first.
                  if (activeOwner !== "currentUser") {
                    const owner = owners.find((o) => String(o.id) === String(activeOwner));
                    setPendingOwner(owner || null);
                    setSwitchEmail(owner?.email || "");
                    setSwitchPassword("");
                    setSwitchModalVisible(true);
                    return;
                  }
                  onSelectAccount && onSelectAccount(item);
                  // Trigger refresh after account selection
                  setTimeout(() => {
                    onRefresh && onRefresh();
                  }, 100);
                  onClose && onClose();
                }}
                style={[
                  styles.accountCard,
                  {
                    backgroundColor:
                      (item.accountId ?? item.id) === selectedAccountId
                        ? theme.primary + "20"
                        : theme.card,
                    borderColor:
                      (item.accountId ?? item.id) === selectedAccountId
                        ? theme.primary
                        : theme.border,
                  },
                ]}
              >
                <View style={styles.accountInfoRow}>
                  <View
                    style={[
                      styles.accountAvatar,
                      { backgroundColor: theme.primary + "30" },
                    ]}
                  >
                    <AppIcon
                      name="account-balance-wallet"
                      size={20}
                      color={theme.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.accountNumber, { color: theme.text }]}>
                      {item.accountNumber ?? item.id}
                    </Text>
                    <Text
                      style={[styles.accountMeta, { color: theme.secondary }]}
                    >
                      {item.accountTypeName ?? item.type ?? "Account"}
                      {item.accountName ? ` • ${item.accountName}` : ""}
                    </Text>
                    {(item.balance != null || item.currency) && (
                      <Text
                        style={[
                          styles.accountBalance,
                          { color: theme.secondary },
                        ]}
                      >
                        Balance: {item.balance != null ? item.balance : "-"}{" "}
                        {item.currency ?? ""}
                      </Text>
                    )}
                  </View>
                </View>
                {(item.accountId ?? item.id) === selectedAccountId && (
                  <View
                    style={[
                      styles.checkIcon,
                      { backgroundColor: theme.primary },
                    ]}
                  >
                    <AppIcon name="check" size={14} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backdropInner: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    height: 480,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 10,
  },
  handleWrapper: {
    alignItems: "center",
    marginBottom: 12,
  },
  handle: {
    width: 48,
    height: 6,
    borderRadius: 999,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  iconButton: {
    padding: 8,
    borderRadius: 999,
  },
  blockSpacing: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  labelTight: {
    marginBottom: 6,
  },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  rowCenter: {
    flexDirection: "row",
    alignItems: "center",
  },
  dropdownText: {
    marginLeft: 10,
    fontWeight: "600",
  },
  dropdownList: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dropdownItemText: {
    marginLeft: 12,
    fontWeight: "500",
  },
  listContainer: {
    flex: 1,
  },
  accountCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  accountInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  accountAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  accountNumber: {
    fontSize: 16,
    fontWeight: "700",
  },
  accountMeta: {
    fontSize: 14,
  },
  accountBalance: {
    fontSize: 12,
    marginTop: 6,
  },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  addModalBox: {
    position: "absolute",
    left: 20,
    right: 20,
    top: "30%",
    borderRadius: 12,
    padding: 16,
    elevation: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 6,
  },
});
