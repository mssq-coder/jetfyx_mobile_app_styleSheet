import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AccountSelectorModal from "../../components/Accounts/AccountSelectorModal";
import AppIcon from "../../components/AppIcon";
import { useAppTheme } from "../../contexts/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import {
  showErrorToast,
  showInfoToast,
  showSuccessToast,
} from "../../utils/toast";

import usePullToRefresh from "../../hooks/usePullToRefresh";

import {
  followCopyTrade,
  getCopyTradingStrategies,
  getFollowing,
  normalizeStrategyList,
  unfollowCopyTrade,
} from "../../api/copyTrade";

const DEFAULT_PAGE_SIZE = 25;

const safeNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const formatCurrency = (v) => {
  const n = safeNum(v);
  return `$${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

function SegmentedTabs({ tabs, activeKey, onChange, theme }) {
  return (
    <View
      style={[
        styles.segment,
        { backgroundColor: theme.background, borderColor: theme.border },
      ]}
    >
      {tabs.map((t) => {
        const active = t.key === activeKey;
        return (
          <TouchableOpacity
            key={t.key}
            onPress={() => onChange?.(t.key)}
            style={[
              styles.segmentBtn,
              {
                backgroundColor: active ? `${theme.primary}18` : "transparent",
                borderColor: active ? theme.primary : "transparent",
              },
            ]}
            activeOpacity={0.85}
          >
            <AppIcon
              name={t.icon}
              size={18}
              color={active ? theme.primary : theme.secondary}
            />
            <Text
              style={[
                styles.segmentText,
                { color: active ? theme.primary : theme.text },
              ]}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function FollowModal({
  visible,
  onClose,
  strategy,
  onConfirm,
  loading,
  theme,
}) {
  const allowedTypes = useMemo(() => {
    const raw =
      strategy?.allowedCopyTradeType ||
      strategy?.allowedCopyTypes ||
      strategy?.allowedCopyTypesCsv ||
      [];

    if (Array.isArray(raw)) return raw.filter(Boolean);
    const s = String(raw || "").trim();
    if (!s) return [];
    return s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }, [strategy]);

  const [copyType, setCopyType] = useState(allowedTypes[0] || "");
  const [lotSize, setLotSize] = useState("");
  const [multiplier, setMultiplier] = useState("");
  const [gap, setGap] = useState("");

  useEffect(() => {
    if (visible) {
      setCopyType(allowedTypes[0] || "");
      setLotSize("");
      setMultiplier("");
      setGap("");
    }
  }, [visible, allowedTypes]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalBackdrop}>
        <TouchableOpacity
          style={styles.modalBackdropInner}
          onPress={onClose}
          activeOpacity={1}
        />

        <View
          style={[
            styles.modalCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Copy Trade Settings
              </Text>
              <Text
                style={[styles.modalSub, { color: theme.secondary }]}
                numberOfLines={1}
              >
                {strategy?.strategyName || strategy?.name || "Strategy"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.iconBtn, { backgroundColor: theme.background }]}
            >
              <AppIcon name="close" size={18} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 420 }}>
            <Text style={[styles.label, { color: theme.secondary }]}>
              Copy Type
            </Text>

            {allowedTypes.length > 0 ? (
              <View style={{ gap: 10 }}>
                {allowedTypes.map((t) => {
                  const active = String(copyType) === String(t);
                  return (
                    <TouchableOpacity
                      key={String(t)}
                      onPress={() => setCopyType(String(t))}
                      style={[
                        styles.radioRow,
                        {
                          borderColor: active ? theme.primary : theme.border,
                          backgroundColor: active
                            ? `${theme.primary}12`
                            : theme.background,
                        },
                      ]}
                    >
                      <AppIcon
                        name={
                          active
                            ? "radio-button-checked"
                            : "radio-button-unchecked"
                        }
                        size={18}
                        color={active ? theme.primary : theme.secondary}
                      />
                      <Text style={[styles.radioText, { color: theme.text }]}>
                        {String(t)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <Text style={[styles.helper, { color: theme.secondary }]}>
                Allowed copy types not provided by server.
              </Text>
            )}

            <View style={{ height: 10 }} />

            <Text style={[styles.label, { color: theme.secondary }]}>
              Fixed Lot Size (optional)
            </Text>
            <View
              style={[
                styles.input,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                },
              ]}
            >
              <AppIcon name="tune" size={18} color={theme.secondary} />
              <TextInput
                value={lotSize}
                onChangeText={setLotSize}
                placeholder="e.g. 0.01"
                placeholderTextColor={`${theme.text}40`}
                keyboardType="numeric"
                style={[styles.textInput, { color: theme.text }]}
              />
            </View>

            <Text style={[styles.label, { color: theme.secondary }]}>
              Lot Multiplier (optional)
            </Text>
            <View
              style={[
                styles.input,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                },
              ]}
            >
              <AppIcon name="calculate" size={18} color={theme.secondary} />
              <TextInput
                value={multiplier}
                onChangeText={setMultiplier}
                placeholder="e.g. 1"
                placeholderTextColor={`${theme.text}40`}
                keyboardType="numeric"
                style={[styles.textInput, { color: theme.text }]}
              />
            </View>

            <Text style={[styles.label, { color: theme.secondary }]}>
              Pending Order Gap (optional)
            </Text>
            <View
              style={[
                styles.input,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                },
              ]}
            >
              <AppIcon name="space-bar" size={18} color={theme.secondary} />
              <TextInput
                value={gap}
                onChangeText={setGap}
                placeholder="e.g. 5"
                placeholderTextColor={`${theme.text}40`}
                keyboardType="numeric"
                style={[styles.textInput, { color: theme.text }]}
              />
            </View>

            <TouchableOpacity
              onPress={() =>
                onConfirm?.({
                  copyTradeType: copyType,
                  lotSize,
                  multiplier,
                  gap,
                })
              }
              disabled={loading || (allowedTypes.length > 0 && !copyType)}
              style={[
                styles.primaryBtn,
                {
                  backgroundColor: theme.primary,
                  opacity:
                    loading || (allowedTypes.length > 0 && !copyType) ? 0.6 : 1,
                },
              ]}
            >
              {loading ? (
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.primaryBtnText}>Submitting...</Text>
                </View>
              ) : (
                <Text style={styles.primaryBtnText}>Confirm & Follow</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function CopyTradeScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { refreshing, runRefresh } = usePullToRefresh();

  const accounts = useAuthStore((s) => s.accounts);
  const sharedAccounts = useAuthStore((s) => s.sharedAccounts);
  const fullName = useAuthStore((s) => s.fullName);
  const globalSelectedAccountId = useAuthStore((s) => s.selectedAccountId);

  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [localAccountId, setLocalAccountId] = useState(globalSelectedAccountId);

  const selectedAccount = useMemo(() => {
    if (!localAccountId) return null;
    return (accounts || []).find(
      (a) => String(a?.accountId ?? a?.id) === String(localAccountId),
    );
  }, [accounts, localAccountId]);

  const followerAccountId =
    localAccountId ?? globalSelectedAccountId ?? selectedAccount?.accountId;

  const followerAccountNumber =
    selectedAccount?.accountNumber ??
    selectedAccount?.AccountNumber ??
    (followerAccountId ? String(followerAccountId) : "—");

  const tabs = useMemo(
    () => [
      { key: "strategies", label: "Strategies", icon: "trending-up" },
      { key: "active", label: "Active", icon: "people" },
      { key: "inactive", label: "Inactive", icon: "person-off" },
    ],
    [],
  );

  const [activeTab, setActiveTab] = useState("strategies");

  // Strategies state
  const [search, setSearch] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [strategiesLoading, setStrategiesLoading] = useState(false);
  const [strategiesError, setStrategiesError] = useState("");
  const [strategiesPaged, setStrategiesPaged] = useState({
    items: [],
    pageNumber: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    totalCount: 0,
    totalPages: 1,
  });

  // Following state
  const [followingLoading, setFollowingLoading] = useState(false);
  const [followingError, setFollowingError] = useState("");
  const [activeFollowing, setActiveFollowing] = useState([]);
  const [inactiveFollowing, setInactiveFollowing] = useState([]);

  // Follow modal
  const [followModalOpen, setFollowModalOpen] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [followSubmitting, setFollowSubmitting] = useState(false);

  // Small fade animation for tab content
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const runFade = () => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    runFade();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchStrategies = async (overrides = {}) => {
    const nextPageNumber = overrides?.pageNumber ?? pageNumber;
    const nextPageSize = overrides?.pageSize ?? pageSize;
    const nextSearch = overrides?.search ?? search;

    setStrategiesLoading(true);
    setStrategiesError("");
    try {
      const resp = await getCopyTradingStrategies({
        PageNumber: nextPageNumber,
        PageSize: nextPageSize,
        SearchTerm: nextSearch || undefined,
      });
      const paged = normalizeStrategyList(resp);
      setStrategiesPaged(paged);
    } catch (e) {
      setStrategiesPaged({
        items: [],
        pageNumber: nextPageNumber,
        pageSize: nextPageSize,
        totalCount: 0,
        totalPages: 1,
      });
      setStrategiesError(e?.message || "Failed to load strategies");
    } finally {
      setStrategiesLoading(false);
    }
  };

  const fetchFollowing = async () => {
    if (!followerAccountId) return;
    setFollowingLoading(true);
    setFollowingError("");
    try {
      const [activeResp, inactiveResp] = await Promise.all([
        getFollowing({ accountId: followerAccountId, isActive: true }),
        getFollowing({ accountId: followerAccountId, isActive: false }),
      ]);

      const a = activeResp?.data ?? activeResp;
      const i = inactiveResp?.data ?? inactiveResp;
      setActiveFollowing(Array.isArray(a) ? a : []);
      setInactiveFollowing(Array.isArray(i) ? i : []);
    } catch (e) {
      setActiveFollowing([]);
      setInactiveFollowing([]);
      setFollowingError(e?.message || "Failed to load masters");
    } finally {
      setFollowingLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (activeTab === "strategies") {
      await fetchStrategies();
    } else {
      await fetchFollowing();
    }
  };

  // Strategies fetch (pagination)
  useEffect(() => {
    if (activeTab !== "strategies") return;
    fetchStrategies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, pageNumber, pageSize]);

  // Debounced search (resets to page 1)
  useEffect(() => {
    if (activeTab !== "strategies") return;
    const t = setTimeout(() => {
      if (pageNumber !== 1) setPageNumber(1);
      fetchStrategies({ pageNumber: 1, search });
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, activeTab]);

  // Following fetch (account or tab changes)
  useEffect(() => {
    if (activeTab === "strategies") return;
    fetchFollowing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, followerAccountId]);

  const openFollow = (strategy) => {
    if (!followerAccountId) {
      showInfoToast("Please select an account.", "Select Account");
      return;
    }
    setSelectedStrategy(strategy);
    setFollowModalOpen(true);
  };

  const onConfirmFollow = async ({
    copyTradeType,
    lotSize,
    multiplier,
    gap,
  }) => {
    if (!selectedStrategy) return;
    if (!followerAccountId) return;
    if (!copyTradeType) {
      showInfoToast("Please choose a copy type.", "Missing");
      return;
    }

    setFollowSubmitting(true);
    try {
      const strategyId =
        selectedStrategy?.strategyId ??
        selectedStrategy?.id ??
        selectedStrategy?.strategyMasterId;

      const payload = {
        strategyId,
        strategyMasterId:
          selectedStrategy?.strategyMasterId ?? selectedStrategy?.id,
        followerAccountId,
        copyTradeType,
        lotSize: lotSize ? Number(lotSize) : undefined,
        multiplier: multiplier ? Number(multiplier) : undefined,
        gap: gap ? Number(gap) : undefined,
      };

      const resp = await followCopyTrade(payload);
      const message = resp?.message || resp?.data?.message;
      showSuccessToast(message || "Copy trade enabled successfully", "Success");
      setFollowModalOpen(false);
      setSelectedStrategy(null);

      // Refresh masters
      await fetchFollowing();
    } catch (e) {
      const msg =
        e?.response?.data?.message || e?.message || "Failed to follow";
      showErrorToast(String(msg), "Error");
    } finally {
      setFollowSubmitting(false);
    }
  };

  const handleUnfollow = async (master) => {
    const strategyId =
      master?.strategyId ?? master?.id ?? master?.strategyMasterId;
    if (!strategyId || !followerAccountId) {
      showInfoToast("Missing strategy/account.", "Invalid");
      return;
    }
    try {
      const resp = await unfollowCopyTrade({
        followerAccountId,
        strategyId,
        strategyMasterId: master?.strategyMasterId ?? master?.id,
      });
      showSuccessToast(resp?.message || "Removed successfully", "Removed");
      await fetchFollowing();
    } catch (e) {
      const msg =
        e?.response?.data?.message || e?.message || "Failed to remove";
      showErrorToast(String(msg), "Error");
    }
  };

  const renderStrategyCard = (s) => {
    const growth = safeNum(s?.growth);
    const followers = s?.followersCount ?? s?.followers ?? 0;
    const feesType = s?.feesType ?? "-";
    const fees = s?.fees ?? s?.feesAmount;

    return (
      <View
        key={String(s?.id ?? s?.strategyId ?? Math.random())}
        style={[
          styles.itemCard,
          { backgroundColor: theme.background, borderColor: theme.border },
        ]}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={[styles.itemTitle, { color: theme.text }]}
              numberOfLines={1}
            >
              {s?.strategyName || s?.name || "Strategy"}
            </Text>
            <Text
              style={[styles.itemMeta, { color: theme.secondary }]}
              numberOfLines={1}
            >
              {feesType}{" "}
              {fees != null
                ? `• ${String(feesType).toLowerCase() === "profitshare" ? `${safeNum(fees).toFixed(2)}%` : formatCurrency(fees)}`
                : ""}
            </Text>
          </View>

          <View style={{ alignItems: "flex-end" }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "900",
                color: growth >= 0 ? theme.positive : theme.negative,
              }}
            >
              {growth >= 0 ? "+" : ""}
              {growth.toFixed(2)}%
            </Text>
            <Text style={[styles.itemMeta, { color: theme.secondary }]}>
              {followers} followers
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
          <TouchableOpacity
            onPress={() => openFollow(s)}
            style={[styles.smallPrimary, { backgroundColor: theme.primary }]}
          >
            <AppIcon name="content-copy" size={16} color="#fff" />
            <Text style={styles.smallPrimaryText}>Copy</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderMasterCard = (m) => {
    const strategyName = m?.strategyName || m?.StrategyName || "Strategy";
    const masterAcc =
      m?.masterAccountNumber || m?.masterAccount || m?.masterAccountId;
    const followerAcc = m?.followerAccountNumber || followerAccountNumber;
    const growth = m?.growth;
    const fees = m?.fees;

    return (
      <View
        key={String(m?.id ?? m?.strategyId ?? Math.random())}
        style={[
          styles.itemCard,
          { backgroundColor: theme.background, borderColor: theme.border },
        ]}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={[styles.itemTitle, { color: theme.text }]}
              numberOfLines={1}
            >
              {strategyName}
            </Text>
            <Text
              style={[styles.itemMeta, { color: theme.secondary }]}
              numberOfLines={1}
            >
              Master: {masterAcc || "-"} • Follower: {followerAcc || "-"}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            {growth != null ? (
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "900",
                  color: safeNum(growth) >= 0 ? theme.positive : theme.negative,
                }}
              >
                {safeNum(growth) >= 0 ? "+" : ""}
                {safeNum(growth).toFixed(2)}%
              </Text>
            ) : null}
            {fees != null ? (
              <Text style={[styles.itemMeta, { color: theme.secondary }]}>
                Fees: {formatCurrency(fees)}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
          <TouchableOpacity
            onPress={() => handleUnfollow(m)}
            style={[styles.smallDanger, { borderColor: theme.negative }]}
          >
            <AppIcon name="delete-outline" size={16} color={theme.negative} />
            <Text style={[styles.smallDangerText, { color: theme.negative }]}>
              Remove
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const currentList =
    activeTab === "inactive" ? inactiveFollowing : activeFollowing;

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: theme.card }]}
        >
          <AppIcon name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Copy Trade
          </Text>
          <Text
            style={[styles.headerSub, { color: theme.secondary }]}
            numberOfLines={1}
          >
            Follow expert traders and replicate automatically
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setAccountModalOpen(true)}
          style={[
            styles.accountBtn,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <AppIcon
            name="account-balance-wallet"
            size={18}
            color={theme.primary}
          />
          <Text
            style={[styles.accountBtnText, { color: theme.text }]}
            numberOfLines={1}
          >
            {String(followerAccountNumber)}
          </Text>
        </TouchableOpacity>
      </View>

      <SegmentedTabs
        tabs={tabs}
        activeKey={activeTab}
        onChange={(k) => {
          setActiveTab(k);
          if (k === "strategies") {
            setPageNumber(1);
          }
        }}
        theme={theme}
      />

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => runRefresh(handleRefresh)}
              tintColor={theme.primary}
            />
          }
        >
          {activeTab === "strategies" ? (
            <>
              <View
                style={[
                  styles.card,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Discover Strategies
                </Text>

                <View
                  style={[
                    styles.input,
                    {
                      borderColor: theme.border,
                      backgroundColor: theme.background,
                      marginTop: 10,
                    },
                  ]}
                >
                  <AppIcon name="search" size={18} color={theme.secondary} />
                  <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search strategies..."
                    placeholderTextColor={`${theme.text}40`}
                    style={[styles.textInput, { color: theme.text }]}
                  />
                </View>

                <View style={styles.pagerRow}>
                  <TouchableOpacity
                    onPress={() => setPageNumber((p) => Math.max(1, p - 1))}
                    disabled={pageNumber <= 1}
                    style={[
                      styles.pageBtn,
                      {
                        backgroundColor: theme.background,
                        borderColor: theme.border,
                        opacity: pageNumber <= 1 ? 0.5 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.pageBtnText, { color: theme.text }]}>
                      Prev
                    </Text>
                  </TouchableOpacity>
                  <Text style={[styles.pageLabel, { color: theme.secondary }]}>
                    Page {pageNumber} /{" "}
                    {Math.max(1, strategiesPaged.totalPages || 1)}
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      setPageNumber((p) =>
                        Math.min(
                          Math.max(1, strategiesPaged.totalPages || 1),
                          p + 1,
                        ),
                      )
                    }
                    disabled={
                      pageNumber >= Math.max(1, strategiesPaged.totalPages || 1)
                    }
                    style={[
                      styles.pageBtn,
                      {
                        backgroundColor: theme.background,
                        borderColor: theme.border,
                        opacity:
                          pageNumber >=
                          Math.max(1, strategiesPaged.totalPages || 1)
                            ? 0.5
                            : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.pageBtnText, { color: theme.text }]}>
                      Next
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {strategiesLoading ? (
                <View style={styles.centerRow}>
                  <ActivityIndicator color={theme.primary} />
                  <Text style={[styles.helper, { color: theme.secondary }]}>
                    Loading strategies...
                  </Text>
                </View>
              ) : strategiesError ? (
                <Text
                  style={[
                    styles.helperError,
                    { color: theme.negative, marginHorizontal: 16 },
                  ]}
                >
                  {strategiesError}
                </Text>
              ) : strategiesPaged.items.length === 0 ? (
                <Text
                  style={[
                    styles.helper,
                    { color: theme.secondary, marginHorizontal: 16 },
                  ]}
                >
                  No strategies found.
                </Text>
              ) : (
                <View style={{ marginTop: 10 }}>
                  {strategiesPaged.items.map(renderStrategyCard)}
                </View>
              )}
            </>
          ) : (
            <>
              <View
                style={[
                  styles.card,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  {activeTab === "active"
                    ? "Active Masters"
                    : "Inactive Masters"}
                </Text>
                <Text style={[styles.helper, { color: theme.secondary }]}>
                  Account: {String(followerAccountNumber)}
                </Text>
              </View>

              {followingLoading ? (
                <View style={styles.centerRow}>
                  <ActivityIndicator color={theme.primary} />
                  <Text style={[styles.helper, { color: theme.secondary }]}>
                    Loading masters...
                  </Text>
                </View>
              ) : followingError ? (
                <Text
                  style={[
                    styles.helperError,
                    { color: theme.negative, marginHorizontal: 16 },
                  ]}
                >
                  {followingError}
                </Text>
              ) : currentList.length === 0 ? (
                <Text
                  style={[
                    styles.helper,
                    { color: theme.secondary, marginHorizontal: 16 },
                  ]}
                >
                  No masters found.
                </Text>
              ) : (
                <View style={{ marginTop: 10 }}>
                  {currentList.map(renderMasterCard)}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </Animated.View>

      <FollowModal
        visible={followModalOpen}
        onClose={() => {
          if (followSubmitting) return;
          setFollowModalOpen(false);
          setSelectedStrategy(null);
        }}
        strategy={selectedStrategy}
        onConfirm={onConfirmFollow}
        loading={followSubmitting}
        theme={theme}
      />

      <AccountSelectorModal
        visible={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
        accounts={accounts}
        sharedAccounts={sharedAccounts}
        fullName={fullName}
        selectedAccountId={selectedAccount?.accountId ?? selectedAccount?.id}
        onSelectAccount={(acc) => {
          const id = acc?.accountId ?? acc?.id ?? acc;
          setLocalAccountId(id);
          setAccountModalOpen(false);
          if (!id) return;
        }}
        onRefresh={() => runRefresh(handleRefresh)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "900" },
  headerSub: { fontSize: 11, fontWeight: "700" },
  accountBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: 160,
  },
  accountBtnText: { fontSize: 12, fontWeight: "900" },

  segment: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderRadius: 14,
    padding: 6,
    flexDirection: "row",
    gap: 6,
  },
  segmentBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
  },
  segmentText: { fontSize: 12, fontWeight: "900" },

  card: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  sectionTitle: { fontSize: 15, fontWeight: "900" },

  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  textInput: { flex: 1, fontSize: 14, fontWeight: "800", paddingVertical: 0 },
  label: { marginTop: 10, marginBottom: 6, fontSize: 12, fontWeight: "800" },
  helper: { marginTop: 6, fontSize: 12, fontWeight: "700" },
  helperError: { marginTop: 10, fontSize: 12, fontWeight: "800" },
  centerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
  },

  itemCard: {
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  itemTitle: { fontSize: 13, fontWeight: "900" },
  itemMeta: { marginTop: 3, fontSize: 11, fontWeight: "700" },

  smallPrimary: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  smallPrimaryText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  smallDanger: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
  },
  smallDangerText: { fontSize: 12, fontWeight: "900" },

  pagerRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  pageBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  pageBtnText: { fontSize: 12, fontWeight: "900" },
  pageLabel: { fontSize: 12, fontWeight: "900" },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalBackdropInner: { flex: 1 },
  modalCard: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },
  modalTitle: { fontSize: 15, fontWeight: "900" },
  modalSub: { marginTop: 2, fontSize: 12, fontWeight: "700" },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  radioRow: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  radioText: { fontSize: 12, fontWeight: "900" },
  primaryBtn: {
    marginTop: 14,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 14, fontWeight: "900" },
});
