import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeOutDown,
  Layout,
  SlideInDown,
  SlideInRight,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { getAccountLogs } from "../../api/accountLogs";
import AccountSelectorModal from "../../components/Accounts/AccountSelectorModal";
import AppIcon from "../../components/AppIcon";
import { useAppTheme } from "../../contexts/ThemeContext";
import usePullToRefresh from "../../hooks/usePullToRefresh";
import { useAuthStore } from "../../store/authStore";
import { showErrorToast } from "../../utils/toast";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DEFAULT_PAGE_SIZE = 25;

const safeJsonParse = (value) => {
  if (!value || typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch (_e) {
    return null;
  }
};

const formatToYMD = (d) => {
  if (!d) return "";
  try {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "";
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const day = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch (_e) {
    return "";
  }
};

const computeLast7Days = () => {
  const today = new Date();
  const to = formatToYMD(today);
  const fromDate = new Date(today);
  fromDate.setDate(today.getDate() - 7);
  const from = formatToYMD(fromDate);
  return { from, to };
};

const normalizeApiPayload = (payload) => {
  const p = payload?.data ?? payload;
  return p?.data ?? p;
};

const extractItemsAndTotal = (raw) => {
  const root = normalizeApiPayload(raw);
  const items =
    root?.items ??
    root?.data?.items ??
    root?.results ??
    root?.logs ??
    root?.data ??
    (Array.isArray(root) ? root : []);

  const safeItems = Array.isArray(items) ? items : [];
  const totalCount =
    root?.totalCount ??
    root?.total ??
    root?.count ??
    root?.pagination?.totalCount ??
    root?.pagination?.totalItems ??
    safeItems.length;

  return {
    items: safeItems,
    totalCount: Number.isFinite(Number(totalCount))
      ? Number(totalCount)
      : safeItems.length,
  };
};

const mapLogItem = (item) => {
  const details = item?.details ? safeJsonParse(item.details) : null;
  const action = details?.action || item?.action || "—";
  const lowerAction = String(action).toLowerCase();

  const actionType = lowerAction.includes("order")
    ? "Trade"
    : lowerAction.includes("favorite") || lowerAction.includes("favourite")
      ? "UserAction"
      : "Authentication";

  const isOrderCreate =
    lowerAction === "order create" || lowerAction.includes("order create");
  const dataIsString =
    typeof details?.data === "string" && details?.data?.trim().length > 0;
  const useDataString =
    isOrderCreate && details?.status === 400 && dataIsString;
  const dataMessage = dataIsString
    ? details.data
    : details?.data?.message || null;

  const description = lowerAction.startsWith("order close")
    ? details?.data?.message || details?.message || "—"
    : lowerAction.includes("multi target orders")
      ? details?.data?.message || details?.message || "—"
      : (useDataString ? dataMessage : details?.message || dataMessage) || "—";

  const messageField = useDataString
    ? dataMessage
    : details?.message || dataMessage || null;

  const result =
    typeof item?.result === "boolean"
      ? item.result
        ? "SUCCESS"
        : "FAILURE"
      : item?.result || "—";

  return {
    id: item?.id || `${item?.createdAt || item?.timestamp || ""}-${action}`,
    timestamp: item?.createdAt || item?.timestamp || null,
    action,
    actionType,
    deviceType: details?.diagnostics?.deviceType || "",
    diagnostics: details?.diagnostics || null,
    message: messageField,
    description,
    result,
    createdBy: item?.createdBy || "—",
  };
};

const formatTimestamp = (timestamp) => {
  if (!timestamp) return "—";
  try {
    const d = new Date(timestamp);
    if (Number.isNaN(d.getTime())) return String(timestamp);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} · ${hh}:${mi}`;
  } catch (_e) {
    return String(timestamp);
  }
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function AnimatedIcon({ name, size, color, onPress, style }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animatedStyle, style]}
    >
      <AppIcon name={name} size={size} color={color} />
    </AnimatedPressable>
  );
}

function FilterChip({ label, onPress, onRemove, theme, isActive = false }) {
  return (
    <Animated.View
      entering={FadeInDown.duration(300)}
      exiting={FadeOutDown.duration(200)}
      layout={Layout.springify()}
    >
      <Pressable
        onPress={onPress}
        style={[
          styles.chip,
          {
            backgroundColor: isActive ? theme.primary + "15" : theme.card,
            borderColor: isActive ? theme.primary : theme.border + "80",
          },
        ]}
      >
        <Text
          style={[
            styles.chipText,
            { color: isActive ? theme.primary : theme.secondary },
          ]}
        >
          {label}
        </Text>
        {onRemove && (
          <AnimatedPressable
            onPress={onRemove}
            style={styles.chipRemove}
            hitSlop={8}
          >
            <AppIcon name="close" size={14} color={theme.secondary} />
          </AnimatedPressable>
        )}
      </Pressable>
    </Animated.View>
  );
}

function LogCard({ item, index, isLast, theme }) {
  const colors = getResultColors(item.result, theme);
  const scale = useSharedValue(1);
  const [expanded, setExpanded] = useState(false);

  const hasMessage =
    item.message && item.message !== "—" && item.message !== item.description;
  const hasDeviceType = item.deviceType && item.deviceType !== "";
  const isLongDesc = item.description && item.description.length > 60;
  const canExpand = hasMessage || isLongDesc;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      entering={SlideInRight.delay(index * 50).springify()}
      style={styles.rowWrap}
      onPressIn={() => {
        scale.value = withSpring(0.98);
      }}
      onPressOut={() => {
        scale.value = withSpring(1);
      }}
      onPress={canExpand ? () => setExpanded((p) => !p) : undefined}
    >
      {/* Timeline rail */}
      <View style={styles.railWrap}>
        <View
          style={[
            styles.dot,
            {
              backgroundColor: colors.dot,
              borderColor: theme.background,
              shadowColor: colors.dot,
            },
          ]}
        />
        {!isLast ? (
          <LinearGradient
            colors={[colors.dot + "40", theme.border + "20"]}
            style={[styles.rail]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
        ) : null}
      </View>

      {/* Card */}
      <Animated.View
        style={[
          styles.card,
          animatedStyle,
          {
            backgroundColor: theme.card,
            borderColor: theme.border + "80",
            shadowColor: theme.isDark ? "#000000" : theme.border,
          },
        ]}
      >
        <LinearGradient
          colors={[colors.dot + "08", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.cardGradient}
        />

        <View style={styles.cardContent}>
          {/* Header: action + result */}
          <View style={styles.cardTop}>
            <Text
              style={[styles.action, { color: theme.text }]}
              numberOfLines={1}
            >
              {item.action}
            </Text>
            <View
              style={[
                styles.resultBadge,
                { backgroundColor: colors.dot + "15" },
              ]}
            >
              <Text style={[styles.result, { color: colors.text }]}>
                {String(item.result)}
              </Text>
            </View>
          </View>

          {/* Meta: time + type */}
          <View style={styles.metaRow}>
            <AppIcon name="schedule" size={12} color={theme.secondary} />
            <Text style={[styles.meta, { color: theme.secondary }]}>
              {formatTimestamp(item.timestamp)}
            </Text>
            <View style={styles.metaDot} />
            <View
              style={[
                styles.typeBadge,
                { backgroundColor: theme.secondary + "15" },
              ]}
            >
              <Text style={[styles.typeText, { color: theme.secondary }]}>
                {item.actionType}
              </Text>
            </View>
          </View>

          {/* Description */}
          <Text
            style={[styles.desc, { color: theme.secondary + "E6" }]}
            numberOfLines={expanded ? undefined : 2}
          >
            {item.description}
          </Text>

          {/* Message box — only when message exists and differs from description */}
          {hasMessage && (
            <View
              style={[
                styles.messageBox,
                {
                  backgroundColor: colors.dot + "08",
                  borderLeftColor: colors.dot + "60",
                },
              ]}
            >
              <View style={styles.messageHeader}>
                <AppIcon
                  name="chat-bubble-outline"
                  size={13}
                  color={colors.dot + "CC"}
                />
                <Text
                  style={[styles.messageLabel, { color: colors.dot + "CC" }]}
                >
                  Message
                </Text>
              </View>
              <Text
                style={[styles.messageText, { color: theme.text + "E6" }]}
                numberOfLines={expanded ? undefined : 3}
              >
                {item.message}
              </Text>
            </View>
          )}

          {/* Expand toggle */}
          {canExpand && (
            <Pressable
              onPress={() => setExpanded((p) => !p)}
              style={styles.expandRow}
              hitSlop={6}
            >
              <AppIcon
                name={expanded ? "expand-less" : "expand-more"}
                size={16}
                color={theme.secondary + "80"}
              />
              <Text
                style={[styles.expandText, { color: theme.secondary + "80" }]}
              >
                {expanded ? "Show less" : "Show more"}
              </Text>
            </Pressable>
          )}

          {/* Divider */}
          <View
            style={[
              styles.cardDivider,
              { backgroundColor: theme.border + "30" },
            ]}
          />

          {/* Footer */}
          <View style={styles.footerRow}>
            <View style={styles.footerPill}>
              <AppIcon name="person" size={14} color={theme.secondary} />
              <Text
                style={[styles.footerText, { color: theme.secondary }]}
                numberOfLines={1}
              >
                {item.createdBy || "—"}
              </Text>
            </View>
            {hasDeviceType && (
              <View style={styles.footerPill}>
                <AppIcon
                  name={
                    item.deviceType.toLowerCase().includes("mobile")
                      ? "phone-iphone"
                      : "computer"
                  }
                  size={14}
                  color={theme.secondary}
                />
                <Text
                  style={[styles.footerText, { color: theme.secondary }]}
                  numberOfLines={1}
                >
                  {item.deviceType}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    </AnimatedPressable>
  );
}

function PaginationControls({ pageNumber, totalPages, setPageNumber, theme }) {
  return (
    <View
      style={[
        styles.pagination,
        {
          backgroundColor: theme.card + Platform.OS === "ios" ? "F2" : "",
          borderTopColor: theme.border + "40",
        },
      ]}
    >
      <AnimatedPressable
        onPress={() => setPageNumber((p) => Math.max(1, p - 1))}
        style={[
          styles.pageBtn,
          {
            borderColor: theme.border + "80",
            opacity: pageNumber > 1 ? 1 : 0.5,
          },
        ]}
        disabled={pageNumber <= 1}
      >
        <AppIcon name="chevron-left" size={20} color={theme.text} />
        <Text style={[styles.pageBtnText, { color: theme.text }]}>Prev</Text>
      </AnimatedPressable>

      <View style={styles.pageInfo}>
        <Text style={[styles.pageNumber, { color: theme.text }]}>
          {pageNumber}
        </Text>
        <Text style={[styles.pageSeparator, { color: theme.secondary }]}>
          /
        </Text>
        <Text style={[styles.pageTotal, { color: theme.secondary }]}>
          {totalPages}
        </Text>
      </View>

      <AnimatedPressable
        onPress={() => setPageNumber((p) => p + 1)}
        style={[
          styles.pageBtn,
          {
            borderColor: theme.border + "80",
            opacity: pageNumber < totalPages ? 1 : 0.5,
          },
        ]}
        disabled={pageNumber >= totalPages}
      >
        <Text style={[styles.pageBtnText, { color: theme.text }]}>Next</Text>
        <AppIcon name="chevron-right" size={20} color={theme.text} />
      </AnimatedPressable>
    </View>
  );
}

function FilterModal({
  visible,
  onClose,
  filterFromDraft,
  setFilterFromDraft,
  onApply,
  onClear,
  theme,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <BlurView
        intensity={Platform.OS === "ios" ? 50 : 100}
        tint={theme.isDark ? "dark" : "light"}
        style={StyleSheet.absoluteFill}
      >
        <Pressable style={styles.modalOverlay} onPress={onClose}>
          <Animated.View
            entering={SlideInDown.springify().damping(15)}
            exiting={SlideOutDown}
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.border + "40",
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Filter Logs
              </Text>
              <AnimatedPressable onPress={onClose} hitSlop={12}>
                <AppIcon name="close" size={24} color={theme.secondary} />
              </AnimatedPressable>
            </View>

            <View style={styles.modalContent}>
              <Text style={[styles.modalHint, { color: theme.secondary }]}>
                Select a start date (last 7 days only)
              </Text>

              <View style={styles.inputWrap}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>
                  From Date
                </Text>
                <TextInput
                  value={filterFromDraft}
                  onChangeText={setFilterFromDraft}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.secondary + "80"}
                  style={[
                    styles.input,
                    {
                      color: theme.text,
                      backgroundColor: theme.background,
                      borderColor: theme.border + "80",
                    },
                  ]}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.quickFilters}>
                <Text
                  style={[styles.quickFilterLabel, { color: theme.secondary }]}
                >
                  Quick Select
                </Text>
                <View style={styles.quickFilterRow}>
                  <Pressable
                    onPress={() => {
                      const { from } = computeLast7Days();
                      setFilterFromDraft(from);
                    }}
                    style={[
                      styles.quickFilterBtn,
                      {
                        backgroundColor: theme.background,
                        borderColor: theme.border + "80",
                      },
                    ]}
                  >
                    <Text
                      style={[styles.quickFilterText, { color: theme.text }]}
                    >
                      Last 7 days
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      const today = formatToYMD(new Date());
                      setFilterFromDraft(today);
                    }}
                    style={[
                      styles.quickFilterBtn,
                      {
                        backgroundColor: theme.background,
                        borderColor: theme.border + "80",
                      },
                    ]}
                  >
                    <Text
                      style={[styles.quickFilterText, { color: theme.text }]}
                    >
                      Today
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.modalBtnRow}>
                <Pressable
                  onPress={onClear}
                  style={[
                    styles.modalBtn,
                    {
                      borderColor: theme.border + "80",
                      backgroundColor: theme.background,
                    },
                  ]}
                >
                  <Text
                    style={[styles.modalBtnText, { color: theme.secondary }]}
                  >
                    Clear
                  </Text>
                </Pressable>
                <LinearGradient
                  colors={[theme.primary, theme.primary + "CC"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalBtnPrimary}
                >
                  <Pressable
                    onPress={onApply}
                    style={styles.modalBtnPrimaryPress}
                  >
                    <Text style={styles.modalBtnPrimaryText}>Apply Filter</Text>
                  </Pressable>
                </LinearGradient>
              </View>
            </View>
          </Animated.View>
        </Pressable>
      </BlurView>
    </Modal>
  );
}

const getResultColors = (result, theme) => {
  const r = String(result || "").toUpperCase();
  if (r === "SUCCESS") return { dot: "#34C759", text: "#34C759" };
  if (r === "FAILURE") return { dot: "#FF3B30", text: "#FF3B30" };
  if (r === "PENDING") return { dot: "#FF9F0A", text: "#FF9F0A" };
  return { dot: theme.secondary, text: theme.secondary };
};

const formatAccountIdShort = (value) => {
  if (value == null) return "";
  const s = String(value);
  if (!s) return "";
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}...${s.slice(-4)}`;
};

export default function LogsScreen() {
  const { theme } = useAppTheme();
  const { refreshing, runRefresh } = usePullToRefresh();
  const selectedAccountId = useAuthStore((s) => s.selectedAccountId);
  const accounts = useAuthStore((s) => s.accounts);
  const sharedAccounts = useAuthStore((s) => s.sharedAccounts);
  const fullName = useAuthStore((s) => s.fullName);
  const setSelectedAccount = useAuthStore((s) => s.setSelectedAccount);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const [accountPickerOpen, setAccountPickerOpen] = useState(false);

  const selectedAccount = useMemo(() => {
    const sharedList = (sharedAccounts || []).flatMap((s) => s?.accounts || []);
    const list = [...(Array.isArray(accounts) ? accounts : []), ...sharedList];
    if (selectedAccountId == null) return null;
    return (
      list.find(
        (a) => String(a?.accountId ?? a?.id) === String(selectedAccountId),
      ) || null
    );
  }, [accounts, sharedAccounts, selectedAccountId]);

  const selectedAccountNumber = useMemo(() => {
    const value = selectedAccount?.accountNumber ?? null;
    if (value != null && String(value).trim() !== "") return String(value);
    if (selectedAccountId != null && String(selectedAccountId).trim() !== "") {
      return String(selectedAccountId);
    }
    return null;
  }, [selectedAccount, selectedAccountId]);

  const accountIdLabel = useMemo(
    () => formatAccountIdShort(selectedAccountId),
    [selectedAccountId],
  );

  const { from: last7From } = useMemo(() => computeLast7Days(), []);

  const [filterFromDraft, setFilterFromDraft] = useState(last7From);
  const [appliedFrom, setAppliedFrom] = useState(last7From);
  const [showFilter, setShowFilter] = useState(false);

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalCount, setTotalCount] = useState(0);
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((totalCount || 0) / (pageSize || 1))),
    [totalCount, pageSize],
  );

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const lastErrorRef = useRef(null);
  const fetchRef = useRef(null);

  const fetchLogs = useCallback(async () => {
    const accountId = selectedAccountId;
    if (!accountId) {
      setItems([]);
      setTotalCount(0);
      return;
    }

    setLoading(true);
    try {
      const res = await getAccountLogs({
        accountId,
        pageNumber,
        pageSize,
        date: appliedFrom || undefined,
      });

      const { items: rawItems, totalCount: total } = extractItemsAndTotal(res);
      const normalized = rawItems.map(mapLogItem);

      setItems(normalized);
      setTotalCount(total);
      lastErrorRef.current = null;
    } catch (e) {
      setItems([]);
      setTotalCount(0);

      const message =
        e?.response?.data?.message ||
        e?.response?.data?.title ||
        e?.message ||
        "Failed to load logs";

      if (lastErrorRef.current !== message) {
        lastErrorRef.current = message;
        showErrorToast(message, "Logs");
      }
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId, pageNumber, pageSize, appliedFrom]);

  useEffect(() => {
    fetchRef.current = fetchLogs;
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (pageNumber > totalPages) setPageNumber(totalPages);
  }, [pageNumber, totalPages]);

  useEffect(() => {
    setPageNumber(1);
  }, [appliedFrom, selectedAccountId]);

  const onRefresh = useCallback(async () => {
    await runRefresh(async () => {
      await fetchRef.current?.();
    });
  }, [runRefresh]);

  const applyFilter = useCallback(() => {
    const normalized = formatToYMD(filterFromDraft);
    const { from } = computeLast7Days();
    const clamped = normalized && normalized < from ? from : normalized;
    setAppliedFrom(clamped || from);
    setShowFilter(false);
  }, [filterFromDraft]);

  const clearFilter = useCallback(() => {
    const { from } = computeLast7Days();
    setFilterFromDraft(from);
    setAppliedFrom(from);
    setShowFilter(false);
  }, []);

  const removeFilter = useCallback(() => {
    const { from } = computeLast7Days();
    setAppliedFrom(from);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={theme.isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <Animated.View
          entering={FadeInDown.duration(400)}
          style={[
            styles.header,
            {
              backgroundColor: theme.card + (Platform.OS === "ios" ? "F2" : ""),
              borderBottomColor: theme.border + "40",
            },
          ]}
        >
          <AnimatedIcon
            name="arrow-back"
            size={24}
            color={theme.text}
            onPress={() => router.back()}
            style={styles.headerBtn}
          />

          <View style={styles.headerTitleWrap}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              Activity Logs
            </Text>
            <Pressable
              onPress={() => setAccountPickerOpen(true)}
              style={[
                styles.accountBadge,
                {
                  backgroundColor: theme.primary + "12",
                  borderColor: theme.primary + "40",
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Select account"
            >
              <AppIcon name="account-circle" size={14} color={theme.primary} />
              <Text
                style={[styles.headerSub, { color: theme.primary }]}
                numberOfLines={1}
              >
                {selectedAccountNumber
                  ? `Account #${selectedAccountNumber}`
                  : selectedAccountId
                    ? accountIdLabel
                    : "Select an account"}
              </Text>
              <AppIcon name="expand-more" size={18} color={theme.primary} />
            </Pressable>
          </View>

          <AnimatedIcon
            name="filter-list"
            size={24}
            color={appliedFrom !== last7From ? theme.primary : theme.text}
            onPress={() => setShowFilter(true)}
            style={styles.headerBtn}
          />
        </Animated.View>

        {/* Applied filter chip */}
        {appliedFrom !== last7From && (
          <View style={styles.chipRow}>
            <FilterChip
              label={`From: ${appliedFrom}`}
              onPress={() => setShowFilter(true)}
              onRemove={removeFilter}
              theme={theme}
              isActive
            />
          </View>
        )}

        {/* List */}
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item, index }) => (
            <LogCard
              item={item}
              index={index}
              isLast={index === items.length - 1}
              theme={theme}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            items.length === 0 && styles.emptyList,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
              progressBackgroundColor={theme.card}
            />
          }
          ListEmptyComponent={
            loading ? (
              <Animated.View entering={FadeInUp} style={styles.emptyWrap}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.emptyText, { color: theme.secondary }]}>
                  Loading your logs...
                </Text>
              </Animated.View>
            ) : (
              <Animated.View entering={FadeInUp} style={styles.emptyWrap}>
                <View
                  style={[styles.emptyIcon, { backgroundColor: theme.card }]}
                >
                  <AppIcon
                    name="history"
                    size={48}
                    color={theme.secondary + "80"}
                  />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>
                  No logs found
                </Text>
                <Text
                  style={[styles.emptySubtitle, { color: theme.secondary }]}
                >
                  {selectedAccountId
                    ? "Try adjusting your filters or pull down to refresh"
                    : "Select an account to view logs"}
                </Text>
              </Animated.View>
            )
          }
        />

        {/* Pagination */}
        {items.length > 0 && (
          <PaginationControls
            pageNumber={pageNumber}
            totalPages={totalPages}
            setPageNumber={setPageNumber}
            theme={theme}
          />
        )}
      </SafeAreaView>

      {/* Filter modal */}
      <FilterModal
        visible={showFilter}
        onClose={() => setShowFilter(false)}
        filterFromDraft={filterFromDraft}
        setFilterFromDraft={setFilterFromDraft}
        onApply={applyFilter}
        onClear={clearFilter}
        theme={theme}
      />

      <AccountSelectorModal
        visible={accountPickerOpen}
        onClose={() => setAccountPickerOpen(false)}
        accounts={accounts}
        sharedAccounts={sharedAccounts}
        fullName={fullName || ""}
        selectedAccountId={
          selectedAccount
            ? (selectedAccount.accountId ?? selectedAccount.id)
            : selectedAccountId
        }
        onSelectAccount={(a) => {
          setSelectedAccount?.(a);
          setAccountPickerOpen(false);
        }}
        onRefresh={async () => {
          try {
            await refreshProfile?.();
          } catch {}
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    ...Platform.select({
      ios: {
        paddingTop: 44,
      },
      android: {
        paddingTop: StatusBar.currentHeight,
      },
    }),
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  accountBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  headerSub: {
    fontSize: 13,
    fontWeight: "600",
  },
  chipRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  chipRemove: {
    padding: 2,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  emptyList: {
    flex: 1,
    justifyContent: "center",
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 20,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: "500",
  },
  rowWrap: {
    flexDirection: "row",
    marginBottom: 16,
  },
  railWrap: {
    width: 32,
    alignItems: "center",
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2.5,
    marginTop: 18,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  rail: {
    flex: 1,
    width: 2,
    marginTop: 8,
    borderRadius: 2,
  },
  card: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  cardContent: {
    padding: 16,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 8,
  },
  action: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  resultBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  result: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  meta: {
    fontSize: 12,
    fontWeight: "600",
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "rgba(150,150,150,0.5)",
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  desc: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
    marginBottom: 8,
  },
  messageBox: {
    borderLeftWidth: 3,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  messageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 6,
  },
  messageLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  messageText: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 19,
  },
  expandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 4,
    marginBottom: 4,
  },
  expandText: {
    fontSize: 12,
    fontWeight: "600",
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    flexWrap: "wrap",
    gap: 12,
  },
  footerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  footerText: {
    fontSize: 12,
    fontWeight: "600",
    maxWidth: 200,
  },
  pagination: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    ...Platform.select({
      ios: {
        paddingBottom: 34,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        paddingBottom: 16,
        elevation: 8,
      },
    }),
  },
  pageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 90,
    justifyContent: "center",
  },
  pageBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  pageInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pageNumber: {
    fontSize: 16,
    fontWeight: "700",
  },
  pageSeparator: {
    fontSize: 16,
    fontWeight: "500",
  },
  pageTotal: {
    fontSize: 16,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    ...Platform.select({
      ios: {
        paddingBottom: 20,
      },
      android: {
        paddingBottom: 16,
      },
    }),
  },
  modalCard: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderRadius: 24,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(150,150,150,0.1)",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  modalContent: {
    padding: 20,
  },
  modalHint: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 16,
  },
  inputWrap: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: "500",
  },
  quickFilters: {
    marginBottom: 24,
  },
  quickFilterLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 10,
  },
  quickFilterRow: {
    flexDirection: "row",
    gap: 10,
  },
  quickFilterBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  quickFilterText: {
    fontSize: 14,
    fontWeight: "600",
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  modalBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
  modalBtnPrimary: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  modalBtnPrimaryPress: {
    paddingVertical: 16,
    alignItems: "center",
  },
  modalBtnPrimaryText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
