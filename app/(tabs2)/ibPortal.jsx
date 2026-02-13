import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  getIbCommissionHistory,
  getIbOverviewActivity,
  getIbOverviewActivityByDays,
  getIbOverviewDetails,
  getIbOverviewFinance,
  getIbReferredClients,
} from "../../api/ibPortal";
import AppIcon from "../../components/AppIcon";
import { useAppTheme } from "../../contexts/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import { showErrorToast, showInfoToast } from "../../utils/toast";

const TABS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "commission", label: "Commission" },
  { key: "clients", label: "Clients" },
  { key: "transactions", label: "Transactions" },
];

const RANGE_PRESETS = [
  { key: "7d", label: "7D", days: 7 },
  { key: "30d", label: "30D", days: 30 },
  { key: "90d", label: "90D", days: 90 },
  { key: "180d", label: "180D", days: 180 },
];

const unwrapList = (payload, preferredKeys) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  for (const k of preferredKeys || []) {
    if (Array.isArray(payload?.[k])) return payload[k];
  }
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
};

const toMoney = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0.00";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const toDateLabel = (v) => {
  if (!v) return "";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return String(v);
  }
};

const getDateRangeIso = (days) => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - Math.max(1, Number(days) || 30));

  const toYmd = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  return { startDate: toYmd(start), endDate: toYmd(end) };
};

const Chip = ({ label, active, onPress, theme }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.chip,
        {
          backgroundColor: active ? theme?.primary : "transparent",
          borderColor: active ? theme?.primary : theme?.border,
          borderWidth: active ? 0 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.chipText,
          {
            color: active ? "#fff" : theme?.secondaryText,
            fontWeight: active ? "700" : "600",
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const StatCard = ({ label, value, icon, theme, subValue, trend }) => {
  return (
    <View style={[styles.statCard, { backgroundColor: theme?.card }]}>
      <View style={styles.statTop}>
        <View style={styles.statIconContainer}>
          <AppIcon name={icon} size={20} color={theme?.primary} />
        </View>
        {trend && (
          <View
            style={[
              styles.trendBadge,
              { backgroundColor: trend > 0 ? "#10B98120" : "#EF444420" },
            ]}
          >
            <AppIcon
              name={trend > 0 ? "trending-up" : "trending-down"}
              size={12}
              color={trend > 0 ? "#10B981" : "#EF4444"}
            />
            <Text
              style={[
                styles.trendText,
                { color: trend > 0 ? "#10B981" : "#EF4444" },
              ]}
            >
              {Math.abs(trend)}%
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.statLabel, { color: theme?.secondaryText }]}>
        {label}
      </Text>
      <Text style={[styles.statValue, { color: theme?.text }]}>{value}</Text>
      {subValue && (
        <Text style={[styles.statSub, { color: theme?.secondaryText }]}>
          {subValue}
        </Text>
      )}
    </View>
  );
};

const Card = ({ children, style, theme }) => (
  <View style={[styles.card, { backgroundColor: theme?.card }, style]}>
    {children}
  </View>
);

export default function IbPortal() {
  const { theme, themeName } = useAppTheme();
  const isDark = themeName === "dark";

  const userId = useAuthStore((s) => s.userId);
  const selectedAccountId = useAuthStore((s) => s.selectedAccountId);

  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [overviewDetails, setOverviewDetails] = useState(null);
  const [overviewFinance, setOverviewFinance] = useState(null);
  const [overviewActivity, setOverviewActivity] = useState([]);

  const [commissionRangeKey, setCommissionRangeKey] = useState("30d");
  const [commissionRows, setCommissionRows] = useState([]);
  const [commissionLoading, setCommissionLoading] = useState(false);

  const [clientsRows, setClientsRows] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(false);

  const loaded = useRef({
    dashboard: false,
    commission: false,
    clients: false,
  });

  const ibAccountId =
    overviewDetails?.ibAccountId ??
    overviewDetails?.id ??
    overviewDetails?.accountId ??
    overviewDetails?.ibId ??
    null;

  const identityCandidates = useMemo(() => {
    const ids = [];
    if (userId != null) ids.push(userId);
    if (selectedAccountId != null) ids.push(selectedAccountId);
    return ids;
  }, [userId, selectedAccountId]);

  const loadDashboard = async ({ silent } = {}) => {
    if (!identityCandidates.length) {
      showInfoToast("Please login to view IB Portal.");
      return;
    }

    if (!silent) setLoading(true);
    try {
      let details = null;
      let finance = null;

      let lastErr = null;
      for (const candidate of identityCandidates) {
        try {
          details = await getIbOverviewDetails(candidate);
          finance = await getIbOverviewFinance(candidate);
          lastErr = null;
          break;
        } catch (e) {
          lastErr = e;
        }
      }

      if (lastErr && !details) throw lastErr;

      setOverviewDetails(details);
      setOverviewFinance(finance);

      const activityDays = 30;
      const inferredIbId =
        details?.ibAccountId ?? details?.id ?? details?.accountId ?? null;

      let activityPayload = null;
      try {
        if (inferredIbId != null) {
          activityPayload = await getIbOverviewActivityByDays(
            inferredIbId,
            activityDays,
          );
        } else {
          activityPayload = await getIbOverviewActivity(identityCandidates[0]);
        }
      } catch (_e) {
        activityPayload = null;
      }

      setOverviewActivity(
        unwrapList(activityPayload, ["items", "activity", "data", "rows"]),
      );

      loaded.current.dashboard = true;
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Failed to load IB Portal overview";
      showErrorToast(msg);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadCommission = async () => {
    if (!ibAccountId) {
      showInfoToast("IB account not found yet. Open Dashboard first.");
      return;
    }
    setCommissionLoading(true);
    try {
      const preset = RANGE_PRESETS.find((p) => p.key === commissionRangeKey);
      const { startDate, endDate } = getDateRangeIso(preset?.days || 30);
      const payload = await getIbCommissionHistory({
        ibAccountId,
        startDate,
        endDate,
        page: 1,
        pageSize: 50,
      });
      setCommissionRows(
        unwrapList(payload, ["items", "rows", "commissions", "data"]),
      );
      loaded.current.commission = true;
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Failed to load commission history";
      showErrorToast(msg);
    } finally {
      setCommissionLoading(false);
    }
  };

  const loadClients = async () => {
    if (!ibAccountId) {
      showInfoToast("IB account not found yet. Open Dashboard first.");
      return;
    }
    setClientsLoading(true);
    try {
      const payload = await getIbReferredClients({
        ibAccountId,
        page: 1,
        pageSize: 100,
      });
      setClientsRows(unwrapList(payload, ["items", "rows", "clients", "data"]));
      loaded.current.clients = true;
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Failed to load referred clients";
      showErrorToast(msg);
    } finally {
      setClientsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [userId, selectedAccountId]);

  useEffect(() => {
    if (tab === "commission") {
      if (!loaded.current.dashboard) return;
      loadCommission();
      return;
    }
    if (tab === "clients") {
      if (!loaded.current.dashboard) return;
      loadClients();
      return;
    }
  }, [tab, commissionRangeKey, ibAccountId]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadDashboard({ silent: true });
      if (tab === "commission" && loaded.current.commission) {
        await loadCommission();
      }
      if (tab === "clients" && loaded.current.clients) {
        await loadClients();
      }
    } finally {
      setRefreshing(false);
    }
  };

  const referralLink =
    overviewDetails?.referenceLink ||
    overviewDetails?.referralLink ||
    overviewDetails?.link ||
    "";

  const handleShareReferral = async () => {
    if (!referralLink) return;
    try {
      await Share.share({
        message: `Join me as an Introducing Broker! ${referralLink}`,
      });
    } catch (e) {
      showErrorToast(e?.message || "Could not share referral link");
    }
  };

  const financeTotals = useMemo(() => {
    const f = overviewFinance || {};
    return {
      totalCommission:
        f?.totalCommission ?? f?.totalCommissions ?? f?.commissionTotal ?? 0,
      totalWithdrawn: f?.totalWithdrawn ?? f?.withdrawnTotal ?? 0,
      available:
        f?.availableToWithdraw ?? f?.available ?? f?.availableBalance ?? 0,
      net:
        f?.netCommission ??
        f?.net ??
        Number(f?.totalCommission || 0) - Number(f?.totalWithdrawn || 0),
    };
  }, [overviewFinance]);

  const stats = useMemo(
    () => [
      {
        label: "Total Commission",
        value: toMoney(financeTotals.totalCommission),
        icon: "payments",
        subValue: "All time earnings",
        trend: 12.5,
      },
      {
        label: "Total Withdrawn",
        value: toMoney(financeTotals.totalWithdrawn),
        icon: "south-west",
        subValue: "Withdrawal history",
        trend: -2.3,
      },
      {
        label: "Available",
        value: toMoney(financeTotals.available),
        icon: "account-balance-wallet",
        subValue: "Ready to withdraw",
      },
      {
        label: "Net Balance",
        value: toMoney(financeTotals.net),
        icon: "trending-up",
        subValue: "Current balance",
      },
    ],
    [financeTotals],
  );

  return (
    <SafeAreaView
      style={[
        styles.safe,
        {
          backgroundColor:
            theme?.background ?? (isDark ? "#0f172a" : "#f8fafc"),
        },
      ]}
      edges={["top", "bottom"]}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={theme?.background}
      />

      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: theme?.card }]}
            activeOpacity={0.8}
          >
            <AppIcon name="arrow-back" size={20} color={theme?.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme?.text }]}>
            IB Portal
          </Text>
          <TouchableOpacity
            onPress={onRefresh}
            style={[styles.headerButton, { backgroundColor: theme?.card }]}
            activeOpacity={0.8}
          >
            <AppIcon name="refresh" size={20} color={theme?.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme?.primary]}
              tintColor={theme?.primary}
            />
          }
        >
          <View style={styles.content}>
            {/* Stats Overview */}
            <Card theme={theme}>
              <View style={styles.statsHeader}>
                <Text style={[styles.statsTitle, { color: theme?.text }]}>
                  Performance Overview
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: `${theme?.primary}15` },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: theme?.primary },
                    ]}
                  />
                  <Text style={[styles.statusText, { color: theme?.primary }]}>
                    Active
                  </Text>
                </View>
              </View>

              <View style={styles.statsGrid}>
                {stats.map((stat, index) => (
                  <StatCard
                    key={index}
                    label={stat.label}
                    value={stat.value}
                    icon={stat.icon}
                    theme={theme}
                    subValue={stat.subValue}
                    trend={stat.trend}
                  />
                ))}
              </View>
            </Card>

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
              {TABS.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => setTab(t.key)}
                  style={[
                    styles.tabButton,
                    tab === t.key && [
                      styles.activeTabButton,
                      { backgroundColor: theme?.primary },
                    ],
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.tabButtonText,
                      { color: theme?.secondaryText },
                      tab === t.key && styles.activeTabButtonText,
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Tab Content */}
            {loading && tab === "dashboard" ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme?.primary} />
                <Text
                  style={[styles.loadingText, { color: theme?.secondaryText }]}
                >
                  Loading dashboard...
                </Text>
              </View>
            ) : tab === "dashboard" ? (
              <>
                {/* Account Info Card */}
                <Card theme={theme}>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: theme?.text }]}>
                      Account Details
                    </Text>
                    {referralLink && (
                      <TouchableOpacity
                        onPress={handleShareReferral}
                        style={[
                          styles.shareButton,
                          { backgroundColor: `${theme?.primary}15` },
                        ]}
                        activeOpacity={0.8}
                      >
                        <AppIcon
                          name="share"
                          size={16}
                          color={theme?.primary}
                        />
                        <Text
                          style={[
                            styles.shareButtonText,
                            { color: theme?.primary },
                          ]}
                        >
                          Share Link
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.detailItem}>
                      <Text
                        style={[
                          styles.detailLabel,
                          { color: theme?.secondaryText },
                        ]}
                      >
                        IB Account
                      </Text>
                      <Text
                        style={[styles.detailValue, { color: theme?.text }]}
                      >
                        {overviewDetails?.accountNumber || ibAccountId || "—"}
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text
                        style={[
                          styles.detailLabel,
                          { color: theme?.secondaryText },
                        ]}
                      >
                        Reference ID
                      </Text>
                      <Text
                        style={[styles.detailValue, { color: theme?.text }]}
                      >
                        {overviewDetails?.referenceId || "—"}
                      </Text>
                    </View>
                  </View>

                  {referralLink && (
                    <View style={styles.referralContainer}>
                      <Text
                        style={[
                          styles.referralLabel,
                          { color: theme?.secondaryText },
                        ]}
                      >
                        Referral Link
                      </Text>
                      <View
                        style={[
                          styles.referralBox,
                          {
                            backgroundColor: `${theme?.primary}08`,
                            borderColor: `${theme?.primary}20`,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.referralLink,
                            { color: theme?.primary },
                          ]}
                          numberOfLines={1}
                        >
                          {referralLink}
                        </Text>
                        <TouchableOpacity onPress={() => handleShareReferral()}>
                          <AppIcon
                            name="content-copy"
                            size={18}
                            color={theme?.primary}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </Card>

                {/* Recent Activity */}
                <Card theme={theme}>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: theme?.text }]}>
                      Recent Activity
                    </Text>
                    <TouchableOpacity>
                      <Text
                        style={[styles.viewAllText, { color: theme?.primary }]}
                      >
                        View All
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {overviewActivity?.length ? (
                    overviewActivity.slice(0, 5).map((row, idx) => {
                      const label =
                        row?.label || row?.title || `Activity ${idx + 1}`;
                      const date = row?.date || row?.createdAt;
                      const value = row?.amount ?? row?.commission;
                      const isPositive = Number(value) >= 0;

                      return (
                        <View
                          key={String(row?.id ?? idx)}
                          style={styles.activityRow}
                        >
                          <View style={styles.activityIcon}>
                            <View
                              style={[
                                styles.activityIconCircle,
                                { backgroundColor: `${theme?.primary}15` },
                              ]}
                            >
                              <AppIcon
                                name={
                                  isPositive ? "trending-up" : "trending-down"
                                }
                                size={16}
                                color={isPositive ? "#10B981" : "#EF4444"}
                              />
                            </View>
                          </View>
                          <View style={styles.activityContent}>
                            <Text
                              style={[
                                styles.activityTitle,
                                { color: theme?.text },
                              ]}
                            >
                              {label}
                            </Text>
                            <Text
                              style={[
                                styles.activityDate,
                                { color: theme?.secondaryText },
                              ]}
                            >
                              {date ? toDateLabel(date) : ""}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.activityAmount,
                              { color: isPositive ? "#10B981" : "#EF4444" },
                            ]}
                          >
                            {value != null
                              ? (isPositive ? "+" : "") + toMoney(value)
                              : "—"}
                          </Text>
                        </View>
                      );
                    })
                  ) : (
                    <View style={styles.emptyState}>
                      <View
                        style={[
                          styles.emptyIcon,
                          { backgroundColor: `${theme?.primary}10` },
                        ]}
                      >
                        <AppIcon
                          name="receipt"
                          size={24}
                          color={theme?.primary}
                        />
                      </View>
                      <Text
                        style={[
                          styles.emptyText,
                          { color: theme?.secondaryText },
                        ]}
                      >
                        No activity recorded yet
                      </Text>
                    </View>
                  )}
                </Card>
              </>
            ) : tab === "commission" ? (
              <Card theme={theme}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: theme?.text }]}>
                    Commission History
                  </Text>
                  <View style={styles.rangeSelector}>
                    {RANGE_PRESETS.map((p) => (
                      <Chip
                        key={p.key}
                        label={p.label}
                        active={commissionRangeKey === p.key}
                        onPress={() => setCommissionRangeKey(p.key)}
                        theme={theme}
                      />
                    ))}
                  </View>
                </View>

                {commissionLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color={theme?.primary} />
                  </View>
                ) : commissionRows?.length ? (
                  commissionRows.slice(0, 10).map((row, idx) => {
                    const date = row?.date || row?.createdAt;
                    const symbol = row?.symbol || "—";
                    const amount = row?.commission ?? 0;
                    const client = row?.clientName || row?.client;
                    const isPositive = Number(amount) >= 0;

                    return (
                      <View key={idx} style={styles.commissionRow}>
                        <View style={styles.commissionInfo}>
                          <View style={styles.commissionHeader}>
                            <Text
                              style={[
                                styles.commissionSymbol,
                                { color: theme?.text },
                              ]}
                            >
                              {symbol}
                            </Text>
                            {client && (
                              <Text
                                style={[
                                  styles.commissionClient,
                                  { color: theme?.secondaryText },
                                ]}
                              >
                                • {client}
                              </Text>
                            )}
                          </View>
                          <Text
                            style={[
                              styles.commissionDate,
                              { color: theme?.secondaryText },
                            ]}
                          >
                            {date ? toDateLabel(date) : ""}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.commissionAmount,
                            { color: isPositive ? "#10B981" : "#EF4444" },
                          ]}
                        >
                          {isPositive ? "+" : ""}
                          {toMoney(amount)}
                        </Text>
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.emptyState}>
                    <View
                      style={[
                        styles.emptyIcon,
                        { backgroundColor: `${theme?.primary}10` },
                      ]}
                    >
                      <AppIcon
                        name="payments"
                        size={24}
                        color={theme?.primary}
                      />
                    </View>
                    <Text
                      style={[
                        styles.emptyText,
                        { color: theme?.secondaryText },
                      ]}
                    >
                      No commission records found
                    </Text>
                  </View>
                )}
              </Card>
            ) : tab === "clients" ? (
              <Card theme={theme}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: theme?.text }]}>
                    Referred Clients
                  </Text>
                  <TouchableOpacity>
                    <Text
                      style={[styles.viewAllText, { color: theme?.primary }]}
                    >
                      {clientsRows.length} Total
                    </Text>
                  </TouchableOpacity>
                </View>

                {clientsLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color={theme?.primary} />
                  </View>
                ) : clientsRows?.length ? (
                  clientsRows.slice(0, 8).map((row, idx) => {
                    const name = row?.fullName || row?.name || "Client";
                    const email = row?.email || "No email";
                    const status = row?.status || "Active";
                    const isActive = status.toLowerCase() === "active";

                    return (
                      <View key={idx} style={styles.clientRow}>
                        <View style={styles.clientAvatar}>
                          <Text style={styles.clientAvatarText}>
                            {name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.clientInfo}>
                          <Text
                            style={[styles.clientName, { color: theme?.text }]}
                          >
                            {name}
                          </Text>
                          <Text
                            style={[
                              styles.clientEmail,
                              { color: theme?.secondaryText },
                            ]}
                          >
                            {email}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.clientStatus,
                            {
                              backgroundColor: isActive
                                ? "#10B98115"
                                : "#EF444415",
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.statusDotSmall,
                              {
                                backgroundColor: isActive
                                  ? "#10B981"
                                  : "#EF4444",
                              },
                            ]}
                          />
                          <Text
                            style={[
                              styles.statusTextSmall,
                              { color: isActive ? "#10B981" : "#EF4444" },
                            ]}
                          >
                            {status}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.emptyState}>
                    <View
                      style={[
                        styles.emptyIcon,
                        { backgroundColor: `${theme?.primary}10` },
                      ]}
                    >
                      <AppIcon name="people" size={24} color={theme?.primary} />
                    </View>
                    <Text
                      style={[
                        styles.emptyText,
                        { color: theme?.secondaryText },
                      ]}
                    >
                      No referred clients yet
                    </Text>
                  </View>
                )}
              </Card>
            ) : tab === "transactions" ? (
              <Card theme={theme}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: theme?.text }]}>
                    Funds Management
                  </Text>
                </View>

                <View style={styles.balanceCard}>
                  <Text
                    style={[
                      styles.balanceLabel,
                      { color: theme?.secondaryText },
                    ]}
                  >
                    Available Balance
                  </Text>
                  <Text style={[styles.balanceAmount, { color: theme?.text }]}>
                    {toMoney(financeTotals.available)}
                  </Text>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[
                      styles.primaryAction,
                      { backgroundColor: theme?.primary },
                    ]}
                    activeOpacity={0.8}
                    onPress={() => router.push("/(tabs2)/ibWithdrawal")}
                  >
                    <AppIcon name="south-west" size={20} color="#fff" />
                    <Text style={styles.primaryActionText}>Withdraw</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.secondaryAction,
                      { borderColor: theme?.border },
                    ]}
                    activeOpacity={0.8}
                    onPress={() =>
                      router.push("/(tabs2)/internalTransfer?flow=ib")
                    }
                  >
                    <AppIcon name="swap-horiz" size={20} color={theme?.text} />
                    <Text
                      style={[
                        styles.secondaryActionText,
                        { color: theme?.text },
                      ]}
                    >
                      Transfer
                    </Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ) : null}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    width: "47%",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  statTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(59, 130, 246, 0.1)",
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  trendText: {
    fontSize: 11,
    fontWeight: "600",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },
  statSub: {
    fontSize: 11,
    fontWeight: "500",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  activeTabButton: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  activeTabButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  shareButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  detailRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  referralContainer: {
    marginTop: 8,
  },
  referralLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 8,
  },
  referralBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  referralLink: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    marginRight: 12,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: "600",
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  activityIcon: {
    marginRight: 12,
  },
  activityIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  activityDate: {
    fontSize: 12,
    fontWeight: "500",
  },
  activityAmount: {
    fontSize: 15,
    fontWeight: "700",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "500",
  },
  rangeSelector: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 13,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  commissionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  commissionInfo: {
    flex: 1,
  },
  commissionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  commissionSymbol: {
    fontSize: 14,
    fontWeight: "600",
  },
  commissionClient: {
    fontSize: 13,
    marginLeft: 6,
  },
  commissionDate: {
    fontSize: 12,
    fontWeight: "500",
  },
  commissionAmount: {
    fontSize: 16,
    fontWeight: "700",
  },
  clientRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  clientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  clientAvatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  clientEmail: {
    fontSize: 12,
    fontWeight: "500",
  },
  clientStatus: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  statusDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusTextSmall: {
    fontSize: 11,
    fontWeight: "600",
  },
  balanceCard: {
    alignItems: "center",
    paddingVertical: 30,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.02)",
    marginBottom: 24,
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: "800",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  primaryAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  primaryActionText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    gap: 8,
  },
  secondaryActionText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
