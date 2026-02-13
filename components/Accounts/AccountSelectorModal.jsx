import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { FadeIn, FadeOut } from "react-native-reanimated";
import { createAccount, getAccountType } from "../../api/allServices";
import { addUserToProfile } from "../../api/auth";
import { useAppTheme } from "../../contexts/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import { isDemoAccount } from "../../utils/accountVisibility";
import {
  showErrorToast,
  showInfoToast,
  showSuccessToast,
} from "../../utils/toast";
import AppIcon from "../AppIcon";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

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
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const loginAction = useAuthStore((s) => s.login);
  const userEmail = useAuthStore((s) => s.userEmail);
  const upsertAccount = useAuthStore((s) => s.upsertAccount);

  const [pendingOwnerEmail, setPendingOwnerEmail] = useState(null);
  const owners = useMemo(() => {
    const currentUser = {
      id: "currentUser",
      name: fullName || "My Accounts",
      type: "primary",
    };
    const shared = (sharedAccounts || []).map((sharedAccount, idx) => {
      const owner = sharedAccount?.accountOwner ?? {};
      const ownerUserId = owner?.userId ?? owner?.id;
      const ownerEmail = owner?.email;
      const ownerKey = String(ownerUserId ?? ownerEmail ?? `shared-${idx}`);

      return {
        id: ownerKey,
        name: owner?.fullName ?? owner?.name ?? ownerEmail ?? "Shared Account",
        userId: ownerUserId != null ? String(ownerUserId) : null,
        email: ownerEmail != null ? String(ownerEmail) : null,
        type: "shared",
      };
    });
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

  // Create account modal state
  const [createAccountModalVisible, setCreateAccountModalVisible] =
    useState(false);
  const [accountTypesLoading, setAccountTypesLoading] = useState(false);
  const [accountTypesError, setAccountTypesError] = useState(null);
  const [accountTypes, setAccountTypes] = useState([]);
  const [selectedAccountTypeId, setSelectedAccountTypeId] = useState(null);
  const [confirmCreateVisible, setConfirmCreateVisible] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);

  // Switch-to-shared-profile login modal state
  const [switchModalVisible, setSwitchModalVisible] = useState(false);
  const [switchEmail, setSwitchEmail] = useState("");
  const [switchPassword, setSwitchPassword] = useState("");
  const [switchingProfile, setSwitchingProfile] = useState(false);

  // Animation values
  const slideAnim = useRef(new Animated.Value(500)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const cardScale = useRef(new Animated.Value(1)).current;

  const MIN_SHEET_HEIGHT = 440;
  const MAX_SHEET_HEIGHT = Math.max(
    MIN_SHEET_HEIGHT,
    Math.round(SCREEN_HEIGHT * 0.92),
  );
  const DEFAULT_SHEET_HEIGHT = Math.min(
    MAX_SHEET_HEIGHT,
    Math.max(MIN_SHEET_HEIGHT, Math.round(SCREEN_HEIGHT * 0.78)),
  );
  const [sheetHeight, setSheetHeight] = useState(DEFAULT_SHEET_HEIGHT);
  const sheetHeightRef = useRef(DEFAULT_SHEET_HEIGHT);
  const sheetHeightStartRef = useRef(DEFAULT_SHEET_HEIGHT);
  const rafRef = useRef(null);

  const clampSheetHeight = (h) =>
    Math.max(MIN_SHEET_HEIGHT, Math.min(MAX_SHEET_HEIGHT, h));

  const resizePanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, gesture) =>
          Math.abs(gesture.dy) > 2,
        onPanResponderGrant: () => {
          sheetHeightStartRef.current =
            sheetHeightRef.current || DEFAULT_SHEET_HEIGHT;
        },
        onPanResponderMove: (_evt, gesture) => {
          // drag up => increase height (dy negative)
          const next = clampSheetHeight(
            sheetHeightStartRef.current - gesture.dy,
          );

          // Avoid excessive re-renders while dragging
          if (rafRef.current) return;
          rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            setSheetHeight(next);
          });
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    sheetHeightRef.current = sheetHeight;
  }, [sheetHeight]);

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  // Ensure active owner stays valid when owners list changes
  useEffect(() => {
    if (!owners.find((o) => o.id === activeOwner)) {
      setActiveOwner(owners.length ? owners[0].id : "currentUser");
    }
  }, [owners, activeOwner]);

  // If we just added a user, try to auto-select them once they appear
  useEffect(() => {
    if (!pendingOwnerEmail) return;
    const next = owners.find(
      (o) =>
        o.email && o.email.toLowerCase() === pendingOwnerEmail.toLowerCase(),
    );
    if (next?.id) {
      setActiveOwner(next.id);
      setOwnersOpen(true);
      setPendingOwnerEmail(null);
    }
  }, [owners, pendingOwnerEmail]);

  // Animate modal on open/close
  useEffect(() => {
    if (visible) {
      setSheetHeight(DEFAULT_SHEET_HEIGHT);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 350,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 500,
          duration: 250,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const filteredAccounts = useMemo(() => {
    if (activeOwner === "currentUser") return accounts;
    const entry = (sharedAccounts || []).find(
      (s) =>
        String(
          s?.accountOwner?.userId ??
            s?.accountOwner?.id ??
            s?.accountOwner?.email ??
            "",
        ) === String(activeOwner),
    );
    return entry?.accounts ?? [];
  }, [activeOwner, accounts, sharedAccounts]);

  const liveAccounts = useMemo(
    () => (filteredAccounts || []).filter((a) => !isDemoAccount(a)),
    [filteredAccounts],
  );
  const demoAccounts = useMemo(
    () => (filteredAccounts || []).filter((a) => isDemoAccount(a)),
    [filteredAccounts],
  );

  const [accountTab, setAccountTab] = useState("live");

  const loadAccountTypes = async () => {
    setAccountTypesLoading(true);
    setAccountTypesError(null);
    try {
      const resp = await getAccountType();
      const payload = resp && resp.data ? resp.data : resp;
      const list = Array.isArray(payload) ? payload : [];
      const visible = list.filter(
        (t) =>
          t &&
          (t.visibility === true ||
            t.visibility === "true" ||
            t.visibility == null),
      );
      setAccountTypes(visible);
      return visible;
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load account types";
      setAccountTypesError(message);
      return [];
    } finally {
      setAccountTypesLoading(false);
    }
  };

  const filteredAccountTypes = useMemo(() => {
    const list = accountTypes || [];
    if (accountTab === "demo") {
      return list.filter((t) => t?.isDemo === true || t?.isDemo === "true");
    }
    // live
    return list.filter((t) => !(t?.isDemo === true || t?.isDemo === "true"));
  }, [accountTypes, accountTab]);

  const selectedAccountType = useMemo(() => {
    if (!selectedAccountTypeId) return null;
    return (
      (accountTypes || []).find(
        (t) => String(t?.id) === String(selectedAccountTypeId),
      ) || null
    );
  }, [accountTypes, selectedAccountTypeId]);

  const openCreateAccount = async () => {
    if (activeOwner !== "currentUser") {
      showInfoToast("Switch to your main profile to create an account.");
      return;
    }
    setSelectedAccountTypeId(null);
    setConfirmCreateVisible(false);
    setCreateAccountModalVisible(true);
    if (!accountTypesLoading && (accountTypes || []).length === 0) {
      await loadAccountTypes();
    }
  };

  const handleConfirmCreateAccount = async () => {
    if (!selectedAccountTypeId) {
      showErrorToast("Please select an account type.");
      return;
    }
    if (!userEmail) {
      showErrorToast("Missing user email. Please re-login.");
      return;
    }

    setCreatingAccount(true);
    try {
      const resp = await createAccount({
        accountTypeId: selectedAccountTypeId,
        email: userEmail,
      });

      const payload = resp?.data ?? resp ?? {};
      const created = payload?.account ?? payload?.newAccount ?? payload;

      // Best-effort: add to local store if an account object is returned
      if (created && (created.accountId != null || created.id != null)) {
        upsertAccount(created);
      }

      showSuccessToast("Account created successfully.");
      setConfirmCreateVisible(false);
      setCreateAccountModalVisible(false);

      // Refresh the profile (if server returns accounts it will sync)
      if (typeof onRefresh === "function") {
        try {
          await onRefresh();
        } catch (_e) {}
      } else {
        try {
          await refreshProfile();
        } catch (_e) {}
      }
    } catch (err) {
      const raw =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to create account";
      showErrorToast(String(raw));
    } finally {
      setCreatingAccount(false);
    }
  };

  // If the current tab has no items for the selected owner,
  // switch to the other tab when possible.
  useEffect(() => {
    if (
      accountTab === "live" &&
      liveAccounts.length === 0 &&
      demoAccounts.length > 0
    ) {
      setAccountTab("demo");
    }
    if (
      accountTab === "demo" &&
      demoAccounts.length === 0 &&
      liveAccounts.length > 0
    ) {
      setAccountTab("live");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOwner, liveAccounts.length, demoAccounts.length]);

  const tabbedAccounts = accountTab === "demo" ? demoAccounts : liveAccounts;

  const handleCardPressIn = () => {
    Animated.spring(cardScale, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const handleCardPressOut = () => {
    Animated.spring(cardScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const openSwitchProfileModal = (owner) => {
    const email = owner?.email;
    if (!email) {
      showInfoToast(
        "This shared profile is missing an email. Please add/re-invite it.",
        "Cannot switch",
      );
      return;
    }

    setOwnersOpen(false);
    setSwitchEmail(String(email));
    setSwitchPassword("");
    setSwitchModalVisible(true);
  };

  const handleSwitchProfileLogin = async () => {
    if (!switchEmail || !switchPassword) {
      showInfoToast("Please enter password to continue.", "Missing fields");
      return;
    }

    setSwitchingProfile(true);
    try {
      const res = await loginAction({
        email: switchEmail,
        password: switchPassword,
      });
      if (!res?.success) {
        showErrorToast(res?.error || "Login failed", "Switch failed");
        return;
      }

      setSwitchModalVisible(false);
      setSwitchPassword("");

      try {
        await onRefresh?.();
      } catch {}
      try {
        onClose?.();
      } catch {}

      showSuccessToast("Switched to shared profile.", "Success");
    } catch (err) {
      const message =
        err?.response?.data?.message || err?.message || "Login failed";
      showErrorToast(String(message), "Switch failed");
    } finally {
      setSwitchingProfile(false);
    }
  };

  const handleAddUser = async () => {
    if (!userId) {
      showErrorToast(
        "Unable to determine current user. Please login again.",
        "Not signed in",
      );
      return;
    }

    if (!addEmail || !addPassword) {
      showInfoToast("Please enter email and password.", "Missing fields");
      return;
    }

    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addEmail);
    if (!emailValid) {
      showInfoToast("Please enter a valid email address.", "Invalid Email");
      return;
    }
    if (addPassword.length < 6) {
      showInfoToast("Password must be at least 6 characters.", "Weak Password");
      return;
    }

    setAddingUser(true);
    try {
      const result = await addUserToProfile(userId, addEmail, addPassword);
      setAddUserModalVisible(false);

      try {
        await refreshProfile?.();
      } catch {}
      try {
        await onRefresh?.();
      } catch {}

      setPendingOwnerEmail(addEmail);
      setAddEmail("");
      setAddPassword("");
      showSuccessToast("User added to profile.", "Success");
    } catch (err) {
      const resp = err?.response?.data;
      const message =
        resp?.message ||
        (resp ? JSON.stringify(resp) : err?.message) ||
        "Failed to add user.";
      showErrorToast(String(message));
    } finally {
      setAddingUser(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
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
            shadowColor: theme.shadow,
            height: sheetHeight,
            maxHeight: MAX_SHEET_HEIGHT,
            transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
          },
        ]}
      >
        {/* Drag handle with enhanced visual */}
        <View style={styles.handleWrapper}>
          <View
            style={styles.handleContainer}
            {...resizePanResponder.panHandlers}
          >
            <View
              style={[
                styles.handle,
                { backgroundColor: theme.secondary + "40" },
              ]}
            />
          </View>
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

            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={openCreateAccount}
                style={[
                  styles.iconButton,
                  {
                    backgroundColor: theme.primary + "10",
                    borderWidth: 1,
                    borderColor: theme.primary + "20",
                    opacity: activeOwner === "currentUser" ? 1 : 0.5,
                  },
                ]}
                activeOpacity={0.6}
                disabled={activeOwner !== "currentUser"}
              >
                <AppIcon
                  name="add-circle-outline"
                  size={20}
                  color={theme.primary}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setAddUserModalVisible(true)}
                style={[
                  styles.iconButton,
                  {
                    backgroundColor: theme.primary + "10",
                    borderWidth: 1,
                    borderColor: theme.primary + "20",
                  },
                ]}
                activeOpacity={0.6}
              >
                <AppIcon name="person-add" size={20} color={theme.primary} />
                <View style={styles.buttonBadge}>
                  <AppIcon name="add" size={8} color="#fff" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onClose}
                style={[
                  styles.iconButton,
                  {
                    backgroundColor: theme.card,
                    borderWidth: 1,
                    borderColor: theme.border,
                  },
                ]}
                activeOpacity={0.6}
              >
                <AppIcon name="close" size={20} color={theme.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Owner Dropdown with enhanced design */}
          <View style={styles.blockSpacing}>
            <View style={styles.labelRow}>
              <View style={styles.labelContainer}>
                <View
                  style={[
                    styles.labelIcon,
                    { backgroundColor: theme.primary + "15" },
                  ]}
                >
                  <AppIcon name="people" size={12} color={theme.primary} />
                </View>
                <Text
                  style={[
                    styles.label,
                    styles.labelTight,
                    { color: theme.secondary },
                  ]}
                >
                  Profile Owner
                </Text>
              </View>
              <Text
                style={[styles.labelHint, { color: theme.secondary + "70" }]}
              >
                Tap to switch
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setOwnersOpen((s) => !s)}
              style={[
                styles.dropdown,
                {
                  backgroundColor: theme.card,
                  borderColor: ownersOpen ? theme.primary : theme.border + "80",
                  shadowColor: theme.shadow,
                },
              ]}
              activeOpacity={0.7}
            >
              <View style={styles.rowCenter}>
                <View
                  style={[
                    styles.ownerAvatar,
                    {
                      backgroundColor: theme.primary + "08",
                      borderWidth: 1.5,
                      borderColor: theme.primary + "20",
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.ownerAvatarInner,
                      { backgroundColor: theme.primary + "15" },
                    ]}
                  >
                    <AppIcon name="person" size={18} color={theme.primary} />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.dropdownText, { color: theme.text }]}>
                    {owners.find((p) => p.id === activeOwner)?.name ??
                      "Select Owner"}
                  </Text>
                  <Text
                    style={[styles.dropdownSubtext, { color: theme.secondary }]}
                  >
                    {liveAccounts.length} live • {demoAccounts.length} demo
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.dropdownArrow,
                  {
                    backgroundColor: ownersOpen
                      ? theme.primary + "10"
                      : theme.background,
                    transform: [{ rotate: ownersOpen ? "180deg" : "0deg" }],
                  },
                ]}
              >
                <AppIcon
                  name="keyboard-arrow-down"
                  size={20}
                  color={theme.primary}
                />
              </View>
            </TouchableOpacity>
            {ownersOpen && (
              <Animated.View
                style={[
                  styles.dropdownList,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.primary + "20",
                    shadowColor: theme.shadow,
                  },
                ]}
                entering={FadeIn.duration(200).springify()}
                exiting={FadeOut.duration(150)}
              >
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  style={{ maxHeight: 200 }}
                  nestedScrollEnabled
                >
                  {owners.map((p, index) => (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => {
                        if (p.id === "currentUser") {
                          setActiveOwner(p.id);
                          setOwnersOpen(false);
                          return;
                        }
                        openSwitchProfileModal(p);
                      }}
                      style={[
                        styles.dropdownItem,
                        {
                          backgroundColor:
                            activeOwner === p.id
                              ? theme.primary + "08"
                              : "transparent",
                          borderBottomWidth:
                            index === owners.length - 1 ? 0 : 1,
                          borderBottomColor: theme.border + "30",
                        },
                      ]}
                      activeOpacity={0.6}
                    >
                      <View style={styles.rowCenter}>
                        <View
                          style={[
                            styles.ownerAvatarSmall,
                            {
                              backgroundColor:
                                p.type === "primary"
                                  ? theme.primary + "15"
                                  : theme.secondary + "15",
                              borderWidth: 1,
                              borderColor:
                                p.type === "primary"
                                  ? theme.primary + "30"
                                  : theme.secondary + "30",
                            },
                          ]}
                        >
                          <AppIcon
                            name={p.type === "primary" ? "person" : "people"}
                            size={14}
                            color={
                              p.type === "primary"
                                ? theme.primary
                                : theme.secondary
                            }
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.dropdownItemText,
                              {
                                color:
                                  activeOwner === p.id
                                    ? theme.primary
                                    : theme.text,
                                fontWeight:
                                  activeOwner === p.id ? "700" : "500",
                              },
                            ]}
                          >
                            {p.name}
                          </Text>
                          <Text
                            style={[
                              styles.dropdownItemSubtext,
                              { color: theme.secondary },
                            ]}
                          >
                            {p.id === "currentUser"
                              ? "Your personal accounts"
                              : "Shared access accounts"}
                          </Text>
                        </View>
                        {activeOwner === p.id ? (
                          <View
                            style={[
                              styles.selectedIndicator,
                              { backgroundColor: theme.primary },
                            ]}
                          >
                            <AppIcon name="check" size={12} color="#fff" />
                          </View>
                        ) : (
                          <AppIcon
                            name="chevron-right"
                            size={16}
                            color={theme.secondary + "40"}
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </Animated.View>
            )}
          </View>
        </View>

        {/* Accounts List with enhanced cards */}
        <View style={styles.listContainer}>
          {/* Live / Demo tabs */}
          <View
            style={{
              flexDirection: "row",
              gap: 10,
              marginBottom: 14,
            }}
          >
            <TouchableOpacity
              onPress={() => setAccountTab("live")}
              activeOpacity={0.8}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 999,
                borderWidth: 1,
                borderColor:
                  accountTab === "live" ? theme.primary : theme.border,
                backgroundColor:
                  accountTab === "live" ? theme.primary + "12" : theme.card,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "800",
                  color:
                    accountTab === "live" ? theme.primary : theme.secondary,
                }}
              >
                Live ({liveAccounts.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setAccountTab("demo")}
              activeOpacity={0.8}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 999,
                borderWidth: 1,
                borderColor:
                  accountTab === "demo" ? theme.secondary : theme.border,
                backgroundColor:
                  accountTab === "demo" ? theme.secondary + "12" : theme.card,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "800",
                  color:
                    accountTab === "demo" ? theme.secondary : theme.secondary,
                }}
              >
                Demo ({demoAccounts.length})
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.listHeader}>
            <View style={styles.labelContainer}>
              <View
                style={[
                  styles.labelIcon,
                  { backgroundColor: theme.primary + "15" },
                ]}
              >
                <AppIcon
                  name="account-balance-wallet"
                  size={12}
                  color={theme.primary}
                />
              </View>
              <Text style={[styles.label, { color: theme.secondary }]}>
                {accountTab === "demo" ? "Demo Accounts" : "Live Accounts"}
              </Text>
            </View>
            <View
              style={[
                styles.accountCountBadge,
                {
                  backgroundColor: theme.primary + "10",
                  borderWidth: 1,
                  borderColor: theme.primary + "20",
                },
              ]}
            >
              <Text style={[styles.accountCountText, { color: theme.primary }]}>
                {tabbedAccounts.length}
              </Text>
            </View>
          </View>

          {tabbedAccounts.length === 0 ? (
            <Animated.View
              style={styles.emptyState}
              entering={FadeIn.duration(400)}
            >
              <View
                style={[
                  styles.emptyIcon,
                  {
                    backgroundColor: theme.primary + "08",
                    borderWidth: 1.5,
                    borderColor: theme.primary + "15",
                  },
                ]}
              >
                <AppIcon
                  name="account-balance-wallet"
                  size={36}
                  color={theme.primary}
                />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                No Accounts Found
              </Text>
              <Text style={[styles.emptyText, { color: theme.secondary }]}>
                {accountTab === "demo"
                  ? "No demo accounts available for this profile"
                  : activeOwner === "currentUser"
                    ? "You haven't added any live accounts yet"
                    : "No shared live accounts available for this profile"}
              </Text>
            </Animated.View>
          ) : (
            <FlatList
              data={tabbedAccounts}
              keyExtractor={(i) => String(i.accountId ?? i.id)}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 30, paddingTop: 8 }}
              removeClippedSubviews
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={7}
              renderItem={({ item, index }) => (
                <Animated.View
                  entering={FadeIn.delay(index * 60)
                    .duration(350)
                    .springify()}
                >
                  <TouchableOpacity
                    key={String(item.accountId ?? item.id ?? index)}
                    onPress={() => {
                      onSelectAccount && onSelectAccount(item);
                      setTimeout(() => {
                        onRefresh && onRefresh();
                      }, 100);
                      onClose && onClose();
                    }}
                    onPressIn={handleCardPressIn}
                    onPressOut={handleCardPressOut}
                    activeOpacity={0.9}
                    style={[
                      styles.accountCard,
                      {
                        borderStyle: isDemoAccount(item) ? "dashed" : "solid",
                        backgroundColor:
                          (item.accountId ?? item.id) === selectedAccountId
                            ? theme.primary + "08"
                            : isDemoAccount(item)
                              ? theme.secondary + "08"
                              : theme.card,
                        borderColor:
                          (item.accountId ?? item.id) === selectedAccountId
                            ? theme.primary + "40"
                            : isDemoAccount(item)
                              ? theme.secondary + "55"
                              : theme.border + "80",
                        shadowColor: theme.shadow,
                        transform: [{ scale: cardScale }],
                      },
                    ]}
                  >
                    <View style={styles.accountInfoRow}>
                      <View
                        style={[
                          styles.accountAvatar,
                          {
                            backgroundColor:
                              (item.accountId ?? item.id) === selectedAccountId
                                ? theme.primary + "15"
                                : isDemoAccount(item)
                                  ? theme.secondary + "12"
                                  : theme.primary + "08",
                            borderWidth: 1.5,
                            borderColor:
                              (item.accountId ?? item.id) === selectedAccountId
                                ? theme.primary + "30"
                                : isDemoAccount(item)
                                  ? theme.secondary + "35"
                                  : theme.primary + "15",
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
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 10,
                          }}
                        >
                          <Text
                            style={[
                              styles.accountNumber,
                              { color: theme.text },
                            ]}
                          >
                            {item.accountNumber ?? item.id}
                          </Text>
                          <View
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 4,
                              borderRadius: 999,
                              borderWidth: 1,
                              borderColor: isDemoAccount(item)
                                ? theme.secondary + "55"
                                : theme.primary + "55",
                              backgroundColor: isDemoAccount(item)
                                ? theme.secondary + "12"
                                : theme.primary + "12",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: "800",
                                letterSpacing: 0.6,
                                color: isDemoAccount(item)
                                  ? theme.secondary
                                  : theme.primary,
                              }}
                            >
                              {isDemoAccount(item) ? "DEMO" : "LIVE"}
                            </Text>
                          </View>
                        </View>
                        <Text
                          style={[
                            styles.accountMeta,
                            { color: theme.secondary },
                          ]}
                          numberOfLines={1}
                        >
                          {item.accountTypeName ?? item.type ?? "Account"}
                          {item.accountName ? ` • ${item.accountName}` : ""}
                        </Text>
                        {(item.balance != null || item.currency) && (
                          <Text
                            style={[
                              styles.accountBalance,
                              { color: theme.text },
                            ]}
                          >
                            <Text
                              style={{
                                fontWeight: "700",
                                color: theme.primary,
                              }}
                            >
                              {item.balance != null
                                ? item.balance.toLocaleString()
                                : "-"}
                            </Text>
                            <Text style={{ color: theme.secondary }}>
                              {" "}
                              {item.currency ?? ""}
                            </Text>
                          </Text>
                        )}
                      </View>
                    </View>
                    {(item.accountId ?? item.id) === selectedAccountId ? (
                      <View
                        style={[
                          styles.checkIcon,
                          {
                            backgroundColor: theme.primary,
                            shadowColor: theme.primary,
                          },
                        ]}
                      >
                        <AppIcon name="check" size={16} color="#fff" />
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.chevronContainer,
                          { backgroundColor: theme.background },
                        ]}
                      >
                        <AppIcon
                          name="chevron-right"
                          size={18}
                          color={theme.secondary + "50"}
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              )}
            />
          )}
        </View>
      </Animated.View>

      {/* Create Account Modal */}
      <Modal
        visible={createAccountModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!creatingAccount) setCreateAccountModalVisible(false);
        }}
      >
        <TouchableOpacity
          style={styles.backdrop}
          onPress={() => {
            if (!creatingAccount) setCreateAccountModalVisible(false);
          }}
          activeOpacity={1}
        >
          <View style={styles.backdropInner} />
        </TouchableOpacity>

        <View
          style={[
            styles.createModalBox,
            {
              backgroundColor: theme.background,
              borderColor: theme.border,
              shadowColor: theme.shadow,
            },
          ]}
        >
          <View style={styles.createModalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.createModalTitle, { color: theme.text }]}>
                Create {accountTab === "demo" ? "Demo" : "Live"} Account
              </Text>
              <Text
                style={[styles.createModalSubtitle, { color: theme.secondary }]}
              >
                Select an account type to open
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                if (!creatingAccount) setCreateAccountModalVisible(false);
              }}
              style={[
                styles.iconButton,
                {
                  backgroundColor: theme.card,
                  borderWidth: 1,
                  borderColor: theme.border,
                },
              ]}
              activeOpacity={0.7}
              disabled={creatingAccount}
            >
              <AppIcon name="close" size={20} color={theme.text} />
            </TouchableOpacity>
          </View>

          {accountTypesLoading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator color={theme.primary} />
              <Text style={{ color: theme.secondary, marginTop: 10 }}>
                Loading account types...
              </Text>
            </View>
          ) : accountTypesError ? (
            <View style={styles.centerBox}>
              <Text style={{ color: theme.secondary, textAlign: "center" }}>
                {String(accountTypesError)}
              </Text>
              <TouchableOpacity
                onPress={loadAccountTypes}
                style={[
                  styles.retryButton,
                  {
                    backgroundColor: theme.primary + "10",
                    borderColor: theme.primary + "30",
                  },
                ]}
                activeOpacity={0.8}
              >
                <AppIcon name="refresh" size={18} color={theme.primary} />
                <Text style={{ color: theme.primary, fontWeight: "700" }}>
                  Retry
                </Text>
              </TouchableOpacity>
            </View>
          ) : filteredAccountTypes.length === 0 ? (
            <View style={styles.centerBox}>
              <Text style={{ color: theme.secondary, textAlign: "center" }}>
                No {accountTab === "demo" ? "demo" : "live"} account types
                available.
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.typeScrollContent}
            >
              {filteredAccountTypes.map((t) => {
                const id = t?.id;
                const name = t?.accountName || t?.name || "Account";
                const desc = t?.description || "";
                const selected = String(selectedAccountTypeId) === String(id);
                return (
                  <TouchableOpacity
                    key={String(id)}
                    onPress={() => setSelectedAccountTypeId(id)}
                    style={[
                      styles.typeCard,
                      {
                        backgroundColor: selected
                          ? theme.primary + "12"
                          : theme.card,
                        borderColor: selected ? theme.primary : theme.border,
                      },
                    ]}
                    activeOpacity={0.8}
                  >
                    <View style={styles.typeCardTop}>
                      <Text
                        style={[styles.typeCardTitle, { color: theme.text }]}
                        numberOfLines={1}
                      >
                        {name}
                      </Text>
                      {selected ? (
                        <View
                          style={[
                            styles.typeSelectedDot,
                            { backgroundColor: theme.primary },
                          ]}
                        >
                          <AppIcon name="check" size={14} color="#fff" />
                        </View>
                      ) : null}
                    </View>
                    {desc ? (
                      <Text
                        style={[
                          styles.typeCardDesc,
                          { color: theme.secondary },
                        ]}
                        numberOfLines={2}
                      >
                        {desc}
                      </Text>
                    ) : (
                      <Text
                        style={[
                          styles.typeCardDesc,
                          { color: theme.secondary },
                        ]}
                        numberOfLines={2}
                      >
                        Tap to select
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <View style={styles.createModalFooter}>
            <TouchableOpacity
              onPress={() => setConfirmCreateVisible(true)}
              style={[
                styles.createPrimaryButton,
                {
                  backgroundColor: selectedAccountTypeId
                    ? theme.primary
                    : theme.border,
                },
              ]}
              activeOpacity={0.85}
              disabled={!selectedAccountTypeId || creatingAccount}
            >
              <Text style={{ color: "#fff", fontWeight: "800" }}>
                Create Account
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Confirm Create */}
        <Modal
          visible={confirmCreateVisible}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!creatingAccount) setConfirmCreateVisible(false);
          }}
        >
          <TouchableOpacity
            style={styles.backdrop}
            onPress={() => {
              if (!creatingAccount) setConfirmCreateVisible(false);
            }}
            activeOpacity={1}
          >
            <View style={styles.backdropInner} />
          </TouchableOpacity>
          <View
            style={[
              styles.confirmBox,
              {
                backgroundColor: theme.background,
                borderColor: theme.border,
                shadowColor: theme.shadow,
              },
            ]}
          >
            <Text style={[styles.confirmTitle, { color: theme.text }]}>
              Confirm account creation
            </Text>
            <Text style={{ color: theme.secondary, marginTop: 8 }}>
              Create a {accountTab === "demo" ? "demo" : "live"} account of type{" "}
              <Text style={{ color: theme.primary, fontWeight: "800" }}>
                {selectedAccountType?.accountName ||
                  selectedAccountType?.name ||
                  ""}
              </Text>
              ?
            </Text>

            <View style={styles.confirmButtons}>
              <TouchableOpacity
                onPress={() => setConfirmCreateVisible(false)}
                style={[
                  styles.modalButton,
                  styles.modalButtonSecondary,
                  {
                    backgroundColor: theme.card,
                    borderWidth: 1.5,
                    borderColor: theme.border,
                  },
                ]}
                activeOpacity={0.8}
                disabled={creatingAccount}
              >
                <Text style={{ color: theme.secondary, fontWeight: "700" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmCreateAccount}
                style={[
                  styles.modalButton,
                  styles.modalButtonPrimary,
                  {
                    backgroundColor: theme.primary,
                    shadowColor: theme.primary,
                  },
                ]}
                activeOpacity={0.85}
                disabled={creatingAccount}
              >
                {creatingAccount ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "800" }}>
                    Yes, Create
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </Modal>

      {/* Enhanced Add User Modal */}
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
          entering={FadeIn.duration(400).springify()}
          exiting={FadeOut.duration(200)}
        >
          <View style={styles.addModalHeader}>
            <View
              style={[
                styles.addModalIcon,
                {
                  backgroundColor: theme.primary + "08",
                  borderWidth: 1.5,
                  borderColor: theme.primary + "20",
                },
              ]}
            >
              <AppIcon name="person-add" size={28} color={theme.primary} />
            </View>
            <Text style={[styles.addModalTitle, { color: theme.text }]}>
              Add User To Profile
            </Text>
            <Text style={[styles.addModalSubtitle, { color: theme.secondary }]}>
              Share access to your accounts securely
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputLabelRow}>
              <AppIcon name="email" size={14} color={theme.secondary} />
              <Text style={[styles.inputLabel, { color: theme.secondary }]}>
                Email Address
              </Text>
            </View>
            <TextInput
              value={addEmail}
              onChangeText={setAddEmail}
              placeholder="user@example.com"
              placeholderTextColor={theme.secondary + "50"}
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
            <View style={styles.inputLabelRow}>
              <AppIcon name="lock" size={14} color={theme.secondary} />
              <Text style={[styles.inputLabel, { color: theme.secondary }]}>
                Password
              </Text>
            </View>
            <TextInput
              value={addPassword}
              onChangeText={setAddPassword}
              placeholder="Enter temporary password"
              placeholderTextColor={theme.secondary + "50"}
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
            <Text style={[styles.inputHint, { color: theme.secondary + "70" }]}>
              Minimum 6 characters
            </Text>
          </View>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              gap: 12,
              marginTop: 28,
            }}
          >
            <TouchableOpacity
              onPress={() => setAddUserModalVisible(false)}
              style={[
                styles.modalButton,
                styles.modalButtonSecondary,
                {
                  backgroundColor: theme.card,
                  borderWidth: 1.5,
                  borderColor: theme.border,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text style={{ color: theme.secondary, fontWeight: "600" }}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleAddUser}
              style={[
                styles.modalButton,
                styles.modalButtonPrimary,
                {
                  backgroundColor: theme.primary,
                  shadowColor: theme.primary,
                },
              ]}
              activeOpacity={0.8}
              disabled={addingUser}
            >
              {addingUser ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={{ color: "#fff", fontWeight: "700" }}>
                    Add User
                  </Text>
                  <AppIcon
                    name="arrow-forward"
                    size={16}
                    color="#fff"
                    style={{ marginLeft: 6 }}
                  />
                </>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Modal>

      {/* Enhanced Switch Profile Login Modal */}
      <Modal visible={switchModalVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.backdrop}
          onPress={() => {
            if (!switchingProfile) setSwitchModalVisible(false);
          }}
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
          entering={FadeIn.duration(400).springify()}
          exiting={FadeOut.duration(200)}
        >
          <View style={styles.addModalHeader}>
            <View
              style={[
                styles.addModalIcon,
                {
                  backgroundColor: theme.primary + "08",
                  borderWidth: 1.5,
                  borderColor: theme.primary + "20",
                },
              ]}
            >
              <AppIcon name="lock" size={28} color={theme.primary} />
            </View>
            <Text style={[styles.addModalTitle, { color: theme.text }]}>
              Switch Profile
            </Text>
            <Text style={[styles.addModalSubtitle, { color: theme.secondary }]}>
              Enter password to access shared profile
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputLabelRow}>
              <AppIcon name="email" size={14} color={theme.secondary} />
              <Text style={[styles.inputLabel, { color: theme.secondary }]}>
                Email
              </Text>
            </View>
            <TextInput
              value={switchEmail}
              editable={false}
              selectTextOnFocus
              style={[
                styles.modalInput,
                {
                  color: theme.secondary,
                  borderColor: theme.border,
                  backgroundColor: theme.card + "80",
                  opacity: 0.8,
                },
              ]}
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputLabelRow}>
              <AppIcon name="lock" size={14} color={theme.secondary} />
              <Text style={[styles.inputLabel, { color: theme.secondary }]}>
                Password
              </Text>
            </View>
            <TextInput
              value={switchPassword}
              onChangeText={setSwitchPassword}
              placeholder="Enter password"
              placeholderTextColor={theme.secondary + "50"}
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
          </View>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              gap: 12,
              marginTop: 28,
            }}
          >
            <TouchableOpacity
              onPress={() => setSwitchModalVisible(false)}
              style={[
                styles.modalButton,
                styles.modalButtonSecondary,
                {
                  backgroundColor: theme.card,
                  borderWidth: 1.5,
                  borderColor: theme.border,
                },
              ]}
              activeOpacity={0.7}
              disabled={switchingProfile}
            >
              <Text style={{ color: theme.secondary, fontWeight: "600" }}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSwitchProfileLogin}
              style={[
                styles.modalButton,
                styles.modalButtonPrimary,
                {
                  backgroundColor: theme.primary,
                  shadowColor: theme.primary,
                },
              ]}
              activeOpacity={0.8}
              disabled={switchingProfile}
            >
              {switchingProfile ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={{ color: "#fff", fontWeight: "700" }}>
                    Login
                  </Text>
                  <AppIcon
                    name="login"
                    size={16}
                    color="#fff"
                    style={{ marginLeft: 6 }}
                  />
                </>
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
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    height: 580,
    maxHeight: "85%",
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 30,
    overflow: "hidden",
  },
  handleWrapper: {
    alignItems: "center",
    marginBottom: 20,
    paddingVertical: 8,
  },
  handleContainer: {
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.8,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
    fontWeight: "500",
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  buttonBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FF6B6B",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  blockSpacing: {
    marginBottom: 24,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  labelIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  labelHint: {
    fontSize: 11,
    fontWeight: "600",
    opacity: 0.7,
  },
  labelTight: {
    marginBottom: 0,
  },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 18,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  rowCenter: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  ownerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  ownerAvatarInner: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  ownerAvatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  dropdownText: {
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 2,
  },
  dropdownSubtext: {
    fontSize: 13,
    opacity: 0.7,
    fontWeight: "500",
  },
  dropdownArrow: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  dropdownList: {
    marginTop: 10,
    borderRadius: 18,
    borderWidth: 2,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
    maxHeight: 220,
  },
  dropdownItem: {
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  dropdownItemText: {
    fontSize: 15,
    marginBottom: 2,
  },
  dropdownItemSubtext: {
    fontSize: 12,
    opacity: 0.6,
  },
  selectedIndicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  listContainer: {
    flex: 1,
    marginTop: 8,
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  accountCountBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  accountCountText: {
    fontSize: 13,
    fontWeight: "800",
  },
  accountCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    borderRadius: 11,
    marginBottom: 14,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  accountInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  accountAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  accountNumber: {
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 4,
  },
  accountMeta: {
    fontSize: 13,
    opacity: 0.8,
    marginBottom: 6,
    fontWeight: "500",
  },
  accountBalance: {
    fontSize: 15,
    fontWeight: "600",
  },
  checkIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  chevronContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  emptyText: {
    fontSize: 15,
    textAlign: "center",
    paddingHorizontal: 40,
    lineHeight: 22,
    opacity: 0.7,
    fontWeight: "500",
  },
  addModalBox: {
    position: "absolute",
    left: 20,
    right: 20,
    top: "30%",
    borderRadius: 24,
    padding: 28,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 25,
    maxWidth: 400,
    alignSelf: "center",
  },
  createModalBox: {
    position: "absolute",
    left: 18,
    right: 18,
    top: "18%",
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 18,
  },
  createModalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },
  createModalTitle: {
    fontSize: 18,
    fontWeight: "900",
  },
  createModalSubtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  centerBox: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  retryButton: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  typeScrollContent: {
    gap: 12,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  typeCard: {
    width: Math.max(170, Math.round(SCREEN_WIDTH * 0.46)),
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
  },
  typeCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 8,
  },
  typeCardTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "900",
  },
  typeCardDesc: {
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.9,
  },
  typeSelectedDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  createModalFooter: {
    marginTop: 16,
  },
  createPrimaryButton: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBox: {
    position: "absolute",
    left: 18,
    right: 18,
    top: "35%",
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 20,
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  confirmButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 18,
  },
  addModalHeader: {
    alignItems: "center",
    marginBottom: 28,
  },
  addModalIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  addModalTitle: {
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  addModalSubtitle: {
    fontSize: 14,
    textAlign: "center",
    opacity: 0.7,
    fontWeight: "500",
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  modalInput: {
    borderWidth: 2,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    fontWeight: "500",
  },
  inputHint: {
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
    fontWeight: "500",
  },
  modalButton: {
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 100,
    flexDirection: "row",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  modalButtonPrimary: {
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
});
