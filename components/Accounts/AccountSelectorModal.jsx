import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { FadeIn, FadeOut } from "react-native-reanimated";
import { addUserToProfile } from "../../api/auth";
import { useAppTheme } from "../../contexts/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import AppIcon from "../AppIcon";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
    }));
    return [currentUser, ...shared];
  }, [fullName, sharedAccounts]);

  const [activeOwner, setActiveOwner] = useState(
    owners.length ? owners[0].id : "currentUser",
  );
  const [ownersOpen, setOwnersOpen] = useState(false);
  const { userId } = useAuthStore();

  // Add user modal state
  const [addUserModalVisible, setAddUserModalVisible] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addingUser, setAddingUser] = useState(false);

  // Animation values
  const slideAnim = useRef(new Animated.Value(500)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Ensure active owner stays valid when owners list changes (e.g., after login loads)
  useEffect(() => {
    if (!owners.find((o) => o.id === activeOwner)) {
      setActiveOwner(owners.length ? owners[0].id : "currentUser");
    }
  }, [owners, activeOwner]);

  // Animate modal on open/close
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 500,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

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

  const handleAddUser = async () => {
    if (!userId) {
      Alert.alert(
        "Not signed in",
        "Unable to determine current user. Please login again.",
      );
      return;
    }

    if (!addEmail || !addPassword) {
      Alert.alert(
        "Missing fields",
        "Please enter email and password.",
      );
      return;
    }

    // Basic validation
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addEmail);
    if (!emailValid) {
      Alert.alert(
        "Invalid Email",
        "Please enter a valid email address.",
      );
      return;
    }
    if (addPassword.length < 6) {
      Alert.alert(
        "Weak Password",
        "Password must be at least 6 characters.",
      );
      return;
    }

    setAddingUser(true);
    try {
      const result = await addUserToProfile(
        userId,
        addEmail,
        addPassword,
      );
      console.log("User added to profile", {
        userId,
        addEmail,
        result,
      });
      setAddUserModalVisible(false);
      setAddEmail("");
      setAddPassword("");
      onRefresh && onRefresh();
      Alert.alert("Success", "User added to profile.");
    } catch (err) {
      console.error("Error adding user to profile", err);
      const resp = err?.response?.data;
      const message =
        resp?.message ||
        (resp ? JSON.stringify(resp) : err?.message) ||
        "Failed to add user.";
      Alert.alert("Error", message);
    } finally {
      setAddingUser(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Animated.View 
        style={[
          styles.backdrop, 
          { opacity: fadeAnim }
        ]}
      >
        <TouchableOpacity 
          style={styles.backdropInner} 
          onPress={onClose}
          activeOpacity={1}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.background,
            shadowColor: "#000",
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Drag handle */}
        <View style={styles.handleWrapper}>
          <View style={[styles.handle, { backgroundColor: theme.secondary + '80' }]} />
        </View>

        <View style={{ flexShrink: 0 }}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: theme.text }]}>
                Select Account
              </Text>
              <Text style={[styles.subtitle, { color: theme.secondary }]}>
                Choose an account to view transactions
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                onPress={() => setAddUserModalVisible(true)}
                style={[
                  styles.iconButton,
                  styles.iconButtonElevated,
                  { backgroundColor: theme.card },
                ]}
                activeOpacity={0.7}
              >
                <AppIcon name="person-add" size={20} color={theme.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onClose}
                style={[
                  styles.iconButton,
                  styles.iconButtonElevated,
                  { backgroundColor: theme.card },
                ]}
                activeOpacity={0.7}
              >
                <AppIcon name="close" size={20} color={theme.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Owner Dropdown */}
          <View style={styles.blockSpacing}>
            <View style={styles.labelRow}>
              <Text
                style={[
                  styles.label,
                  styles.labelTight,
                  { color: theme.secondary },
                ]}
              >
                Owner
              </Text>
              <Text style={[styles.labelHint, { color: theme.secondary + '90' }]}>
                Tap to switch
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setOwnersOpen((s) => !s)}
              style={[
                styles.dropdown,
                { 
                  backgroundColor: theme.card, 
                  borderColor: ownersOpen ? theme.primary + '50' : theme.border,
                  shadowColor: theme.shadow,
                },
              ]}
              activeOpacity={0.8}
            >
              <View style={styles.rowCenter}>
                <View style={[styles.ownerAvatar, { backgroundColor: theme.primary + '15' }]}>
                  <AppIcon name="person" size={18} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.dropdownText, { color: theme.text }]}>
                    {owners.find((p) => p.id === activeOwner)?.name ??
                      "Select Owner"}
                  </Text>
                  <Text style={[styles.dropdownSubtext, { color: theme.secondary }]}>
                    {filteredAccounts.length} account{filteredAccounts.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
              <AppIcon
                name={ownersOpen ? "expand-less" : "expand-more"}
                size={22}
                color={theme.primary}
              />
            </TouchableOpacity>
            {ownersOpen && (
              <Animated.View
                style={[
                  styles.dropdownList,
                  { 
                    backgroundColor: theme.card, 
                    borderColor: theme.primary + '30',
                    shadowColor: theme.shadow,
                  },
                ]}
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(150)}
              >
                <ScrollView 
                  showsVerticalScrollIndicator={false}
                  style={{ maxHeight: 160 }}
                >
                  {owners.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => {
                        setActiveOwner(p.id);
                        setOwnersOpen(false);
                      }}
                      style={[
                        styles.dropdownItem,
                        {
                          backgroundColor:
                            activeOwner === p.id
                              ? theme.primary + '10'
                              : "transparent",
                        },
                      ]}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.ownerAvatarSmall,
                        { 
                          backgroundColor: activeOwner === p.id 
                            ? theme.primary 
                            : theme.primary + '15' 
                        }
                      ]}>
                        <AppIcon
                          name="person"
                          size={14}
                          color={activeOwner === p.id ? "#fff" : theme.primary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.dropdownItemText,
                            {
                              color: activeOwner === p.id ? theme.primary : theme.text,
                              fontWeight: activeOwner === p.id ? '700' : '500',
                            },
                          ]}
                        >
                          {p.name}
                        </Text>
                        <Text style={[styles.dropdownItemSubtext, { color: theme.secondary }]}>
                          {p.id === 'currentUser' ? 'Your accounts' : 'Shared accounts'}
                        </Text>
                      </View>
                      {activeOwner === p.id && (
                        <View style={[styles.selectedDot, { backgroundColor: theme.primary }]} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </Animated.View>
            )}
          </View>
        </View>

        {/* Accounts List */}
        <View style={styles.listContainer}>
          <View style={styles.listHeader}>
            <Text style={[styles.label, { color: theme.secondary }]}>
              Available Accounts
            </Text>
            <View style={[styles.accountCountBadge, { backgroundColor: theme.primary + '15' }]}>
              <Text style={[styles.accountCountText, { color: theme.primary }]}>
                {filteredAccounts.length}
              </Text>
            </View>
          </View>
          
          {filteredAccounts.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: theme.primary + '10' }]}>
                <AppIcon name="account-balance-wallet" size={32} color={theme.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                No Accounts Found
              </Text>
              <Text style={[styles.emptyText, { color: theme.secondary }]}>
                {activeOwner === 'currentUser' 
                  ? "You don't have any accounts yet"
                  : "No shared accounts available"}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredAccounts}
              keyExtractor={(i) => String(i.accountId ?? i.id)}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ paddingBottom: 30, paddingTop: 8 }}
              renderItem={({ item, index }) => (
                <Animated.View
                  entering={FadeIn.delay(index * 50).duration(300)}
                >
                  <TouchableOpacity
                    onPress={() => {
                      onSelectAccount && onSelectAccount(item);
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
                            ? theme.primary + '10'
                            : theme.card,
                        borderColor:
                          (item.accountId ?? item.id) === selectedAccountId
                            ? theme.primary + '30'
                            : theme.border,
                        shadowColor: theme.shadow,
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <View style={styles.accountInfoRow}>
                      <View
                        style={[
                          styles.accountAvatar,
                          { 
                            backgroundColor: (item.accountId ?? item.id) === selectedAccountId
                              ? theme.primary + '20'
                              : theme.primary + '10',
                          },
                        ]}
                      >
                        <AppIcon
                          name="account-balance-wallet"
                          size={22}
                          color={theme.primary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.accountNumber, { color: theme.text }]}>
                          {item.accountNumber ?? item.id}
                        </Text>
                        <Text
                          style={[styles.accountMeta, { color: theme.secondary }]}
                          numberOfLines={1}
                        >
                          {item.accountTypeName ?? item.type ?? "Account"}
                          {item.accountName ? ` • ${item.accountName}` : ""}
                        </Text>
                        {(item.balance != null || item.currency) && (
                          <Text
                            style={[
                              styles.accountBalance,
                              { color: theme.primary },
                            ]}
                          >
                            {item.balance != null ? item.balance.toLocaleString() : "-"} 
                            <Text style={{ color: theme.secondary }}> {item.currency ?? ""}</Text>
                          </Text>
                        )}
                      </View>
                    </View>
                    {(item.accountId ?? item.id) === selectedAccountId ? (
                      <View
                        style={[
                          styles.checkIcon,
                          { backgroundColor: theme.primary },
                        ]}
                      >
                        <AppIcon name="check" size={16} color="#fff" />
                      </View>
                    ) : (
                      <AppIcon 
                        name="chevron-right" 
                        size={20} 
                        color={theme.secondary + '50'} 
                      />
                    )}
                  </TouchableOpacity>
                </Animated.View>
              )}
            />
          )}
        </View>
      </Animated.View>

      {/* Add User Modal */}
      <Modal visible={addUserModalVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.backdrop}
          onPress={() => setAddUserModalVisible(false)}
          activeOpacity={1}
        >
          <View style={styles.backdropInner} />
        </TouchableOpacity>
        <Animated.View
          style={[
            styles.addModalBox,
            { 
              backgroundColor: theme.background, 
              shadowColor: theme.shadow,
            },
          ]}
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
        >
          <View style={styles.addModalHeader}>
            <View style={[styles.addModalIcon, { backgroundColor: theme.primary + '15' }]}>
              <AppIcon name="person-add" size={24} color={theme.primary} />
            </View>
            <Text
              style={[styles.addModalTitle, { color: theme.text }]}
            >
              Add User To Profile
            </Text>
            <Text style={[styles.addModalSubtitle, { color: theme.secondary }]}>
              Share access to your accounts
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.secondary, marginBottom: 6 }]}>
              Email Address
            </Text>
            <TextInput
              value={addEmail}
              onChangeText={setAddEmail}
              placeholder="Enter user's email"
              placeholderTextColor={theme.secondary + '70'}
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
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.secondary, marginBottom: 6 }]}>
              Password
            </Text>
            <TextInput
              value={addPassword}
              onChangeText={setAddPassword}
              placeholder="Enter temporary password"
              placeholderTextColor={theme.secondary + '70'}
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
            <Text style={[styles.inputHint, { color: theme.secondary + '70' }]}>
              Minimum 6 characters
            </Text>
          </View>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              gap: 12,
              marginTop: 24,
            }}
          >
            <TouchableOpacity
              onPress={() => setAddUserModalVisible(false)}
              style={[
                styles.modalButton,
                styles.modalButtonSecondary,
                { backgroundColor: theme.card },
              ]}
              activeOpacity={0.7}
            >
              <Text style={{ color: theme.secondary }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleAddUser}
              style={[
                styles.modalButton,
                styles.modalButtonPrimary,
                { backgroundColor: theme.primary },
              ]}
              activeOpacity={0.8}
              disabled={addingUser}
            >
              {addingUser ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={{ color: "#fff", fontWeight: '600' }}>Add User</Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Modal>
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
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    height: 520,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  handleWrapper: {
    alignItems: "center",
    marginBottom: 16,
    paddingVertical: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 999,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
    opacity: 0.8,
  },
  iconButton: {
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonElevated: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  blockSpacing: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  labelHint: {
    fontSize: 11,
    fontWeight: '500',
  },
  labelTight: {
    marginBottom: 6,
  },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  rowCenter: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  ownerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  ownerAvatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  dropdownText: {
    marginLeft: 0,
    fontWeight: "700",
    fontSize: 16,
  },
  dropdownSubtext: {
    fontSize: 12,
    marginTop: 2,
    opacity: 0.7,
  },
  dropdownList: {
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  dropdownItemText: {
    marginLeft: 0,
    fontSize: 15,
  },
  dropdownItemSubtext: {
    fontSize: 11,
    marginTop: 2,
    opacity: 0.7,
  },
  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  listContainer: {
    flex: 1,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  accountCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  accountCountText: {
    fontSize: 12,
    fontWeight: '700',
  },
  accountCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  accountInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  accountAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  accountNumber: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  accountMeta: {
    fontSize: 13,
    opacity: 0.8,
    marginBottom: 4,
  },
  accountBalance: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 2,
  },
  checkIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  addModalBox: {
    position: "absolute",
    left: 20,
    right: 20,
    top: "30%",
    borderRadius: 20,
    padding: 24,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  addModalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  addModalIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  addModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  addModalSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    opacity: 0.8,
  },
  inputGroup: {
    marginBottom: 18,
  },
  modalInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '500',
  },
  inputHint: {
    fontSize: 11,
    marginTop: 6,
    marginLeft: 4,
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  modalButtonPrimary: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  modalButtonSecondary: {
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
});