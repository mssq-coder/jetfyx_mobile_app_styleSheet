import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  getAccountLeverages,
  getEligibleLeverages,
  getLeverageLogs,
  updateAccountLeverage,
} from "../../api/leverage";
import AppIcon from "../../components/AppIcon";
import { useAppTheme } from "../../contexts/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import { showErrorToast, showSuccessToast } from "../../utils/toast";

const TABS = {
  details: "details",
  history: "history",
};

function formatDateTime(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function normalizeAccounts(res) {
  const raw = Array.isArray(res?.data)
    ? res.data
    : Array.isArray(res)
      ? res
      : [];
  return raw.filter(Boolean).map((item) => ({
    id: item.accountId ?? item.id ?? item.accountNumber,
    accountId: item.accountId ?? item.id,
    accountNumber: item.accountNumber ?? "—",
    accountTypeName:
      item.accountTypeName ?? item.accountType ?? item.type ?? "—",
    leverage: item.leverage ?? "—",
  }));
}

function normalizeEligibleOptions(res) {
  const raw = Array.isArray(res?.data)
    ? res.data
    : Array.isArray(res)
      ? res
      : [];
  const options = raw
    .map((d) => d?.display || (d?.value ? `1:${d.value}` : d?.leverage || ""))
    .filter(Boolean);
  return Array.from(new Set(options)).sort();
}

function normalizeLogs(res) {
  if (!res) return { items: [], totalCount: 0, totalPages: 1, pageNumber: 1 };

  if (Array.isArray(res)) {
    return { items: res, totalCount: res.length, totalPages: 1, pageNumber: 1 };
  }

  const root = res?.data && typeof res.data === "object" ? res.data : res;
  const items = Array.isArray(root?.items)
    ? root.items
    : Array.isArray(root)
      ? root
      : Array.isArray(root?.data)
        ? root.data
        : [];

  return {
    items,
    totalCount: root?.totalCount ?? items.length,
    totalPages: root?.totalPages ?? 1,
    pageNumber: root?.pageNumber ?? 1,
  };
}

function OptionPickerModal({
  open,
  title,
  options,
  selected,
  onClose,
  onSelect,
  theme,
}) {
  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {title}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <AppIcon name="close" color={theme.secondary} size={22} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 360 }}>
            {(options || []).map((opt) => {
              const isActive = String(opt) === String(selected);
              return (
                <TouchableOpacity
                  key={String(opt)}
                  onPress={() => onSelect?.(opt)}
                  style={[
                    styles.modalOption,
                    {
                      borderColor: isActive ? theme.primary : theme.border,
                      backgroundColor: isActive
                        ? `${theme.primary}15`
                        : theme.background,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: isActive ? theme.primary : theme.text,
                      fontWeight: isActive ? "700" : "600",
                    }}
                  >
                    {String(opt)}
                  </Text>
                  {isActive ? (
                    <AppIcon name="check" color={theme.primary} size={18} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
            {!options?.length ? (
              <View
                style={[
                  styles.emptyBox,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text style={{ color: theme.secondary }}>
                  No options available.
                </Text>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function LeverageSettingsScreen() {
  const { theme } = useAppTheme();
  const { userId } = useAuthStore();

  const [activeTab, setActiveTab] = useState(TABS.details);

  // Details
  const [accounts, setAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsError, setAccountsError] = useState("");

  const [editingAccountId, setEditingAccountId] = useState(null);
  const [tempLeverage, setTempLeverage] = useState("");
  const [optionsByAccountId, setOptionsByAccountId] = useState({});
  const [optionsLoading, setOptionsLoading] = useState(false);

  // Picker modal (used for leverage + account filter)
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTitle, setPickerTitle] = useState("");
  const [pickerOptions, setPickerOptions] = useState([]);
  const [pickerSelected, setPickerSelected] = useState(null);
  const onPickerSelectRef = useRef(null);

  // History
  const [historyItems, setHistoryItems] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyAccountFilter, setHistoryAccountFilter] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const accountNumbers = useMemo(() => {
    const nums = (accounts || [])
      .map((a) => a?.accountNumber)
      .filter(Boolean)
      .map(String);
    return Array.from(new Set(nums)).sort();
  }, [accounts]);

  const openPicker = ({ title, options, selected, onSelect }) => {
    onPickerSelectRef.current = onSelect;
    setPickerTitle(title);
    setPickerOptions(options || []);
    setPickerSelected(selected ?? null);
    setPickerOpen(true);
  };

  const closePicker = () => {
    setPickerOpen(false);
    setPickerTitle("");
    setPickerOptions([]);
    setPickerSelected(null);
    onPickerSelectRef.current = null;
  };

  const fetchAccounts = async () => {
    if (!userId) {
      setAccountsError("User ID not found. Please re-login.");
      return;
    }

    try {
      setAccountsLoading(true);
      setAccountsError("");
      const res = await getAccountLeverages(userId);
      const mapped = normalizeAccounts(res);
      setAccounts(mapped);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load leverage accounts.";
      setAccountsError(msg);
    } finally {
      setAccountsLoading(false);
    }
  };

  const fetchHistory = async ({ page = pageNumber, size = pageSize } = {}) => {
    if (!userId) {
      setHistoryError("User ID not found. Please re-login.");
      return;
    }

    try {
      setHistoryLoading(true);
      setHistoryError("");

      const params = {
        userId,
        pageNumber: page,
        pageSize: size,
        ...(historyAccountFilter
          ? { accountNumber: historyAccountFilter }
          : {}),
      };

      const res = await getLeverageLogs(params);
      const data = normalizeLogs(res);

      const items = (data.items || []).map((i) => ({
        accountNumber: i.accountNumber ?? i.account ?? "—",
        oldLeverage: i.oldLeverage ?? i.previousLeverage ?? "—",
        newLeverage: i.newLeverage ?? i.currentLeverage ?? i.leverage ?? "—",
        updatedAt: formatDateTime(i.updatedDate || i.updatedAt || i.date),
      }));

      setHistoryItems(items);
      setTotalCount(Number(data.totalCount ?? items.length) || 0);
      setTotalPages(Number(data.totalPages ?? 1) || 1);
      const apiPage = Number(data.pageNumber ?? page) || page;
      if (apiPage !== pageNumber) setPageNumber(apiPage);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load leverage history.";
      setHistoryError(msg);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [userId]);

  useEffect(() => {
    if (activeTab !== TABS.history) return;
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== TABS.history) return;
    setPageNumber(1);
  }, [historyAccountFilter, pageSize, activeTab]);

  useEffect(() => {
    if (activeTab !== TABS.history) return;
    fetchHistory({ page: pageNumber, size: pageSize });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNumber, pageSize, historyAccountFilter, activeTab]);

  const beginEdit = async (account) => {
    const id = account?.accountId ?? account?.id;
    if (!id) return;
    if (editingAccountId && String(editingAccountId) !== String(id)) return;

    setEditingAccountId(id);
    setTempLeverage(
      account?.leverage && account.leverage !== "—"
        ? String(account.leverage)
        : "",
    );

    const existing = optionsByAccountId[String(id)];
    if (existing?.length) {
      openPicker({
        title: "Select Leverage",
        options: existing,
        selected: tempLeverage || account?.leverage,
        onSelect: (v) => {
          setTempLeverage(String(v));
          closePicker();
        },
      });
      return;
    }

    try {
      setOptionsLoading(true);
      const res = await getEligibleLeverages(id);
      const opts = normalizeEligibleOptions(res);
      const current =
        account?.leverage && account.leverage !== "—"
          ? String(account.leverage)
          : null;
      const merged =
        current && !opts.includes(current) ? [...opts, current].sort() : opts;
      setOptionsByAccountId((prev) => ({ ...prev, [String(id)]: merged }));
      openPicker({
        title: "Select Leverage",
        options: merged,
        selected: tempLeverage || account?.leverage,
        onSelect: (v) => {
          setTempLeverage(String(v));
          closePicker();
        },
      });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load leverage options.";
      showErrorToast(msg, "Error");
    } finally {
      setOptionsLoading(false);
    }
  };

  const cancelEdit = () => {
    setEditingAccountId(null);
    setTempLeverage("");
  };

  const saveEdit = async (account) => {
    const id = account?.accountId ?? account?.id;
    if (!id) return;
    if (!tempLeverage) {
      showErrorToast("Please select a leverage.", "Invalid");
      return;
    }

    const previous = accounts;
    setAccounts((list) =>
      (list || []).map((a) =>
        String(a.accountId ?? a.id) === String(id)
          ? { ...a, leverage: tempLeverage, _updating: true }
          : a,
      ),
    );

    try {
      await updateAccountLeverage(id, tempLeverage);
      setAccounts((list) =>
        (list || []).map((a) =>
          String(a.accountId ?? a.id) === String(id)
            ? { ...a, leverage: tempLeverage, _updating: false }
            : a,
        ),
      );
      showSuccessToast("Leverage updated successfully.", "Success");

      // If user is on history tab later, it will fetch latest.
      // If currently on history, refresh immediately.
      if (activeTab === TABS.history) {
        fetchHistory({ page: 1, size: pageSize });
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update leverage.";
      setAccounts(previous);
      showErrorToast(msg, "Error");
    } finally {
      cancelEdit();
    }
  };

  const tabsRow = (
    <View style={styles.tabsRow}>
      <TouchableOpacity
        onPress={() => setActiveTab(TABS.details)}
        style={[
          styles.tabChip,
          {
            backgroundColor:
              activeTab === TABS.details ? `${theme.primary}15` : theme.card,
            borderColor:
              activeTab === TABS.details ? theme.primary : theme.border,
          },
        ]}
      >
        <AppIcon
          name="speed"
          color={activeTab === TABS.details ? theme.primary : theme.secondary}
          size={18}
        />
        <Text
          style={[
            styles.tabChipText,
            {
              color: activeTab === TABS.details ? theme.primary : theme.text,
            },
          ]}
        >
          Leverage
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setActiveTab(TABS.history)}
        style={[
          styles.tabChip,
          {
            backgroundColor:
              activeTab === TABS.history ? `${theme.primary}15` : theme.card,
            borderColor:
              activeTab === TABS.history ? theme.primary : theme.border,
          },
        ]}
      >
        <AppIcon
          name="history"
          color={activeTab === TABS.history ? theme.primary : theme.secondary}
          size={18}
        />
        <Text
          style={[
            styles.tabChipText,
            {
              color: activeTab === TABS.history ? theme.primary : theme.text,
            },
          ]}
        >
          History
        </Text>
      </TouchableOpacity>
    </View>
  );

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
        <Text style={styles.headerTitle}>Leverage Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.subtitle, { color: theme.secondary }]}>
          View and update leverage for your trading accounts.
        </Text>

        {tabsRow}

        {activeTab === TABS.details ? (
          <View
            style={[
              styles.card,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Accounts
              </Text>
              <TouchableOpacity
                onPress={fetchAccounts}
                disabled={accountsLoading}
                style={[
                  styles.smallButton,
                  {
                    backgroundColor: accountsLoading
                      ? theme.border
                      : `${theme.primary}15`,
                    borderColor: theme.border,
                  },
                ]}
              >
                <AppIcon
                  name="refresh"
                  color={accountsLoading ? theme.secondary : theme.primary}
                  size={18}
                />
                <Text
                  style={{
                    color: accountsLoading ? theme.secondary : theme.primary,
                    fontWeight: "700",
                  }}
                >
                  Refresh
                </Text>
              </TouchableOpacity>
            </View>

            {accountsError ? (
              <View
                style={[
                  styles.notice,
                  {
                    backgroundColor: `${theme.danger ?? "#ef4444"}10`,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: theme.danger ?? "#ef4444",
                    fontWeight: "600",
                  }}
                >
                  {accountsError}
                </Text>
              </View>
            ) : null}

            {accountsLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={theme.primary} />
                <Text style={{ color: theme.secondary, marginLeft: 10 }}>
                  Loading accounts...
                </Text>
              </View>
            ) : !accounts?.length ? (
              <View
                style={[
                  styles.emptyBox,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text style={{ color: theme.secondary }}>
                  No accounts available.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {(accounts || []).map((acc) => {
                  const id = acc.accountId ?? acc.id;
                  const isEditing = String(editingAccountId) === String(id);
                  return (
                    <View
                      key={String(id)}
                      style={[
                        styles.rowCard,
                        {
                          backgroundColor: theme.background,
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.rowTitle, { color: theme.text }]}>
                          {acc.accountNumber}
                        </Text>
                        <Text style={{ color: theme.secondary, marginTop: 2 }}>
                          {acc.accountTypeName}
                        </Text>

                        <View style={{ marginTop: 10 }}>
                          <Text
                            style={{ color: theme.secondary, fontSize: 12 }}
                          >
                            Leverage
                          </Text>
                          <View style={styles.leverageValueRow}>
                            <Text
                              style={[
                                styles.leverageValue,
                                { color: theme.text },
                              ]}
                            >
                              {isEditing
                                ? tempLeverage || "Select"
                                : acc.leverage || "—"}
                            </Text>
                            {acc._updating ? (
                              <Text
                                style={{
                                  color: theme.primary,
                                  fontSize: 12,
                                  fontWeight: "700",
                                }}
                              >
                                Saving...
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      </View>

                      <View style={styles.actionsCol}>
                        {isEditing ? (
                          <>
                            <TouchableOpacity
                              onPress={() => beginEdit(acc)}
                              disabled={optionsLoading}
                              style={[
                                styles.iconButton,
                                {
                                  backgroundColor: `${theme.primary}15`,
                                  borderColor: theme.border,
                                },
                              ]}
                            >
                              <AppIcon
                                name="tune"
                                color={theme.primary}
                                size={20}
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => saveEdit(acc)}
                              style={[
                                styles.iconButton,
                                {
                                  backgroundColor: `${theme.success ?? "#22c55e"}15`,
                                  borderColor: theme.border,
                                },
                              ]}
                            >
                              <AppIcon
                                name="check"
                                color={theme.success ?? "#22c55e"}
                                size={20}
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={cancelEdit}
                              style={[
                                styles.iconButton,
                                {
                                  backgroundColor: `${theme.danger ?? "#ef4444"}15`,
                                  borderColor: theme.border,
                                },
                              ]}
                            >
                              <AppIcon
                                name="close"
                                color={theme.danger ?? "#ef4444"}
                                size={20}
                              />
                            </TouchableOpacity>
                          </>
                        ) : (
                          <TouchableOpacity
                            onPress={() => beginEdit(acc)}
                            disabled={
                              !!editingAccountId &&
                              String(editingAccountId) !== String(id)
                            }
                            style={[
                              styles.iconButton,
                              {
                                backgroundColor: `${theme.primary}15`,
                                borderColor: theme.border,
                                opacity:
                                  !!editingAccountId &&
                                  String(editingAccountId) !== String(id)
                                    ? 0.4
                                    : 1,
                              },
                            ]}
                          >
                            <AppIcon
                              name="edit"
                              color={theme.primary}
                              size={20}
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        ) : (
          <View
            style={[
              styles.card,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                History
              </Text>
              <TouchableOpacity
                onPress={() => fetchHistory({ page: 1, size: pageSize })}
                disabled={historyLoading}
                style={[
                  styles.smallButton,
                  {
                    backgroundColor: historyLoading
                      ? theme.border
                      : `${theme.primary}15`,
                    borderColor: theme.border,
                  },
                ]}
              >
                <AppIcon
                  name="refresh"
                  color={historyLoading ? theme.secondary : theme.primary}
                  size={18}
                />
                <Text
                  style={{
                    color: historyLoading ? theme.secondary : theme.primary,
                    fontWeight: "700",
                  }}
                >
                  Refresh
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() =>
                openPicker({
                  title: "Filter by Account",
                  options: ["All Accounts", ...accountNumbers],
                  selected: historyAccountFilter
                    ? historyAccountFilter
                    : "All Accounts",
                  onSelect: (v) => {
                    const next = String(v) === "All Accounts" ? "" : String(v);
                    setHistoryAccountFilter(next);
                    closePicker();
                  },
                })
              }
              style={[
                styles.filterChip,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
            >
              <AppIcon name="filter-list" color={theme.primary} size={18} />
              <Text style={{ color: theme.text, fontWeight: "700" }}>
                {historyAccountFilter ? historyAccountFilter : "All Accounts"}
              </Text>
              <AppIcon name="expand-more" color={theme.secondary} size={18} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                openPicker({
                  title: "Rows per page",
                  options: [10, 25, 50, 100],
                  selected: pageSize,
                  onSelect: (v) => {
                    setPageSize(Number(v));
                    closePicker();
                  },
                })
              }
              style={[
                styles.filterChip,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
            >
              <AppIcon name="table-rows" color={theme.primary} size={18} />
              <Text style={{ color: theme.text, fontWeight: "700" }}>
                {pageSize} rows
              </Text>
              <AppIcon name="expand-more" color={theme.secondary} size={18} />
            </TouchableOpacity>

            {historyError ? (
              <View
                style={[
                  styles.notice,
                  {
                    backgroundColor: `${theme.danger ?? "#ef4444"}10`,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: theme.danger ?? "#ef4444",
                    fontWeight: "600",
                  }}
                >
                  {historyError}
                </Text>
              </View>
            ) : null}

            {historyLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={theme.primary} />
                <Text style={{ color: theme.secondary, marginLeft: 10 }}>
                  Loading history...
                </Text>
              </View>
            ) : !historyItems?.length ? (
              <View
                style={[
                  styles.emptyBox,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text style={{ color: theme.secondary }}>
                  No leverage history available.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {historyItems.map((h, idx) => (
                  <View
                    key={`${h.accountNumber}_${idx}`}
                    style={[
                      styles.historyCard,
                      {
                        backgroundColor: theme.background,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <View style={styles.historyTopRow}>
                      <Text style={{ color: theme.text, fontWeight: "800" }}>
                        {h.accountNumber}
                      </Text>
                      <Text style={{ color: theme.secondary, fontSize: 12 }}>
                        {h.updatedAt}
                      </Text>
                    </View>
                    <View style={styles.historyMidRow}>
                      <View style={styles.historyPill}>
                        <Text style={{ color: theme.secondary, fontSize: 12 }}>
                          Old
                        </Text>
                        <Text style={{ color: theme.text, fontWeight: "800" }}>
                          {h.oldLeverage}
                        </Text>
                      </View>
                      <AppIcon
                        name="arrow-forward"
                        color={theme.secondary}
                        size={18}
                      />
                      <View style={styles.historyPill}>
                        <Text style={{ color: theme.secondary, fontSize: 12 }}>
                          New
                        </Text>
                        <Text style={{ color: theme.text, fontWeight: "800" }}>
                          {h.newLeverage}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Pagination */}
            <View style={[styles.paginationRow, { borderColor: theme.border }]}>
              <Text style={{ color: theme.secondary, fontSize: 12 }}>
                Page {Math.min(pageNumber, totalPages)} of {totalPages} •{" "}
                {totalCount} record{totalCount === 1 ? "" : "s"}
              </Text>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity
                  onPress={() => setPageNumber(1)}
                  disabled={historyLoading || pageNumber <= 1}
                  style={[
                    styles.pageBtn,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                      opacity: historyLoading || pageNumber <= 1 ? 0.4 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: theme.text, fontWeight: "800" }}>
                    «
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setPageNumber((p) => Math.max(1, p - 1))}
                  disabled={historyLoading || pageNumber <= 1}
                  style={[
                    styles.pageBtn,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                      opacity: historyLoading || pageNumber <= 1 ? 0.4 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: theme.text, fontWeight: "800" }}>
                    Prev
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    setPageNumber((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={historyLoading || pageNumber >= totalPages}
                  style={[
                    styles.pageBtn,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                      opacity:
                        historyLoading || pageNumber >= totalPages ? 0.4 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: theme.text, fontWeight: "800" }}>
                    Next
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setPageNumber(totalPages)}
                  disabled={historyLoading || pageNumber >= totalPages}
                  style={[
                    styles.pageBtn,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                      opacity:
                        historyLoading || pageNumber >= totalPages ? 0.4 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: theme.text, fontWeight: "800" }}>
                    »
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <OptionPickerModal
        open={pickerOpen}
        title={pickerTitle}
        options={pickerOptions}
        selected={pickerSelected}
        theme={theme}
        onClose={closePicker}
        onSelect={(v) => {
          setPickerSelected(v);
          try {
            onPickerSelectRef.current?.(v);
          } catch (e) {
            showErrorToast(e?.message || "Selection failed", "Error");
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: { marginRight: 16 },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 28,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 14,
  },
  tabsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  tabChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tabChipText: {
    fontWeight: "700",
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  smallButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  notice: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  emptyBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
  },
  rowCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    gap: 12,
  },
  rowTitle: { fontSize: 16, fontWeight: "800" },
  leverageValueRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  leverageValue: { fontSize: 18, fontWeight: "900" },
  actionsCol: {
    justifyContent: "flex-start",
    alignItems: "center",
    gap: 10,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  historyCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  historyTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  historyMidRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  historyPill: {
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: 110,
  },
  paginationRow: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
  },
  pageBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  modalTitle: { fontSize: 16, fontWeight: "900" },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
});
