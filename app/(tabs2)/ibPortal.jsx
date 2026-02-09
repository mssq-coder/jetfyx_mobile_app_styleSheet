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
import Header from "../../components/Header";
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
  return n.toFixed(2);
};

const toDateLabel = (v) => {
  if (!v) return "";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleDateString();
  } catch {
    return String(v);
  }
};

const getDateRangeIso = (days) => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - Math.max(1, Number(days) || 30));

  // Use YYYY-MM-DD so backend date parsing is stable.
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
          backgroundColor: active ? theme?.primary : theme?.card,
          borderColor: theme?.border,
        },
      ]}
    >
      <Text style={[styles.chipText, { color: active ? "#fff" : theme?.text }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const StatCard = ({ label, value, icon, theme, subValue }) => {
  return (
    <View
      style={[
        styles.statCard,
        { backgroundColor: theme?.card, borderColor: theme?.border },
      ]}
    >
      <View style={styles.statTop}>
        <Text style={[styles.statLabel, { color: theme?.secondary }]}>
          {label}
        </Text>
        {icon ? <AppIcon name={icon} size={18} color={theme?.icon} /> : null}
      </View>
      <Text style={[styles.statValue, { color: theme?.text }]}>{value}</Text>
      {subValue ? (
        <Text style={[styles.statSub, { color: theme?.secondary }]}>
          {subValue}
        </Text>
      ) : null}
    </View>
  );
};

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
      // Try each candidate id until a route succeeds (some envs use accountId instead of userId).
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

      // Activity: prefer ibAccountId + days endpoint when possible.
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
          // Fallback: older route shape
          activityPayload = await getIbOverviewActivity(identityCandidates[0]);
        }
      } catch (_e) {
        // Non-fatal: keep dashboard usable
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
    // Load dashboard immediately
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        message: referralLink,
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

  return (
    <SafeAreaView
      style={[
        styles.safe,
        { backgroundColor: theme?.background ?? (isDark ? "#0f172a" : "#fff") },
      ]}
      edges={["top", "bottom"]}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={theme?.background}
      />

      <Header imageIndex={1} onRefresh={onRefresh} />

      <View style={styles.pageHeader}>
        <Text style={[styles.title, { color: theme?.text }]}>IB Portal</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { borderColor: theme?.border }]}
          activeOpacity={0.85}
        >
          <AppIcon name="arrow-back" size={18} color={theme?.icon} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        {TABS.map((t) => (
          <Chip
            key={t.key}
            label={t.label}
            active={tab === t.key}
            onPress={() => setTab(t.key)}
            theme={theme}
          />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme?.icon}
          />
        }
      >
        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator color={theme?.primary} />
            <Text style={[styles.loadingText, { color: theme?.secondary }]}>
              Loading…
            </Text>
          </View>
        ) : null}

        {tab === "dashboard" ? (
          <>
            <View style={styles.sectionCard(theme)}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme?.text }]}>
                  Account
                </Text>
                {referralLink ? (
                  <TouchableOpacity
                    onPress={handleShareReferral}
                    style={[styles.smallBtn, { borderColor: theme?.border }]}
                    activeOpacity={0.85}
                  >
                    <AppIcon name="share" size={16} color={theme?.icon} />
                    <Text style={[styles.smallBtnText, { color: theme?.text }]}>
                      Share
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={styles.kvRow}>
                <Text style={[styles.kvKey, { color: theme?.secondary }]}>
                  IB Account
                </Text>
                <Text style={[styles.kvVal, { color: theme?.text }]}>
                  {overviewDetails?.accountNumber ||
                    overviewDetails?.ibAccountNumber ||
                    ibAccountId ||
                    "—"}
                </Text>
              </View>
              <View style={styles.kvRow}>
                <Text style={[styles.kvKey, { color: theme?.secondary }]}>
                  Reference ID
                </Text>
                <Text style={[styles.kvVal, { color: theme?.text }]}>
                  {overviewDetails?.referenceId ||
                    overviewDetails?.refId ||
                    "—"}
                </Text>
              </View>
              {referralLink ? (
                <View style={styles.kvRow}>
                  <Text style={[styles.kvKey, { color: theme?.secondary }]}>
                    Referral Link
                  </Text>
                  <Text
                    style={[styles.kvVal, { color: theme?.text }]}
                    numberOfLines={2}
                  >
                    {referralLink}
                  </Text>
                </View>
              ) : null}
              {overviewDetails?.dateOfReg || overviewDetails?.createdAt ? (
                <View style={styles.kvRow}>
                  <Text style={[styles.kvKey, { color: theme?.secondary }]}>
                    Registered
                  </Text>
                  <Text style={[styles.kvVal, { color: theme?.text }]}>
                    {toDateLabel(
                      overviewDetails?.dateOfReg || overviewDetails?.createdAt,
                    )}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.grid2}>
              <StatCard
                label="Total Commission"
                value={toMoney(financeTotals.totalCommission)}
                icon="payments"
                theme={theme}
              />
              <StatCard
                label="Total Withdrawn"
                value={toMoney(financeTotals.totalWithdrawn)}
                icon="south-west"
                theme={theme}
              />
              <StatCard
                label="Available"
                value={toMoney(financeTotals.available)}
                icon="account-balance-wallet"
                theme={theme}
                subValue="Available to withdraw"
              />
              <StatCard
                label="Net"
                value={toMoney(financeTotals.net)}
                icon="trending-up"
                theme={theme}
              />
            </View>

            <View style={styles.sectionCard(theme)}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme?.text }]}>
                  Recent Activity
                </Text>
              </View>

              {overviewActivity?.length ? (
                overviewActivity.slice(0, 10).map((row, idx) => {
                  const label =
                    row?.label ||
                    row?.title ||
                    row?.type ||
                    row?.action ||
                    `Activity ${idx + 1}`;
                  const date =
                    row?.date || row?.time || row?.createdAt || row?.timestamp;
                  const value =
                    row?.amount ?? row?.commission ?? row?.value ?? row?.profit;
                  return (
                    <View
                      key={String(row?.id ?? idx)}
                      style={[styles.listRow, { borderColor: theme?.border }]}
                    >
                      <View style={styles.listRowLeft}>
                        <Text
                          style={[styles.listRowTitle, { color: theme?.text }]}
                          numberOfLines={1}
                        >
                          {label}
                        </Text>
                        {date ? (
                          <Text
                            style={[
                              styles.listRowSub,
                              { color: theme?.secondary },
                            ]}
                          >
                            {toDateLabel(date)}
                          </Text>
                        ) : null}
                      </View>
                      {value != null ? (
                        <Text
                          style={[styles.listRowRight, { color: theme?.text }]}
                        >
                          {toMoney(value)}
                        </Text>
                      ) : null}
                    </View>
                  );
                })
              ) : (
                <Text style={[styles.emptyText, { color: theme?.secondary }]}>
                  No activity yet.
                </Text>
              )}
            </View>
          </>
        ) : null}

        {tab === "commission" ? (
          <>
            <View style={styles.sectionCard(theme)}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme?.text }]}>
                  History
                </Text>
              </View>

              <View style={styles.rangeRow}>
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

              {commissionLoading ? (
                <View style={styles.centerLoadingSm}>
                  <ActivityIndicator color={theme?.primary} />
                </View>
              ) : null}

              {commissionRows?.length ? (
                commissionRows.slice(0, 50).map((row, idx) => {
                  const date =
                    row?.date || row?.time || row?.createdAt || row?.timestamp;
                  const symbol =
                    row?.symbol || row?.instrument || row?.pair || "—";
                  const amount =
                    row?.commission ?? row?.amount ?? row?.value ?? row?.profit;
                  const level = row?.level ?? row?.clientLevel ?? row?.tier;
                  const client =
                    row?.clientName ||
                    row?.client ||
                    row?.referredClient ||
                    row?.email;
                  return (
                    <View
                      key={String(row?.id ?? row?.ticket ?? idx)}
                      style={[styles.listRow, { borderColor: theme?.border }]}
                    >
                      <View style={styles.listRowLeft}>
                        <Text
                          style={[styles.listRowTitle, { color: theme?.text }]}
                          numberOfLines={1}
                        >
                          {symbol}
                          {level != null ? ` • L${level}` : ""}
                        </Text>
                        <Text
                          style={[
                            styles.listRowSub,
                            { color: theme?.secondary },
                          ]}
                          numberOfLines={1}
                        >
                          {(client ? String(client) : "") +
                            (date ? `  •  ${toDateLabel(date)}` : "")}
                        </Text>
                      </View>
                      <Text
                        style={[styles.listRowRight, { color: theme?.text }]}
                      >
                        {toMoney(amount)}
                      </Text>
                    </View>
                  );
                })
              ) : (
                <Text style={[styles.emptyText, { color: theme?.secondary }]}>
                  No commission rows.
                </Text>
              )}
            </View>
          </>
        ) : null}

        {tab === "clients" ? (
          <>
            <View style={styles.sectionCard(theme)}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme?.text }]}>
                  Referred Clients
                </Text>
                {clientsLoading ? (
                  <ActivityIndicator color={theme?.primary} />
                ) : null}
              </View>

              {clientsRows?.length ? (
                clientsRows.slice(0, 100).map((row, idx) => {
                  const name =
                    row?.fullName || row?.name || row?.clientName || "Client";
                  const email = row?.email || row?.username || row?.login;
                  const level = row?.level ?? row?.clientLevel ?? row?.tier;
                  const status = row?.status || row?.state || row?.clientStatus;
                  const joined =
                    row?.createdAt || row?.dateOfReg || row?.joinedAt;
                  return (
                    <View
                      key={String(row?.id ?? row?.userId ?? idx)}
                      style={[styles.listRow, { borderColor: theme?.border }]}
                    >
                      <View style={styles.listRowLeft}>
                        <Text
                          style={[styles.listRowTitle, { color: theme?.text }]}
                          numberOfLines={1}
                        >
                          {name}
                          {level != null ? ` • L${level}` : ""}
                        </Text>
                        <Text
                          style={[
                            styles.listRowSub,
                            { color: theme?.secondary },
                          ]}
                          numberOfLines={1}
                        >
                          {(email ? String(email) : "") +
                            (status ? `  •  ${status}` : "") +
                            (joined ? `  •  ${toDateLabel(joined)}` : "")}
                        </Text>
                      </View>
                      <AppIcon
                        name="chevron-right"
                        size={18}
                        color={theme?.icon}
                      />
                    </View>
                  );
                })
              ) : (
                <Text style={[styles.emptyText, { color: theme?.secondary }]}>
                  No referred clients.
                </Text>
              )}
            </View>
          </>
        ) : null}

        {tab === "transactions" ? (
          <>
            <View style={styles.sectionCard(theme)}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme?.text }]}>
                  Actions
                </Text>
              </View>

              <View style={styles.grid2}>
                <StatCard
                  label="Available"
                  value={toMoney(financeTotals.available)}
                  icon="account-balance-wallet"
                  theme={theme}
                  subValue="Available to withdraw"
                />
                <StatCard
                  label="Net"
                  value={toMoney(financeTotals.net)}
                  icon="trending-up"
                  theme={theme}
                />
              </View>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    {
                      backgroundColor: theme?.primary,
                      borderColor: theme?.border,
                    },
                  ]}
                  activeOpacity={0.9}
                  onPress={() => router.push("/(tabs2)/withdrawal?flow=ib")}
                >
                  <AppIcon name="south-west" size={18} color="#fff" />
                  <Text style={styles.primaryBtnText}>Withdraw</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.outlineBtn,
                    {
                      borderColor: theme?.border,
                      backgroundColor: theme?.card,
                    },
                  ]}
                  activeOpacity={0.9}
                  onPress={() =>
                    router.push("/(tabs2)/internalTransfer?flow=ib")
                  }
                >
                  <AppIcon name="swap-horiz" size={18} color={theme?.icon} />
                  <Text style={[styles.outlineBtnText, { color: theme?.text }]}>
                    Transfer
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.hint, { color: theme?.secondary }]}>
                Use these actions to move IB funds. If your backend also
                supports IB transaction history, we can wire it in here.
              </Text>
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  pageHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 22, fontWeight: "800" },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  tabRow: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  chip: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  chipText: { fontSize: 12, fontWeight: "700" },

  centerLoading: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  centerLoadingSm: {
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: { fontSize: 12, fontWeight: "600" },

  sectionCard: (theme) => ({
    backgroundColor: theme?.card,
    borderColor: theme?.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  }),
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: "800" },

  smallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
  },
  smallBtnText: { fontSize: 12, fontWeight: "800" },

  kvRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 8,
  },
  kvKey: { fontSize: 12, fontWeight: "700", flexShrink: 0 },
  kvVal: { fontSize: 12, fontWeight: "700", flex: 1, textAlign: "right" },

  grid2: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    width: "48%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  statTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statLabel: { fontSize: 12, fontWeight: "800" },
  statValue: { marginTop: 6, fontSize: 18, fontWeight: "900" },
  statSub: { marginTop: 4, fontSize: 11, fontWeight: "700" },

  listRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  listRowLeft: { flex: 1, paddingRight: 10 },
  listRowTitle: { fontSize: 13, fontWeight: "900" },
  listRowSub: { marginTop: 2, fontSize: 11, fontWeight: "700" },
  listRowRight: { fontSize: 13, fontWeight: "900" },

  emptyText: { fontSize: 12, fontWeight: "700", paddingVertical: 10 },

  rangeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },

  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  primaryBtnText: { color: "#fff", fontWeight: "900" },
  outlineBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  outlineBtnText: { fontWeight: "900" },
  hint: { marginTop: 10, fontSize: 12, fontWeight: "700", lineHeight: 16 },
});
