import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import api from "../../api/client";
import AccountSelectorModal from "../../components/Accounts/AccountSelectorModal";
import AppIcon from "../../components/AppIcon";
import { useAppTheme } from "../../contexts/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import { showErrorToast, showSuccessToast } from "../../utils/toast";
import usePullToRefresh from "../../hooks/usePullToRefresh";

const TABS = {
  profile: "profile",
  account: "account",
};

const DEFAULT_FORM_STATE = {
  profile: {
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    showCurrent: false,
    showNew: false,
    showConfirm: false,
  },
  account: {
    accountNumber: "",
    accountType: "master", // master | investor
    newPassword: "",
    confirmPassword: "",
    showNew: false,
    showConfirm: false,
  },
};

const allowedSpecialChars = "!@#$%^&*";

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasAllowedSpecialChar(pwd) {
  if (!pwd) return false;
  const re = new RegExp(`[${escapeRegExp(allowedSpecialChars)}]`);
  return re.test(pwd);
}

function hasDisallowedSpecialChar(pwd) {
  if (!pwd) return false;
  const allowed = new RegExp(
    `^[A-Za-z0-9${escapeRegExp(allowedSpecialChars)}]*$`,
  );
  return !allowed.test(pwd);
}

function validatePassword(pwd) {
  if (!pwd) return "Password is required.";
  if (pwd.length < 8 || pwd.length > 15)
    return "Password must be 8-15 characters.";
  if (!/[A-Z]/.test(pwd))
    return "Password must include at least 1 uppercase letter.";
  if (!/[a-z]/.test(pwd))
    return "Password must include at least 1 lowercase letter.";
  if (!/[0-9]/.test(pwd)) return "Password must include at least 1 number.";
  if (!hasAllowedSpecialChar(pwd))
    return `Password must include 1 special character (${allowedSpecialChars}).`;
  if (hasDisallowedSpecialChar(pwd))
    return `Only these special characters are allowed: ${allowedSpecialChars}`;
  return null;
}

const passwordCriteria = [
  {
    label: "8-15 characters",
    test: (pwd) => pwd && pwd.length >= 8 && pwd.length <= 15,
  },
  {
    label: "At least 1 uppercase letter",
    test: (pwd) => /[A-Z]/.test(pwd || ""),
  },
  {
    label: "At least 1 lowercase letter",
    test: (pwd) => /[a-z]/.test(pwd || ""),
  },
  { label: "At least 1 number", test: (pwd) => /[0-9]/.test(pwd || "") },
  {
    label: `1 special character (${allowedSpecialChars})`,
    test: (pwd) => hasAllowedSpecialChar(pwd || ""),
  },
];

function getPasswordStrength(pwd) {
  if (!pwd) return 0;
  return passwordCriteria.reduce((acc, c) => acc + (c.test(pwd) ? 1 : 0), 0);
}

function getPasswordProgress(pwd) {
  const strength = getPasswordStrength(pwd);
  const width = (strength / passwordCriteria.length) * 100;
  let color = "#ef4444";
  if (strength === passwordCriteria.length) color = "#22c55e";
  else if (strength >= 3) color = "#facc15";
  return { width, color, strength };
}

export default function PasswordChange() {
  const { theme } = useAppTheme();
  const { refreshing, runRefresh } = usePullToRefresh();
  const { accounts, sharedAccounts, fullName, selectedAccountId, userEmail } =
    useAuthStore();

  // IMPORTANT: this screen should NOT change the app-wide selected account.
  // Some parts of the app may auto-fetch account-specific data on selection change,
  // and that can surface unrelated 401s while the user is just selecting an account
  // for password update.
  const [localAccountId, setLocalAccountId] = useState(
    selectedAccountId ?? null,
  );

  const allAccountsFlat = useMemo(() => {
    const main = Array.isArray(accounts) ? accounts : [];
    const shared = (
      Array.isArray(sharedAccounts) ? sharedAccounts : []
    ).flatMap((s) => s?.accounts || []);
    return [...main, ...shared];
  }, [accounts, sharedAccounts]);

  const localSelectedAccount = useMemo(() => {
    const id = localAccountId;
    const found = (allAccountsFlat || []).find(
      (a) => String(a.accountId ?? a.id) === String(id),
    );
    return found || (Array.isArray(accounts) ? accounts[0] : null) || null;
  }, [allAccountsFlat, localAccountId, accounts]);

  const currentEmail = String(userEmail || "").trim();

  const [activeTab, setActiveTab] = useState(TABS.profile);
  const [formState, setFormState] = useState(DEFAULT_FORM_STATE);
  const [errors, setErrors] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [accountModalOpen, setAccountModalOpen] = useState(false);

  const firstInputRef = useRef(null);

  const tabState = useMemo(() => formState[activeTab], [formState, activeTab]);

  useEffect(() => {
    const t = setTimeout(() => {
      firstInputRef.current?.focus?.();
    }, 250);
    return () => clearTimeout(t);
  }, [activeTab]);

  useEffect(() => {
    // Keep accountNumber in sync with the user's currently selected account.
    const acctNum = String(localSelectedAccount?.accountNumber || "");
    setFormState((prev) => ({
      ...prev,
      account: {
        ...prev.account,
        accountNumber: prev.account.accountNumber || acctNum,
      },
    }));
  }, [localAccountId]);

  const setField = (tab, field, value) => {
    setFormState((prev) => ({
      ...prev,
      [tab]: { ...prev[tab], [field]: value },
    }));
  };

  const newPwdProgress = useMemo(() => {
    return getPasswordProgress(tabState?.newPassword);
  }, [tabState?.newPassword]);

  const validate = () => {
    const nextErrors = {};

    if (!currentEmail) {
      nextErrors.email = "User email not available. Please re-login.";
    }

    if (activeTab === TABS.profile) {
      if (!tabState.currentPassword) {
        nextErrors.currentPassword = "Current password is required.";
      }
    } else {
      if (!tabState.accountNumber) {
        nextErrors.accountNumber = "Please select an account.";
      }
      if (!tabState.accountType) {
        nextErrors.accountType = "Please select account type.";
      }
    }

    const pwdError = validatePassword(tabState.newPassword);
    if (pwdError) nextErrors.newPassword = pwdError;

    if (!tabState.confirmPassword) {
      nextErrors.confirmPassword = "Please confirm your password.";
    } else if (tabState.newPassword !== tabState.confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    } else {
      const confirmPwdError = validatePassword(tabState.confirmPassword);
      if (confirmPwdError) nextErrors.confirmPassword = confirmPwdError;
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onPressUpdate = () => {
    if (!validate()) {
      const first = Object.values(errors || {})[0];
      if (first) showErrorToast(first, "Invalid");
      return;
    }

    const content =
      activeTab === TABS.profile
        ? "Are you sure you want to update your Profile password?"
        : `Are you sure you want to update the Account password for account number: ${tabState.accountNumber} (${tabState.accountType})?`;
    setConfirmText(content);
    setConfirmOpen(true);
  };

  const submit = async () => {
    setConfirmOpen(false);
    if (!validate()) return;

    const payload = {};
    if (activeTab === TABS.profile) {
      payload.email = currentEmail;
      payload.currentUserPassword = tabState.currentPassword;
      payload.newUserPassword = tabState.newPassword;
    } else {
      payload.accountNumber = tabState.accountNumber;
      payload.email = currentEmail;
      if (tabState.accountType === "master") {
        payload.masterPassword = tabState.newPassword;
      } else if (tabState.accountType === "investor") {
        payload.investorPassword = tabState.newPassword;
      }
    }

    const endpoint = `Users/${encodeURIComponent(currentEmail)}/update-passwords`;

    try {
      setSubmitting(true);
      const resp = await api.post(endpoint, payload);
      const msg =
        resp?.data?.message ||
        resp?.data?.data?.message ||
        "Password updated successfully.";
      showSuccessToast(msg);

      setFormState((prev) => ({
        ...prev,
        [activeTab]: { ...DEFAULT_FORM_STATE[activeTab] },
      }));
      setErrors({});

      // Many backends invalidate existing access tokens after a password change.
      // Logging out prevents the rest of the app from continuing with a now-invalid token
      // (which surfaces as 401s in other screens).
      try {
        const logout = useAuthStore.getState().logout;
        if (typeof logout === "function") await logout();
      } catch (_e) {}
      router.replace("/login");
    } catch (err) {
      const raw =
        err?.response?.data?.message || err?.message || "Unknown error";
      const msgs = String(raw)
        .split(/,(?![^\[]*\])/)
        .map((m) => m.trim())
        .filter(Boolean);

      (msgs.length ? msgs : [raw])
        .slice(0, 5)
        .forEach((m) => showErrorToast(m));
    } finally {
      setSubmitting(false);
    }
  };

  const accountLabel = useMemo(() => {
    if (!localSelectedAccount) return "Select account";
    const number =
      localSelectedAccount.accountNumber ?? localSelectedAccount.id ?? "—";
    const type =
      localSelectedAccount.accountTypeName ||
      localSelectedAccount.type ||
      localSelectedAccount.accountType ||
      "Account";
    return `${number} • ${type}`;
  }, [localSelectedAccount]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <StatusBar backgroundColor={theme.primary} barStyle="light-content" />

      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <AppIcon name="arrow-back" color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Password Settings</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => runRefresh()}
              tintColor={theme.primary}
            />
          }
        >
          <Text style={[styles.subtitle, { color: theme.secondary }]}>
            Manage your profile and account passwords securely.
          </Text>

          {/* Tabs */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              onPress={() => setActiveTab(TABS.profile)}
              style={[
                styles.tabChip,
                {
                  backgroundColor:
                    activeTab === TABS.profile
                      ? `${theme.primary}15`
                      : theme.card,
                  borderColor:
                    activeTab === TABS.profile ? theme.primary : theme.border,
                },
              ]}
            >
              <AppIcon
                name="person"
                color={
                  activeTab === TABS.profile ? theme.primary : theme.secondary
                }
                size={18}
              />
              <Text
                style={[
                  styles.tabChipText,
                  {
                    color:
                      activeTab === TABS.profile ? theme.primary : theme.text,
                  },
                ]}
              >
                Profile Password
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab(TABS.account)}
              style={[
                styles.tabChip,
                {
                  backgroundColor:
                    activeTab === TABS.account
                      ? `${theme.primary}15`
                      : theme.card,
                  borderColor:
                    activeTab === TABS.account ? theme.primary : theme.border,
                },
              ]}
            >
              <AppIcon
                name="vpn-key"
                color={
                  activeTab === TABS.account ? theme.primary : theme.secondary
                }
                size={18}
              />
              <Text
                style={[
                  styles.tabChipText,
                  {
                    color:
                      activeTab === TABS.account ? theme.primary : theme.text,
                  },
                ]}
              >
                Account Password
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          {activeTab === TABS.account ? (
            <>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Account
              </Text>
              <TouchableOpacity
                onPress={() => setAccountModalOpen(true)}
                style={[
                  styles.card,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <View style={styles.rowCenter}>
                  <AppIcon
                    name="account-balance-wallet"
                    color={theme.primary}
                    size={20}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.cardTitle, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      {tabState.accountNumber || accountLabel}
                    </Text>
                    <Text style={[styles.cardSub, { color: theme.secondary }]}>
                      Tap to change account
                    </Text>
                  </View>
                  <AppIcon
                    name="expand-more"
                    color={theme.secondary}
                    size={22}
                  />
                </View>
              </TouchableOpacity>
              {errors.accountNumber ? (
                <Text
                  style={[
                    styles.errorText,
                    { color: theme.error || "#ef4444" },
                  ]}
                >
                  {errors.accountNumber}
                </Text>
              ) : null}

              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.text, marginTop: 14 },
                ]}
              >
                Account Type
              </Text>
              <View style={styles.typeRow}>
                {[
                  { key: "master", label: "Master" },
                  { key: "investor", label: "Investor" },
                ].map((t) => {
                  const active = tabState.accountType === t.key;
                  return (
                    <TouchableOpacity
                      key={t.key}
                      onPress={() =>
                        setField(TABS.account, "accountType", t.key)
                      }
                      style={[
                        styles.typeChip,
                        {
                          backgroundColor: active
                            ? `${theme.primary}15`
                            : theme.card,
                          borderColor: active ? theme.primary : theme.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.typeChipText,
                          { color: active ? theme.primary : theme.text },
                        ]}
                      >
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {errors.accountType ? (
                <Text
                  style={[
                    styles.errorText,
                    { color: theme.error || "#ef4444" },
                  ]}
                >
                  {errors.accountType}
                </Text>
              ) : null}
            </>
          ) : (
            <>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Current Password
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <TextInput
                  ref={firstInputRef}
                  value={tabState.currentPassword}
                  onChangeText={(t) =>
                    setField(TABS.profile, "currentPassword", t)
                  }
                  placeholder="Enter current password"
                  placeholderTextColor={theme.secondary}
                  secureTextEntry={!tabState.showCurrent}
                  style={[styles.textInput, { color: theme.text }]}
                />
                <TouchableOpacity
                  onPress={() =>
                    setField(TABS.profile, "showCurrent", !tabState.showCurrent)
                  }
                >
                  <AppIcon
                    name={
                      tabState.showCurrent ? "visibility" : "visibility-off"
                    }
                    color={theme.secondary}
                    size={20}
                  />
                </TouchableOpacity>
              </View>
              {errors.currentPassword ? (
                <Text
                  style={[
                    styles.errorText,
                    { color: theme.error || "#ef4444" },
                  ]}
                >
                  {errors.currentPassword}
                </Text>
              ) : null}
            </>
          )}

          <Text
            style={[styles.sectionTitle, { color: theme.text, marginTop: 14 }]}
          >
            New Password
          </Text>
          <View
            style={[
              styles.inputWrap,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <TextInput
              ref={activeTab === TABS.account ? firstInputRef : null}
              value={tabState.newPassword}
              onChangeText={(t) => setField(activeTab, "newPassword", t)}
              placeholder="Enter new password"
              placeholderTextColor={theme.secondary}
              secureTextEntry={!tabState.showNew}
              style={[styles.textInput, { color: theme.text }]}
            />
            <TouchableOpacity
              onPress={() => setField(activeTab, "showNew", !tabState.showNew)}
            >
              <AppIcon
                name={tabState.showNew ? "visibility" : "visibility-off"}
                color={theme.secondary}
                size={20}
              />
            </TouchableOpacity>
          </View>
          {errors.newPassword ? (
            <Text
              style={[styles.errorText, { color: theme.error || "#ef4444" }]}
            >
              {errors.newPassword}
            </Text>
          ) : null}

          {/* Strength */}
          <View
            style={[styles.progressOuter, { backgroundColor: theme.border }]}
          >
            <View
              style={{
                height: 8,
                width: `${newPwdProgress.width}%`,
                backgroundColor: newPwdProgress.color,
                borderRadius: 999,
              }}
            />
          </View>
          <View style={{ marginTop: 10 }}>
            {passwordCriteria.map((c) => {
              const met = c.test(tabState.newPassword);
              return (
                <View key={c.label} style={styles.criteriaRow}>
                  <AppIcon
                    name={met ? "check-circle" : "radio-button-unchecked"}
                    color={met ? "#22c55e" : theme.secondary}
                    size={16}
                  />
                  <Text
                    style={[
                      styles.criteriaText,
                      { color: met ? theme.text : theme.secondary },
                    ]}
                  >
                    {c.label}
                  </Text>
                </View>
              );
            })}
          </View>

          <Text
            style={[styles.sectionTitle, { color: theme.text, marginTop: 14 }]}
          >
            Confirm Password
          </Text>
          <View
            style={[
              styles.inputWrap,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <TextInput
              value={tabState.confirmPassword}
              onChangeText={(t) => setField(activeTab, "confirmPassword", t)}
              placeholder="Re-enter new password"
              placeholderTextColor={theme.secondary}
              secureTextEntry={!tabState.showConfirm}
              style={[styles.textInput, { color: theme.text }]}
            />
            <TouchableOpacity
              onPress={() =>
                setField(activeTab, "showConfirm", !tabState.showConfirm)
              }
            >
              <AppIcon
                name={tabState.showConfirm ? "visibility" : "visibility-off"}
                color={theme.secondary}
                size={20}
              />
            </TouchableOpacity>
          </View>
          {errors.confirmPassword ? (
            <Text
              style={[styles.errorText, { color: theme.error || "#ef4444" }]}
            >
              {errors.confirmPassword}
            </Text>
          ) : null}

          <TouchableOpacity
            onPress={onPressUpdate}
            disabled={submitting}
            style={[
              styles.primaryButton,
              {
                backgroundColor: submitting ? theme.border : theme.primary,
              },
            ]}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Update Password</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <AccountSelectorModal
        visible={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
        accounts={accounts}
        sharedAccounts={sharedAccounts}
        fullName={fullName}
        selectedAccountId={localAccountId}
        onSelectAccount={(acc) => {
          const id = acc?.accountId ?? acc?.id;
          setLocalAccountId(id != null ? id : null);
          const acctNum = String(acc?.accountNumber || "");
          setField(TABS.account, "accountNumber", acctNum);
          setAccountModalOpen(false);
        }}
        onRefresh={() => {}}
      />

      <Modal
        visible={confirmOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Confirm
            </Text>
            <Text style={[styles.modalText, { color: theme.secondary }]}>
              {confirmText}
            </Text>

            <View style={styles.modalRow}>
              <TouchableOpacity
                onPress={() => setConfirmOpen(false)}
                style={[styles.modalBtn, { borderColor: theme.border }]}
              >
                <Text style={[styles.modalBtnText, { color: theme.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submit}
                style={[
                  styles.modalBtn,
                  {
                    backgroundColor: theme.primary,
                    borderColor: theme.primary,
                  },
                ]}
              >
                <Text style={[styles.modalBtnText, { color: "#fff" }]}>
                  Confirm
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: { marginRight: 16 },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 28,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 12,
    lineHeight: 16,
  },
  tabsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  tabChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: "800",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 8,
  },
  inputWrap: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  errorText: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "700",
  },
  progressOuter: {
    marginTop: 10,
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  criteriaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  criteriaText: {
    fontSize: 12,
    fontWeight: "600",
  },
  primaryButton: {
    marginTop: 18,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  rowCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  cardSub: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
  },
  typeRow: {
    flexDirection: "row",
    gap: 10,
  },
  typeChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 8,
  },
  modalText: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  modalRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  modalBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  modalBtnText: {
    fontSize: 13,
    fontWeight: "900",
  },
});
