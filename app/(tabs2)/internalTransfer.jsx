import { useLocalSearchParams, useRouter } from "expo-router";
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

import {
    getClientAccountTransactions,
    getIbInternalTransfers,
    getUserDetails,
} from "../../api/getServices";
import { getIbOverviewDetails, getIbOverviewFinance } from "../../api/ibPortal";
import {
    createIbInternalTransfer,
    createInternalTransfer,
} from "../../api/Services";
import AppIcon from "../../components/AppIcon";
import { useAppTheme } from "../../contexts/ThemeContext";
import useAccountSummary from "../../hooks/useAccountSummary";
import { useAuthStore } from "../../store/authStore";
import { useUserStore } from "../../store/userStore";
import {
    showErrorToast,
    showInfoToast,
    showSuccessToast,
} from "../../utils/toast";

const MINIMUM_TRANSFER_AMOUNT = 10;
const MAXIMUM_TRANSFER_AMOUNT = 999999;
const ITEMS_PER_PAGE = 5;
const ACCOUNT_NUMBER_MAX_LENGTH = 10;

const formatMoney = (value) => {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "0.00";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const validateTransferAmount = (amount, freeMargin) => {
  const num = Number(amount);
  if (!Number.isFinite(num)) return "Enter a valid numeric amount";
  if (num < MINIMUM_TRANSFER_AMOUNT) {
    return `Minimum transfer amount is $${MINIMUM_TRANSFER_AMOUNT}`;
  }
  if (num > MAXIMUM_TRANSFER_AMOUNT) {
    return `Maximum transfer amount is $${MAXIMUM_TRANSFER_AMOUNT}`;
  }
  const fm = Number(freeMargin || 0);
  if (Number.isFinite(fm) && num > fm) {
    return `Insufficient free margin. Maximum transferable amount is: $${formatMoney(fm)}`;
  }
  return "";
};

const validateAccountIds = (fromAccountId, toAccountId) => {
  if (
    fromAccountId &&
    toAccountId &&
    String(fromAccountId) === String(toAccountId)
  ) {
    return "From and To account must be different";
  }
  return "";
};

const getAccountId = (acc) => acc?.accountId ?? acc?.id;

function AccountSelectModal({
  visible,
  onClose,
  title,
  accounts,
  selectedId,
  onSelect,
  theme,
}) {
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
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {title}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.iconBtn, { backgroundColor: theme.background }]}
            >
              <AppIcon name="close" size={18} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 380 }}>
            {(accounts || []).map((acc) => {
              const id = getAccountId(acc);
              const isSelected =
                selectedId != null && String(id) === String(selectedId);
              const label = String(acc?.accountNumber ?? id ?? "—");
              const sub = String(
                acc?.accountName ?? acc?.type ?? acc?.accountType ?? "",
              ).trim();
              return (
                <TouchableOpacity
                  key={String(id)}
                  onPress={() => {
                    onSelect?.(id);
                    onClose?.();
                  }}
                  style={[
                    styles.modalRow,
                    {
                      borderColor: isSelected ? theme.primary : theme.border,
                      backgroundColor: isSelected
                        ? `${theme.primary}12`
                        : theme.background,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalRowTitle, { color: theme.text }]}>
                      {label}
                    </Text>
                    {!!sub && (
                      <Text
                        style={[styles.modalRowSub, { color: theme.secondary }]}
                      >
                        {sub}
                      </Text>
                    )}
                  </View>
                  {isSelected ? (
                    <AppIcon
                      name="check-circle"
                      size={18}
                      color={theme.primary}
                    />
                  ) : (
                    <AppIcon
                      name="radio-button-unchecked"
                      size={18}
                      color={theme.secondary}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function InternalTransferScreen() {
  const params = useLocalSearchParams();
  const flow = String(params?.flow || "").toLowerCase();
  if (flow === "ib") {
    return <IbInternalTransferScreen />;
  }

  return <StandardInternalTransferScreen />;
}

function IbInternalTransferScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();

  const accounts = useAuthStore((s) => s.accounts);
  const selectedAccountId = useAuthStore((s) => s.selectedAccountId);
  const userId = useAuthStore((s) => s.userId);

  const userData = useUserStore((s) => s.userData);
  const setUserData = useUserStore((s) => s.setUserData);

  const user = useMemo(() => userData?.data ?? userData ?? {}, [userData]);
  const isKycApproved =
    String(user?.overallStatus || "").toLowerCase() === "approved";

  const selectedAccount = useMemo(() => {
    const id = selectedAccountId;
    const list = Array.isArray(accounts) ? accounts : [];
    return (
      list.find((a) => String(getAccountId(a)) === String(id)) ||
      list[0] ||
      null
    );
  }, [accounts, selectedAccountId]);

  const accountId = getAccountId(selectedAccount);

  const [ibDetails, setIbDetails] = useState(null);
  const [ibFinance, setIbFinance] = useState(null);
  const [loading, setLoading] = useState(false);

  const [mode, setMode] = useState("between");
  const [toAccountId, setToAccountId] = useState(null);
  const [toOtherAccNumber, setToOtherAccNumber] = useState("");
  const [toOtherEmail, setToOtherEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyRows, setHistoryRows] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const availableBalance = useMemo(() => {
    const f = ibFinance || {};
    const v =
      f?.availableBalance ??
      f?.availableToWithdrawal ??
      f?.availableToWithdraw ??
      f?.available ??
      0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }, [ibFinance]);

  const displayIbAccountNumber =
    ibDetails?.displayAccountNumber ||
    ibDetails?.accountNumber ||
    ibDetails?.ibAccountNumber ||
    "—";

  const toAccount = useMemo(() => {
    const list = Array.isArray(accounts) ? accounts : [];
    if (!toAccountId) return null;
    return (
      list.find((a) => String(getAccountId(a)) === String(toAccountId)) || null
    );
  }, [accounts, toAccountId]);

  const selectableToAccounts = useMemo(() => {
    const list = Array.isArray(accounts) ? accounts : [];
    return list.filter((a) => String(getAccountId(a)) !== String(accountId));
  }, [accounts, accountId]);

  const loadIb = async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const [d, f] = await Promise.all([
        getIbOverviewDetails(accountId),
        getIbOverviewFinance(accountId),
      ]);
      setIbDetails(d);
      setIbFinance(f);
    } catch (e) {
      showErrorToast(
        e?.response?.data?.message || e?.message || "Failed to load IB details",
      );
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (nextPage = 1) => {
    if (!accountId) return;
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const resp = await getIbInternalTransfers({
        accountId,
        pageNumber: nextPage,
        pageSize: 20,
        includePending: true,
      });

      const root = resp?.data ?? resp;
      const items = Array.isArray(root?.items)
        ? root.items
        : Array.isArray(root)
          ? root
          : [];
      setHistoryRows(items);
      setPage(Number(root?.pageNumber ?? root?.page ?? nextPage) || nextPage);
      setTotalPages(Number(root?.totalPages ?? 1) || 1);
    } catch (e) {
      setHistoryRows([]);
      setHistoryError(
        e?.response?.data?.message || e?.message || "Failed to load transfers",
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!userId) return;
      try {
        const data = await getUserDetails(userId);
        if (mounted) setUserData(data);
      } catch (_e) {}
    };
    run();
    return () => {
      mounted = false;
    };
  }, [userId, setUserData]);

  useEffect(() => {
    loadIb();
    loadHistory(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  useEffect(() => {
    // Default destination to the first other account
    if (mode !== "between") return;
    if (toAccountId) return;
    const first = selectableToAccounts[0];
    if (first) setToAccountId(getAccountId(first));
  }, [mode, toAccountId, selectableToAccounts]);

  useEffect(() => {
    // validation
    const amt = Number(String(amount).replace(/[^0-9.]/g, ""));
    if (!amount) {
      setError("");
      return;
    }
    if (!Number.isFinite(amt) || amt < MINIMUM_TRANSFER_AMOUNT) {
      setError(`Minimum transfer amount is $${MINIMUM_TRANSFER_AMOUNT}`);
      return;
    }
    if (amt > availableBalance) {
      setError(
        `Insufficient available balance. Maximum transferable amount is: $${formatMoney(availableBalance)}`,
      );
      return;
    }
    if (mode === "between" && !toAccountId) {
      setError("Please select a destination account");
      return;
    }
    if (mode === "toAnother") {
      if (!toOtherAccNumber || String(toOtherAccNumber).length < 6) {
        setError("Enter a valid target account number");
        return;
      }
      if (
        !toOtherEmail ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(toOtherEmail))
      ) {
        setError("Enter a valid email");
        return;
      }
    }
    setError("");
  }, [
    amount,
    availableBalance,
    mode,
    toAccountId,
    toOtherAccNumber,
    toOtherEmail,
  ]);

  const handleSubmit = async () => {
    if (!isKycApproved) {
      showInfoToast(
        "Please complete KYC verification to proceed.",
        "KYC Required",
      );
      return;
    }
    if (submitting) return;
    if (!accountId) {
      showInfoToast("Please select an account.");
      return;
    }
    if (error) {
      showInfoToast(error);
      return;
    }

    const amt = Number(String(amount).replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(amt) || amt < MINIMUM_TRANSFER_AMOUNT) {
      showInfoToast(`Minimum transfer amount is $${MINIMUM_TRANSFER_AMOUNT}`);
      return;
    }

    const targetAccountNumber =
      mode === "between"
        ? String(toAccount?.accountNumber || "")
        : String(toOtherAccNumber).trim();

    if (!targetAccountNumber) {
      showInfoToast("Missing target account number.");
      return;
    }

    const detailsJson =
      mode === "toAnother"
        ? JSON.stringify({
            toOtherAccountEmail: String(toOtherEmail).trim(),
            Portal: "client",
          })
        : "";

    const payload = {
      accountId,
      accountNumber: String(
        selectedAccount?.accountNumber || displayIbAccountNumber || "",
      ),
      targetAccountNumber,
      amount: amt,
      currency: "USD",
      paymentMethod: "internal",
      comment: "",
      ...(mode === "toAnother"
        ? { targetEmail: String(toOtherEmail).trim() }
        : {}),
      ...(detailsJson ? { detailsJson, DetailsJson: detailsJson } : {}),
    };

    setSubmitting(true);
    try {
      const resp = await createIbInternalTransfer(payload);
      showSuccessToast(resp?.message || "IB internal transfer submitted!");
      setAmount("");
      setToOtherAccNumber("");
      setToOtherEmail("");
      await loadIb();
      await loadHistory(1);
    } catch (e) {
      showErrorToast(
        e?.response?.data?.message || e?.message || "Transfer failed",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isKycApproved) {
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
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            IB Internal Transfer
          </Text>
        </View>

        <View
          style={[
            styles.kycCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View
              style={[
                styles.kycIcon,
                { backgroundColor: `${theme.warning}18` },
              ]}
            >
              <AppIcon name="info" size={18} color={theme.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.kycTitle, { color: theme.text }]}>
                KYC Verification Required
              </Text>
              <Text style={[styles.kycDesc, { color: theme.secondary }]}>
                To proceed with IB transfers, please complete KYC verification.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => router.push("/(tabs2)/accountSettings")}
            style={[
              styles.primaryBtn,
              { backgroundColor: theme.primary, marginTop: 14 },
            ]}
          >
            <Text style={styles.primaryBtnText}>Go to KYC</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          IB Internal Transfer
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={historyLoading}
            onRefresh={() => loadHistory(1)}
          />
        }
      >
        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            IB Account
          </Text>
          <Text style={[styles.cardHint, { color: theme.secondary }]}>
            Account Number: {displayIbAccountNumber}
          </Text>
          <Text style={[styles.cardHint, { color: theme.secondary }]}>
            Available: ${formatMoney(availableBalance)}
          </Text>
          {loading ? (
            <ActivityIndicator
              color={theme.primary}
              style={{ marginTop: 10 }}
            />
          ) : null}
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Transfer Options
          </Text>
          <View style={styles.modeRow}>
            <TouchableOpacity
              onPress={() => setMode("between")}
              style={[
                styles.modeCard,
                {
                  backgroundColor:
                    mode === "between"
                      ? `${theme.primary}12`
                      : theme.background,
                  borderColor:
                    mode === "between" ? theme.primary : theme.border,
                },
              ]}
              activeOpacity={0.85}
            >
              <AppIcon name="swap-horiz" size={22} color={theme.primary} />
              <Text style={[styles.modeTitle, { color: theme.text }]}>
                Between Your Accounts
              </Text>
              <Text style={[styles.modeSub, { color: theme.secondary }]}>
                Transfer to your other account
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setMode("toAnother")}
              style={[
                styles.modeCard,
                {
                  backgroundColor:
                    mode === "toAnother"
                      ? `${theme.primary}12`
                      : theme.background,
                  borderColor:
                    mode === "toAnother" ? theme.primary : theme.border,
                },
              ]}
              activeOpacity={0.85}
            >
              <AppIcon name="people" size={22} color={theme.primary} />
              <Text style={[styles.modeTitle, { color: theme.text }]}>
                To Another Account
              </Text>
              <Text style={[styles.modeSub, { color: theme.secondary }]}>
                Transfer to another user
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Details
          </Text>

          {mode === "between" ? (
            <>
              <Text style={[styles.label, { color: theme.secondary }]}>
                To Account
              </Text>
              <View
                style={[
                  styles.selectField,
                  {
                    borderColor: theme.border,
                    backgroundColor: theme.background,
                  },
                ]}
              >
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10 }}
                >
                  {selectableToAccounts.map((acc) => {
                    const id = getAccountId(acc);
                    const active = String(id) === String(toAccountId);
                    return (
                      <TouchableOpacity
                        key={String(id)}
                        onPress={() => setToAccountId(id)}
                        style={{
                          paddingVertical: 10,
                          paddingHorizontal: 12,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: active ? theme.primary : theme.border,
                          backgroundColor: active
                            ? `${theme.primary}12`
                            : theme.background,
                        }}
                      >
                        <Text
                          style={{
                            color: theme.text,
                            fontWeight: "800",
                            fontSize: 12,
                          }}
                        >
                          {String(acc?.accountNumber ?? id ?? "—")}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </>
          ) : (
            <>
              <Text style={[styles.label, { color: theme.secondary }]}>
                Target Account Number
              </Text>
              <TextInput
                value={toOtherAccNumber}
                onChangeText={setToOtherAccNumber}
                placeholder="Enter account number"
                placeholderTextColor={theme.secondary}
                keyboardType="number-pad"
                style={[
                  styles.ibTextInput,
                  {
                    borderColor: theme.border,
                    color: theme.text,
                    backgroundColor: theme.background,
                  },
                ]}
              />
              <Text
                style={[
                  styles.label,
                  { color: theme.secondary, marginTop: 10 },
                ]}
              >
                Target Email
              </Text>
              <TextInput
                value={toOtherEmail}
                onChangeText={setToOtherEmail}
                placeholder="Enter email"
                placeholderTextColor={theme.secondary}
                keyboardType="email-address"
                autoCapitalize="none"
                style={[
                  styles.ibTextInput,
                  {
                    borderColor: theme.border,
                    color: theme.text,
                    backgroundColor: theme.background,
                  },
                ]}
              />
            </>
          )}

          <Text
            style={[styles.label, { color: theme.secondary, marginTop: 10 }]}
          >
            Amount (USD)
          </Text>
          <TextInput
            value={amount}
            onChangeText={(t) =>
              setAmount(String(t || "").replace(/[^0-9.]/g, ""))
            }
            placeholder="0.00"
            placeholderTextColor={theme.secondary}
            keyboardType="decimal-pad"
            style={[
              styles.ibTextInput,
              {
                borderColor: theme.border,
                color: theme.text,
                backgroundColor: theme.background,
              },
            ]}
          />

          {!!error && (
            <Text
              style={{
                marginTop: 8,
                color: theme.danger || "#ef4444",
                fontWeight: "800",
              }}
            >
              {error}
            </Text>
          )}

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting}
            style={[
              styles.primaryBtn,
              {
                backgroundColor: theme.primary,
                marginTop: 12,
                opacity: submitting ? 0.7 : 1,
              },
            ]}
          >
            <Text style={styles.primaryBtnText}>
              {submitting ? "Submitting…" : "Submit Transfer"}
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={[styles.rowBetween, { marginBottom: 8 }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Transfer History
            </Text>
            <TouchableOpacity
              onPress={() => loadHistory(1)}
              activeOpacity={0.85}
            >
              <AppIcon name="refresh" size={18} color={theme.primary} />
            </TouchableOpacity>
          </View>

          {!!historyError && (
            <Text
              style={{ color: theme.danger || "#ef4444", fontWeight: "700" }}
            >
              {historyError}
            </Text>
          )}

          {historyRows.length ? (
            historyRows.slice(0, 10).map((tx, idx) => (
              <View
                key={String(tx?.id ?? idx)}
                style={[styles.historyRow, { borderColor: theme.border }]}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.historyTitle, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {String(
                      tx?.targetAccountNumber ||
                        tx?.toAccountNumber ||
                        "Transfer",
                    )}
                  </Text>
                  <Text
                    style={[styles.historySub, { color: theme.secondary }]}
                    numberOfLines={1}
                  >
                    {String(tx?.createdAt || tx?.date || tx?.time || "")}
                  </Text>
                </View>
                <Text style={[styles.historyAmt, { color: theme.text }]}>
                  ${formatMoney(tx?.amount || 0)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={[styles.cardHint, { color: theme.secondary }]}>
              No IB internal transfers found.
            </Text>
          )}

          <View style={[styles.rowBetween, { marginTop: 10 }]}>
            <TouchableOpacity
              onPress={() => {
                const prev = Math.max(1, page - 1);
                if (prev !== page) loadHistory(prev);
              }}
              disabled={page <= 1}
              style={[
                styles.pageBtn,
                { borderColor: theme.border, opacity: page <= 1 ? 0.5 : 1 },
              ]}
            >
              <AppIcon name="chevron-left" size={18} color={theme.text} />
            </TouchableOpacity>
            <Text style={{ color: theme.secondary, fontWeight: "800" }}>
              Page {page} / {totalPages}
            </Text>
            <TouchableOpacity
              onPress={() => {
                const next = Math.min(totalPages, page + 1);
                if (next !== page) loadHistory(next);
              }}
              disabled={page >= totalPages}
              style={[
                styles.pageBtn,
                {
                  borderColor: theme.border,
                  opacity: page >= totalPages ? 0.5 : 1,
                },
              ]}
            >
              <AppIcon name="chevron-right" size={18} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StandardInternalTransferScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();

  const accounts = useAuthStore((s) => s.accounts);
  const selectedAccountId = useAuthStore((s) => s.selectedAccountId);
  const userId = useAuthStore((s) => s.userId);

  const userData = useUserStore((s) => s.userData);
  const setUserData = useUserStore((s) => s.setUserData);

  const user = useMemo(() => userData?.data ?? userData ?? {}, [userData]);
  const isKycApproved =
    String(user?.overallStatus || "").toLowerCase() === "approved";

  const currentUserAccounts = useMemo(
    () => (Array.isArray(accounts) ? accounts : []),
    [accounts],
  );
  const onlyOneAccount = currentUserAccounts.length <= 1;

  const [mode, setMode] = useState(() =>
    onlyOneAccount ? "toAnother" : "between",
  );

  // Between
  const [fromAccId, setFromAccId] = useState(() => {
    if (currentUserAccounts.length > 1) return null;
    return selectedAccountId ?? getAccountId(currentUserAccounts[0]) ?? null;
  });
  const [toAccId, setToAccId] = useState(null);
  const [amount, setAmount] = useState("");
  const [betweenError, setBetweenError] = useState("");
  const [submittingBetween, setSubmittingBetween] = useState(false);
  const [showCreditHintBetween, setShowCreditHintBetween] = useState(false);

  // To another
  const [toOtherAccNumber, setToOtherAccNumber] = useState("");
  const [toOtherEmail, setToOtherEmail] = useState("");
  const [otherAmount, setOtherAmount] = useState("");
  const [otherError, setOtherError] = useState("");
  const [submittingAnother, setSubmittingAnother] = useState(false);
  const [showCreditHintAnother, setShowCreditHintAnother] = useState(false);

  // History
  const [historyAccountId, setHistoryAccountId] = useState(
    () => selectedAccountId ?? null,
  );
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyTx, setHistoryTx] = useState([]);
  const [page, setPage] = useState(1);

  // Modals
  const [fromModalOpen, setFromModalOpen] = useState(false);
  const [toModalOpen, setToModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  // Small swap animation
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const fromAccount = useMemo(() => {
    if (!fromAccId) return null;
    return (
      currentUserAccounts.find(
        (a) => String(getAccountId(a)) === String(fromAccId),
      ) ?? null
    );
  }, [currentUserAccounts, fromAccId]);

  const toAccount = useMemo(() => {
    if (!toAccId) return null;
    return (
      currentUserAccounts.find(
        (a) => String(getAccountId(a)) === String(toAccId),
      ) ?? null
    );
  }, [currentUserAccounts, toAccId]);

  const summaryAccount =
    fromAccount ??
    (selectedAccountId
      ? currentUserAccounts.find(
          (a) => String(getAccountId(a)) === String(selectedAccountId),
        )
      : currentUserAccounts[0]) ??
    null;

  const { summary } = useAccountSummary(
    summaryAccount,
    getAccountId(summaryAccount),
  );

  const freeMargin = Number(summary?.freeMargin ?? 0);

  const paginatedTx = useMemo(() => {
    const list = Array.isArray(historyTx) ? historyTx : [];
    const start = (page - 1) * ITEMS_PER_PAGE;
    return list.slice(start, start + ITEMS_PER_PAGE);
  }, [historyTx, page]);

  const maxPage = useMemo(() => {
    const list = Array.isArray(historyTx) ? historyTx : [];
    return Math.max(1, Math.ceil(list.length / ITEMS_PER_PAGE));
  }, [historyTx]);

  // Keep mode consistent if account count changes
  useEffect(() => {
    setMode(onlyOneAccount ? "toAnother" : "between");
  }, [onlyOneAccount]);

  // Ensure default from account
  useEffect(() => {
    if (fromAccId) return;
    if (currentUserAccounts.length === 1) {
      setFromAccId(
        getAccountId(currentUserAccounts[0]) ?? selectedAccountId ?? null,
      );
    }
  }, [currentUserAccounts, selectedAccountId, fromAccId]);

  // Auto-wire 2-account scenario
  useEffect(() => {
    if (mode !== "between") return;
    if (currentUserAccounts.length !== 2) return;

    if (fromAccId && (!toAccId || String(toAccId) === String(fromAccId))) {
      const other = currentUserAccounts.find(
        (a) => String(getAccountId(a)) !== String(fromAccId),
      );
      setToAccId(getAccountId(other) ?? null);
    }
    if (toAccId && (!fromAccId || String(fromAccId) === String(toAccId))) {
      const other = currentUserAccounts.find(
        (a) => String(getAccountId(a)) !== String(toAccId),
      );
      setFromAccId(getAccountId(other) ?? null);
    }
  }, [mode, currentUserAccounts, fromAccId, toAccId]);

  // Load user details for KYC gating (similar to More screen)
  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!userId) return;
      try {
        const data = await getUserDetails(userId);
        if (mounted) setUserData(data);
      } catch (_e) {
        // ignore
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [userId, setUserData]);

  // Validation re-check (between)
  useEffect(() => {
    if (mode !== "between") return;
    if (!fromAccId || !toAccId || !amount) {
      setBetweenError("");
      return;
    }
    const accountErr = validateAccountIds(fromAccId, toAccId);
    if (accountErr) {
      setBetweenError(accountErr);
      return;
    }
    setBetweenError(validateTransferAmount(amount, freeMargin));
  }, [mode, fromAccId, toAccId, amount, freeMargin]);

  // Validation re-check (another)
  useEffect(() => {
    if (mode !== "toAnother") return;
    if (!fromAccId) {
      setOtherError("");
      return;
    }
    if (
      toOtherAccNumber &&
      fromAccount?.accountNumber &&
      String(toOtherAccNumber) === String(fromAccount.accountNumber)
    ) {
      setOtherError("From and To account numbers must be different");
      return;
    }
    if (!otherAmount) {
      setOtherError("");
      return;
    }
    setOtherError(validateTransferAmount(otherAmount, freeMargin));
  }, [
    mode,
    fromAccId,
    toOtherAccNumber,
    otherAmount,
    freeMargin,
    fromAccount?.accountNumber,
  ]);

  const resetBetween = () => {
    setToAccId(null);
    if (currentUserAccounts.length > 1) setFromAccId(null);
    setAmount("");
    setBetweenError("");
    setShowCreditHintBetween(false);
  };

  const resetAnother = () => {
    setToOtherAccNumber("");
    setToOtherEmail("");
    setOtherAmount("");
    setOtherError("");
    setShowCreditHintAnother(false);
  };

  const fetchHistory = async () => {
    const acct = historyAccountId ?? selectedAccountId;
    if (!acct) {
      setHistoryTx([]);
      return;
    }
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const resp = await getClientAccountTransactions({
        accountId: acct,
        transactionType: "InternalTransfer",
        includePending: true,
      });
      const data = Array.isArray(resp?.data) ? resp.data : [];
      setHistoryTx(data);
      setPage(1);
    } catch (e) {
      setHistoryTx([]);
      setHistoryError(e?.message ?? "Failed to load transactions");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyAccountId, selectedAccountId]);

  const handleSwap = () => {
    if (!fromAccId || !toAccId) return;
    if (String(fromAccId) === String(toAccId)) return;

    Animated.timing(rotateAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start(() => rotateAnim.setValue(0));

    const temp = fromAccId;
    setFromAccId(toAccId);
    setToAccId(temp);
  };

  const handleSubmitBetween = async () => {
    if (!isKycApproved) {
      showInfoToast(
        "Please complete KYC verification to proceed.",
        "KYC Required",
      );
      return;
    }
    if (submittingBetween) return;
    if (!fromAccId || !toAccId) {
      showInfoToast("Please select both accounts.", "Missing");
      return;
    }
    if (!amount) {
      showInfoToast("Please enter an amount.", "Missing");
      return;
    }
    const accountErr = validateAccountIds(fromAccId, toAccId);
    if (accountErr) {
      setBetweenError(accountErr);
      return;
    }
    const amtErr = validateTransferAmount(amount, freeMargin);
    if (amtErr) {
      setBetweenError(amtErr);
      return;
    }

    const fromAcc = fromAccount;
    const toAcc = toAccount;
    const currency = String(fromAcc?.currency ?? "USD");
    const payload = {
      accountId: fromAccId,
      accountNumber: fromAcc?.accountNumber ?? "",
      targetAccountNumber: toAcc?.accountNumber ?? "",
      amount: Number(amount),
      currency,
      paymentMethod: "internal",
      comment: "",
    };

    setSubmittingBetween(true);
    try {
      const resp = await createInternalTransfer(payload);
      if (Number(resp?.statusCode) === 200) {
        showSuccessToast(
          resp?.message || "Internal transfer request submitted!",
          "Success",
        );
      } else {
        showSuccessToast(
          resp?.message || "Internal transfer request submitted!",
          "Submitted",
        );
      }
      await fetchHistory();
      resetBetween();
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Internal transfer request failed.";
      showErrorToast(String(msg), "Error");
    } finally {
      setSubmittingBetween(false);
    }
  };

  const handleSubmitAnother = async () => {
    if (!isKycApproved) {
      showInfoToast(
        "Please complete KYC verification to proceed.",
        "KYC Required",
      );
      return;
    }
    if (submittingAnother) return;
    if (!fromAccId) {
      showInfoToast("Please select a source account.", "Missing");
      return;
    }
    if (!toOtherAccNumber || toOtherAccNumber.length < 6) {
      showInfoToast("Please enter a valid target account number.", "Invalid");
      return;
    }
    if (
      !toOtherEmail ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(toOtherEmail))
    ) {
      showInfoToast("Please enter a valid email.", "Invalid");
      return;
    }
    if (!otherAmount) {
      showInfoToast("Please enter an amount.", "Missing");
      return;
    }
    if (
      fromAccount?.accountNumber &&
      String(toOtherAccNumber) === String(fromAccount.accountNumber)
    ) {
      setOtherError("From and To account numbers must be different");
      return;
    }
    const amtErr = validateTransferAmount(otherAmount, freeMargin);
    if (amtErr) {
      setOtherError(amtErr);
      return;
    }

    const currency = String(fromAccount?.currency ?? "USD");
    const payload = {
      accountId: fromAccId,
      accountNumber: fromAccount?.accountNumber ?? "",
      targetAccountNumber: String(toOtherAccNumber),
      amount: Number(otherAmount),
      currency,
      comment: "",
      targetEmail: String(toOtherEmail).trim(),
      detailsJson: JSON.stringify({
        toOtherAccountEmail: String(toOtherEmail).trim(),
        Portal: "client",
      }),
    };

    setSubmittingAnother(true);
    try {
      const resp = await createInternalTransfer(payload);
      if (Number(resp?.statusCode) === 200) {
        showSuccessToast(
          resp?.message || "Internal transfer request submitted!",
          "Success",
        );
      } else {
        showSuccessToast(
          resp?.message || "Internal transfer request submitted!",
          "Submitted",
        );
      }
      await fetchHistory();
      resetAnother();
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Internal transfer request failed.";
      showErrorToast(String(msg), "Error");
    } finally {
      setSubmittingAnother(false);
    }
  };

  const swapRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["90deg", "270deg"],
  });

  const fromCredit = Number(fromAccount?.netCredit ?? fromAccount?.credit ?? 0);
  const toAnotherCredit = fromCredit;

  useEffect(() => {
    setShowCreditHintBetween(fromCredit > 0);
    setShowCreditHintAnother(toAnotherCredit > 0);
  }, [fromCredit, toAnotherCredit]);

  if (!isKycApproved) {
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
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Internal Transfer
          </Text>
        </View>

        <View
          style={[
            styles.kycCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View
              style={[
                styles.kycIcon,
                { backgroundColor: `${theme.warning}18` },
              ]}
            >
              <AppIcon name="info" size={18} color={theme.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.kycTitle, { color: theme.text }]}>
                KYC Verification Required
              </Text>
              <Text style={[styles.kycDesc, { color: theme.secondary }]}>
                To proceed with transfers, please complete KYC verification.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => router.push("/(tabs2)/accountSettings")}
            style={[
              styles.primaryBtn,
              { backgroundColor: theme.primary, marginTop: 14 },
            ]}
          >
            <Text style={styles.primaryBtnText}>Go to KYC</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Internal Transfer
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={historyLoading}
            onRefresh={fetchHistory}
          />
        }
      >
        {/* Mode */}
        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Transfer Options
          </Text>

          <View style={styles.modeRow}>
            <TouchableOpacity
              onPress={() => setMode("toAnother")}
              style={[
                styles.modeCard,
                {
                  backgroundColor:
                    mode === "toAnother"
                      ? `${theme.primary}12`
                      : theme.background,
                  borderColor:
                    mode === "toAnother" ? theme.primary : theme.border,
                },
              ]}
              activeOpacity={0.8}
            >
              <AppIcon name="people" size={22} color={theme.primary} />
              <Text style={[styles.modeTitle, { color: theme.text }]}>
                To Another Account
              </Text>
              <Text style={[styles.modeSub, { color: theme.secondary }]}>
                Transfer to another user
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (!onlyOneAccount) setMode("between");
              }}
              style={[
                styles.modeCard,
                {
                  opacity: onlyOneAccount ? 0.5 : 1,
                  backgroundColor:
                    mode === "between"
                      ? `${theme.primary}12`
                      : theme.background,
                  borderColor:
                    mode === "between" ? theme.primary : theme.border,
                },
              ]}
              activeOpacity={onlyOneAccount ? 1 : 0.8}
            >
              <AppIcon
                name="account-balance-wallet"
                size={22}
                color={theme.primary}
              />
              <Text style={[styles.modeTitle, { color: theme.text }]}>
                Between Your Accounts
              </Text>
              <Text style={[styles.modeSub, { color: theme.secondary }]}>
                Move funds across your accounts
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Form */}
        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Internal Transfer
          </Text>

          {/* From */}
          <Text style={[styles.label, { color: theme.secondary }]}>
            From Account
          </Text>
          <TouchableOpacity
            onPress={() => setFromModalOpen(true)}
            style={[
              styles.selectField,
              { borderColor: theme.border, backgroundColor: theme.background },
            ]}
          >
            <Text style={[styles.selectText, { color: theme.text }]}>
              {fromAccount?.accountNumber
                ? `${fromAccount.accountNumber}${fromAccount?.accountName ? ` • ${fromAccount.accountName}` : ""}`
                : "Select source account"}
            </Text>
            <AppIcon name="expand-more" size={20} color={theme.secondary} />
          </TouchableOpacity>

          {mode === "between" ? (
            <>
              <View style={{ height: 12 }} />

              {/* Swap + To */}
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: theme.secondary }]}>
                    To Account
                  </Text>
                  <TouchableOpacity
                    onPress={() => setToModalOpen(true)}
                    style={[
                      styles.selectField,
                      {
                        borderColor: theme.border,
                        backgroundColor: theme.background,
                      },
                    ]}
                  >
                    <Text style={[styles.selectText, { color: theme.text }]}>
                      {toAccount?.accountNumber
                        ? `${toAccount.accountNumber}${toAccount?.accountName ? ` • ${toAccount.accountName}` : ""}`
                        : "Select destination account"}
                    </Text>
                    <AppIcon
                      name="expand-more"
                      size={20}
                      color={theme.secondary}
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={handleSwap}
                  disabled={
                    !fromAccId ||
                    !toAccId ||
                    String(fromAccId) === String(toAccId)
                  }
                  style={[
                    styles.swapBtn,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                      opacity:
                        !fromAccId ||
                        !toAccId ||
                        String(fromAccId) === String(toAccId)
                          ? 0.5
                          : 1,
                    },
                  ]}
                >
                  <Animated.View
                    style={{ transform: [{ rotate: swapRotation }] }}
                  >
                    <AppIcon name="swap-vert" size={20} color={theme.primary} />
                  </Animated.View>
                </TouchableOpacity>
              </View>

              <View style={{ height: 12 }} />

              {/* Available + Amount */}
              <View style={styles.dualRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: theme.secondary }]}>
                    Available Amount
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
                    <Text
                      style={[styles.moneyPrefix, { color: theme.secondary }]}
                    >
                      $
                    </Text>
                    <Text style={[styles.readOnlyValue, { color: theme.text }]}>
                      {fromAccId ? formatMoney(freeMargin) : "0.00"}
                    </Text>
                  </View>
                </View>

                <View style={{ width: 12 }} />

                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: theme.secondary }]}>
                    Amount ({String(fromAccount?.currency ?? "USD")})
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
                    <Text
                      style={[styles.moneyPrefix, { color: theme.secondary }]}
                    >
                      $
                    </Text>
                    <TextInput
                      value={amount}
                      onChangeText={(t) => setAmount(t)}
                      placeholder="0.00"
                      placeholderTextColor={`${theme.text}40`}
                      keyboardType="numeric"
                      style={[styles.textInput, { color: theme.text }]}
                      editable={!!fromAccId && !!toAccId}
                    />
                  </View>
                </View>
              </View>

              {!fromAccId || !toAccId ? (
                <Text style={[styles.helperError, { color: theme.negative }]}>
                  Please select both accounts to enter an amount.
                </Text>
              ) : null}

              {showCreditHintBetween ? (
                <Text style={[styles.helperWarn, { color: theme.warning }]}>
                  Credit deduction may apply based on Credit Settings.
                </Text>
              ) : null}

              {!!betweenError ? (
                <Text style={[styles.helperError, { color: theme.negative }]}>
                  {betweenError}
                </Text>
              ) : null}

              <TouchableOpacity
                onPress={handleSubmitBetween}
                disabled={
                  submittingBetween ||
                  !fromAccId ||
                  !toAccId ||
                  !amount ||
                  !!betweenError
                }
                style={[
                  styles.primaryBtn,
                  {
                    backgroundColor: theme.primary,
                    opacity:
                      submittingBetween ||
                      !fromAccId ||
                      !toAccId ||
                      !amount ||
                      !!betweenError
                        ? 0.5
                        : 1,
                  },
                ]}
              >
                {submittingBetween ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <ActivityIndicator color="#fff" />
                    <Text style={styles.primaryBtnText}>Processing...</Text>
                  </View>
                ) : (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <AppIcon name="compare-arrows" size={18} color="#fff" />
                    <Text style={styles.primaryBtnText}>Transfer Funds</Text>
                  </View>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={{ height: 12 }} />

              <Text style={[styles.label, { color: theme.secondary }]}>
                To Account Number
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
                <AppIcon name="numbers" size={18} color={theme.secondary} />
                <TextInput
                  value={toOtherAccNumber}
                  onChangeText={(t) => {
                    const digits = String(t || "")
                      .replace(/\D+/g, "")
                      .slice(0, ACCOUNT_NUMBER_MAX_LENGTH);
                    setToOtherAccNumber(digits);
                  }}
                  placeholder="Enter account number"
                  placeholderTextColor={`${theme.text}40`}
                  keyboardType="number-pad"
                  style={[styles.textInput, { color: theme.text }]}
                />
              </View>

              <View style={{ height: 12 }} />

              <Text style={[styles.label, { color: theme.secondary }]}>
                To Account Email
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
                <AppIcon name="mail" size={18} color={theme.secondary} />
                <TextInput
                  value={toOtherEmail}
                  onChangeText={setToOtherEmail}
                  placeholder="example@email.com"
                  placeholderTextColor={`${theme.text}40`}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={[styles.textInput, { color: theme.text }]}
                />
              </View>

              <View style={{ height: 12 }} />

              <View style={styles.dualRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: theme.secondary }]}>
                    Available Amount
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
                    <Text
                      style={[styles.moneyPrefix, { color: theme.secondary }]}
                    >
                      $
                    </Text>
                    <Text style={[styles.readOnlyValue, { color: theme.text }]}>
                      {fromAccId ? formatMoney(freeMargin) : "0.00"}
                    </Text>
                  </View>
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: theme.secondary }]}>
                    Amount ({String(fromAccount?.currency ?? "USD")})
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
                    <Text
                      style={[styles.moneyPrefix, { color: theme.secondary }]}
                    >
                      $
                    </Text>
                    <TextInput
                      value={otherAmount}
                      onChangeText={(t) => setOtherAmount(t)}
                      placeholder="0.00"
                      placeholderTextColor={`${theme.text}40`}
                      keyboardType="numeric"
                      style={[styles.textInput, { color: theme.text }]}
                      editable={
                        !!fromAccId && !!toOtherAccNumber && !!toOtherEmail
                      }
                    />
                  </View>
                </View>
              </View>

              {showCreditHintAnother ? (
                <Text style={[styles.helperWarn, { color: theme.warning }]}>
                  Credit deduction may apply based on Credit Settings.
                </Text>
              ) : null}

              {!!otherError ? (
                <Text style={[styles.helperError, { color: theme.negative }]}>
                  {otherError}
                </Text>
              ) : null}

              <TouchableOpacity
                onPress={handleSubmitAnother}
                disabled={
                  submittingAnother ||
                  !fromAccId ||
                  !toOtherAccNumber ||
                  !toOtherEmail ||
                  !otherAmount ||
                  !!otherError
                }
                style={[
                  styles.primaryBtn,
                  {
                    backgroundColor: theme.primary,
                    opacity:
                      submittingAnother ||
                      !fromAccId ||
                      !toOtherAccNumber ||
                      !toOtherEmail ||
                      !otherAmount ||
                      !!otherError
                        ? 0.5
                        : 1,
                  },
                ]}
              >
                {submittingAnother ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <ActivityIndicator color="#fff" />
                    <Text style={styles.primaryBtnText}>Processing...</Text>
                  </View>
                ) : (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <AppIcon name="send" size={18} color="#fff" />
                    <Text style={styles.primaryBtnText}>Transfer Funds</Text>
                  </View>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* History */}
        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Transaction History
            </Text>
            <TouchableOpacity
              onPress={() => setHistoryModalOpen(true)}
              style={[
                styles.smallBtn,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
            >
              <AppIcon name="filter-list" size={18} color={theme.primary} />
              <Text style={[styles.smallBtnText, { color: theme.text }]}>
                Filter
              </Text>
            </TouchableOpacity>
          </View>

          <Text
            style={[styles.helper, { color: theme.secondary, marginTop: 4 }]}
          >
            Showing Internal Transfers only
          </Text>

          {historyLoading ? (
            <View style={styles.centerRow}>
              <ActivityIndicator color={theme.primary} />
              <Text style={[styles.helper, { color: theme.secondary }]}>
                Loading transactions...
              </Text>
            </View>
          ) : historyError ? (
            <Text style={[styles.helperError, { color: theme.negative }]}>
              {historyError}
            </Text>
          ) : paginatedTx.length === 0 ? (
            <Text style={[styles.helper, { color: theme.secondary }]}>
              No internal transfer transactions found.
            </Text>
          ) : (
            <View style={{ marginTop: 10 }}>
              {paginatedTx.map((tx, idx) => {
                const id = tx?.id ?? tx?.transactionId ?? `${idx}`;
                const amountNum = Number(tx?.amountUSD ?? tx?.amount ?? 0);
                const status = String(
                  tx?.status ?? tx?.transactionStatus ?? "",
                );
                const createdAt = tx?.createdAt ? new Date(tx.createdAt) : null;
                const dateLabel =
                  createdAt && !Number.isNaN(createdAt.getTime())
                    ? createdAt.toLocaleString()
                    : String(tx?.createdAt ?? "—");
                return (
                  <View
                    key={String(id)}
                    style={[
                      styles.txCard,
                      {
                        backgroundColor: theme.background,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[styles.txId, { color: theme.text }]}
                          numberOfLines={1}
                        >
                          {String(
                            tx?.transactionId ??
                              tx?.referenceNumber ??
                              tx?.id ??
                              "—",
                          )}
                        </Text>
                        <Text
                          style={[styles.txMeta, { color: theme.secondary }]}
                        >
                          {dateLabel}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text
                          style={[
                            styles.txAmount,
                            {
                              color:
                                amountNum < 0 ? theme.negative : theme.positive,
                            },
                          ]}
                        >
                          ${formatMoney(Math.abs(amountNum))}
                        </Text>
                        <Text
                          style={[styles.txMeta, { color: theme.secondary }]}
                        >
                          {status || "—"}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginTop: 8,
                      }}
                    >
                      <Text style={[styles.txMeta, { color: theme.secondary }]}>
                        Acc: {String(tx?.accountNumber ?? "—")}
                      </Text>
                      <Text style={[styles.txMeta, { color: theme.secondary }]}>
                        {String(tx?.currency ?? fromAccount?.currency ?? "USD")}
                      </Text>
                    </View>
                  </View>
                );
              })}

              <View style={styles.paginationRow}>
                <TouchableOpacity
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  style={[
                    styles.pageBtn,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                      opacity: page <= 1 ? 0.5 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.pageBtnText, { color: theme.text }]}>
                    Previous
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.pageLabel, { color: theme.secondary }]}>
                  Page {page} / {maxPage}
                </Text>
                <TouchableOpacity
                  onPress={() => setPage((p) => Math.min(maxPage, p + 1))}
                  disabled={page >= maxPage}
                  style={[
                    styles.pageBtn,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                      opacity: page >= maxPage ? 0.5 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.pageBtnText, { color: theme.text }]}>
                    Next
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <AccountSelectModal
        visible={fromModalOpen}
        onClose={() => setFromModalOpen(false)}
        title="Select From Account"
        accounts={currentUserAccounts}
        selectedId={fromAccId}
        onSelect={(id) => {
          setFromAccId(id);
          // Keep history filter in sync with the source account (matches web UX)
          setHistoryAccountId(id);
        }}
        theme={theme}
      />

      <AccountSelectModal
        visible={toModalOpen}
        onClose={() => setToModalOpen(false)}
        title="Select To Account"
        accounts={currentUserAccounts.filter(
          (a) => String(getAccountId(a)) !== String(fromAccId),
        )}
        selectedId={toAccId}
        onSelect={(id) => setToAccId(id)}
        theme={theme}
      />

      <AccountSelectModal
        visible={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        title="Filter History Account"
        accounts={currentUserAccounts}
        selectedId={historyAccountId}
        onSelect={(id) => {
          setHistoryAccountId(id);
          setPage(1);
        }}
        theme={theme}
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
  headerTitle: { fontSize: 18, fontWeight: "800" },
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  sectionTitle: { fontSize: 15, fontWeight: "800" },
  modeRow: { flexDirection: "row", gap: 12, marginTop: 12 },
  modeCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  modeTitle: { fontSize: 13, fontWeight: "800" },
  modeSub: { fontSize: 11, fontWeight: "600" },
  label: { marginTop: 12, marginBottom: 6, fontSize: 12, fontWeight: "700" },
  selectField: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  selectText: { fontSize: 13, fontWeight: "700", flex: 1 },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  swapBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
  },
  dualRow: { flexDirection: "row", alignItems: "flex-end" },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  moneyPrefix: { fontSize: 14, fontWeight: "900" },
  readOnlyValue: { fontSize: 14, fontWeight: "800" },
  textInput: { flex: 1, fontSize: 14, fontWeight: "800", paddingVertical: 0 },
  helper: { fontSize: 12, fontWeight: "600" },
  helperWarn: { marginTop: 8, fontSize: 12, fontWeight: "700" },
  helperError: { marginTop: 8, fontSize: 12, fontWeight: "700" },
  cardHint: { marginTop: 6, fontSize: 12, fontWeight: "700" },
  ibTextInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 6,
  },
  primaryBtn: {
    marginTop: 14,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 14, fontWeight: "900" },
  centerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },
  txCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  txId: { fontSize: 13, fontWeight: "900" },
  txAmount: { fontSize: 14, fontWeight: "900" },
  txMeta: { fontSize: 11, fontWeight: "700" },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  historyTitle: { fontSize: 13, fontWeight: "900" },
  historySub: { marginTop: 2, fontSize: 11, fontWeight: "700" },
  historyAmt: { fontSize: 13, fontWeight: "900" },
  paginationRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pageBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  pageBtnText: { fontSize: 12, fontWeight: "800" },
  pageLabel: { fontSize: 12, fontWeight: "800" },

  // KYC gating
  kycCard: {
    marginHorizontal: 16,
    marginTop: 18,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  kycIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  kycTitle: { fontSize: 14, fontWeight: "900" },
  kycDesc: { marginTop: 4, fontSize: 12, fontWeight: "600" },

  // Modals
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
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  modalRow: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  modalRowTitle: { fontSize: 13, fontWeight: "900" },
  modalRowSub: { marginTop: 2, fontSize: 11, fontWeight: "700" },

  smallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  smallBtnText: { fontSize: 12, fontWeight: "800" },
});
