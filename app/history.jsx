import { useAuthStore } from "@/store/authStore";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  getClientAccountTransactions,
  getOrderHistory,
} from "../api/getServices";
import AppIcon from "../components/AppIcon";
import { useAppTheme } from "../contexts/ThemeContext";

const TRANSACTION_TYPES = [
  "Deposit",
  "Withdrawal",
  "InternalTransfer",
  "IBwithdrawal",
];

const HistoryScreen = () => {
  const router = useRouter();
  const { theme } = useAppTheme();
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  const [activeTab, setActiveTab] = useState("orders"); // 'orders' | 'transactions'

  const [closedOrders, setClosedOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState("");
  const [transactionType, setTransactionType] = useState("");
  const [includePending, setIncludePending] = useState(false);

  const selectedAccountId = useAuthStore((state) => state.selectedAccountId);
  const accounts = useAuthStore((state) => state.accounts);

  const selectedAccount = useMemo(() => {
    if (!selectedAccountId) return null;
    return (accounts || []).find(
      (a) => String(a?.accountId ?? a?.id) === String(selectedAccountId),
    );
  }, [accounts, selectedAccountId]);

  const account = useMemo(
    () => ({
      id: selectedAccountId ?? "—",
      type: selectedAccount?.type ?? selectedAccount?.accountType ?? "",
      currency: selectedAccount?.currency ?? "",
    }),
    [selectedAccountId, selectedAccount],
  );

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (!selectedAccountId) {
        if (mounted) {
          setClosedOrders([]);
          setError("");
          setLoading(false);
        }
        return;
      }

      try {
        if (mounted) {
          setLoading(true);
          setError("");
        }

        const resp = await getOrderHistory(selectedAccountId);
        const data = Array.isArray(resp?.data) ? resp.data : [];
        if (mounted) setClosedOrders(data);
      } catch (e) {
        console.warn("Failed to load order history", e);
        if (mounted) {
          setClosedOrders([]);
          setError(e?.message ?? "Failed to load order history");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [selectedAccountId]);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (activeTab !== "transactions") return;

      if (!selectedAccountId) {
        if (mounted) {
          setTransactions([]);
          setTxError("");
          setTxLoading(false);
        }
        return;
      }

      try {
        if (mounted) {
          setTxLoading(true);
          setTxError("");
        }

        const resp = await getClientAccountTransactions({
          accountId: selectedAccountId,
          transactionType: transactionType || undefined,
          includePending,
        });
        const data = Array.isArray(resp?.data) ? resp.data : [];
        if (mounted) setTransactions(data);
      } catch (e) {
        console.warn("Failed to load account transactions", e);
        if (mounted) {
          setTransactions([]);
          setTxError(e?.message ?? "Failed to load transactions");
        }
      } finally {
        if (mounted) setTxLoading(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [activeTab, selectedAccountId, transactionType, includePending]);

  const getOrderId = (o) => o?.orderId ?? o?.id;

  const getTransactionId = (t) =>
    t?.id ??
    t?.transactionId ??
    `${t?.transactionType ?? "tx"}-${t?.createdAt ?? ""}`;

  const formatPrice = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return "--";
    return n.toFixed(n < 10 ? 5 : 2);
  };

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: theme.card }]}
          >
            <AppIcon name="arrow-back" size={20} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Order History
          </Text>
        </View>
      </View>

      {/* Account Info */}
      <View style={styles.accountInfoOuter}>
        <View style={[styles.accountInfoCard, { backgroundColor: theme.card }]}>
          <View>
            {/* <Text
              style={{ color: theme.secondary }}
            >
              {account.type} • {account.currency}
            </Text> */}
            <Text style={[styles.accountInfoText, { color: theme.text }]}>
              Account{" "}
              {selectedAccount
                ? String(selectedAccount?.accountNumber ?? "—")
                : "—"}
            </Text>
          </View>
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 8,
              backgroundColor: theme.primary + "20",
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: theme.primary,
              }}
            >
              {activeTab === "orders"
                ? loading
                  ? "Loading..."
                  : `${closedOrders.length} Orders`
                : txLoading
                  ? "Loading..."
                  : `${transactions.length} Transactions`}
            </Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsOuter}>
        <View
          style={{
            flexDirection: "row",
            backgroundColor: theme.card,
            borderRadius: 12,
            padding: 4,
          }}
        >
          <TouchableOpacity
            onPress={() => setActiveTab("orders")}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              alignItems: "center",
              backgroundColor:
                activeTab === "orders" ? theme.primary + "20" : "transparent",
            }}
          >
            <Text
              style={{
                color: activeTab === "orders" ? theme.primary : theme.secondary,
                fontWeight: "700",
                fontSize: 12,
              }}
            >
              Orders
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("transactions")}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              alignItems: "center",
              backgroundColor:
                activeTab === "transactions"
                  ? theme.primary + "20"
                  : "transparent",
            }}
          >
            <Text
              style={{
                color:
                  activeTab === "transactions"
                    ? theme.primary
                    : theme.secondary,
                fontWeight: "700",
                fontSize: 12,
              }}
            >
              Transactions
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === "transactions" && (
        <View style={styles.filtersOuter}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            <TouchableOpacity
              onPress={() => setTransactionType("")}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: !transactionType
                  ? theme.primary + "20"
                  : theme.card,
                borderWidth: 1,
                borderColor: !transactionType ? theme.primary : theme.border,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: !transactionType ? theme.primary : theme.secondary,
                }}
              >
                All
              </Text>
            </TouchableOpacity>

            {TRANSACTION_TYPES.map((t) => {
              const selected = transactionType === t;
              return (
                <TouchableOpacity
                  key={t}
                  onPress={() => setTransactionType(selected ? "" : t)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor: selected
                      ? theme.primary + "20"
                      : theme.card,
                    borderWidth: 1,
                    borderColor: selected ? theme.primary : theme.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: selected ? theme.primary : theme.secondary,
                    }}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* List */}
      {activeTab === "orders" ? (
        <FlatList
          data={closedOrders}
          keyExtractor={(o) => String(getOrderId(o))}
          contentContainerStyle={{
            paddingBottom: 40,
            paddingHorizontal: 12,
            marginTop: 12,
          }}
          renderItem={({ item }) => {
            const orderId = item.orderId ?? item.id;
            const symbol = item.symbol ?? "—";
            const orderType = item.orderType ?? item.side ?? "BUY";
            const entryPrice = item.entryPrice ?? 0;
            const exitPrice = item.marketPrice ?? item.exitPrice ?? 0;
            const lotSize = item.lotSize ?? 0;
            const pnl = item.profitOrLoss ?? item.pnl ?? 0;
            const pnlPercent =
              item.profitOrLossInPercentage ?? item.pnlPercent ?? 0;
            const commission = item.commission ?? 0;
            const openTime = item.orderTime ?? item.openTime;
            const closeTime = item.orderClosedAt ?? item.closeTime;
            const isPositive = pnl >= 0;
            const isBuy = String(orderType).toLowerCase().includes("buy");
            const isExpanded = expandedOrderId === orderId;

            return (
              <TouchableOpacity
                onPress={() => setExpandedOrderId(isExpanded ? null : orderId)}
                style={{
                  marginVertical: 6,
                  borderRadius: 12,
                  backgroundColor: theme.card,
                  borderWidth: isExpanded ? 1.5 : 1,
                  borderColor: isExpanded ? theme.primary : theme.border,
                  overflow: "hidden",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                {/* Collapsed Row View */}
                {!isExpanded ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 12,
                      paddingHorizontal: 14,
                      gap: 8,
                    }}
                  >
                    {/* Left: Symbol & Type */}
                    <View
                      style={{
                        flex: 1.4,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <View
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 8,
                          backgroundColor: isBuy
                            ? theme.positive + "15"
                            : theme.negative + "15",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: "700",
                            color: isBuy ? theme.positive : theme.negative,
                          }}
                        >
                          {isBuy ? "BUY" : "SELL"}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 12,
                            color: theme.secondary,
                            fontWeight: "500",
                          }}
                        >
                          {symbol}
                        </Text>
                        <Text style={{ fontSize: 10, color: theme.secondary }}>
                          {formatPrice(entryPrice)}
                        </Text>
                      </View>
                    </View>

                    {/* Middle: Lot Size */}
                    <View
                      style={{
                        width: 60,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          color: theme.secondary,
                          marginBottom: 2,
                        }}
                      >
                        Lots
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          color: theme.text,
                          fontWeight: "700",
                        }}
                      >
                        {lotSize.toFixed(2)}
                      </Text>
                    </View>

                    {/* Right: P&L */}
                    <View
                      style={{
                        width: 75,
                        alignItems: "flex-end",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "700",
                          color: isPositive ? theme.positive : theme.negative,
                          letterSpacing: 0.2,
                        }}
                      >
                        ${pnl.toFixed(2)}
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "600",
                          color: isPositive ? theme.positive : theme.negative,
                        }}
                      >
                        {isPositive ? "+" : ""}
                        {pnlPercent.toFixed(2)}%
                      </Text>
                    </View>

                    {/* Expand Indicator */}
                    <View
                      style={{
                        width: 24,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ fontSize: 18, color: theme.secondary }}>
                        ›
                      </Text>
                    </View>
                  </View>
                ) : (
                  /* Expanded Detail View */
                  <View style={{ padding: 14 }}>
                    {/* Header: Symbol & Order Type */}
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 12,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 12,
                            color: theme.secondary,
                            marginBottom: 2,
                            fontWeight: "500",
                          }}
                        >
                          {closeTime
                            ? new Date(closeTime).toLocaleDateString()
                            : "--"}
                        </Text>
                        <Text
                          style={{
                            fontSize: 18,
                            color: theme.text,
                            fontWeight: "700",
                            letterSpacing: 0.5,
                          }}
                        >
                          {symbol}
                        </Text>
                      </View>
                      <View
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 20,
                          backgroundColor: isBuy
                            ? theme.positive + "15"
                            : theme.negative + "15",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: "700",
                            color: isBuy ? theme.positive : theme.negative,
                            letterSpacing: 0.5,
                          }}
                        >
                          {isBuy ? "BUY" : "SELL"}
                        </Text>
                      </View>
                    </View>

                    {/* Prices Row: Entry, Exit, Lot Size */}
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        gap: 10,
                        marginBottom: 12,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 10,
                            color: theme.secondary,
                            marginBottom: 3,
                            fontWeight: "500",
                          }}
                        >
                          Entry
                        </Text>
                        <Text
                          style={{
                            fontSize: 14,
                            color: theme.text,
                            fontWeight: "700",
                            letterSpacing: 0.2,
                          }}
                        >
                          {formatPrice(entryPrice)}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 10,
                            color: theme.secondary,
                            marginBottom: 3,
                            fontWeight: "500",
                          }}
                        >
                          Exit
                        </Text>
                        <Text
                          style={{
                            fontSize: 14,
                            color: theme.text,
                            fontWeight: "700",
                            letterSpacing: 0.2,
                          }}
                        >
                          {formatPrice(exitPrice)}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 10,
                            color: theme.secondary,
                            marginBottom: 3,
                            fontWeight: "500",
                          }}
                        >
                          Lot Size
                        </Text>
                        <Text
                          style={{
                            fontSize: 14,
                            color: theme.text,
                            fontWeight: "700",
                            letterSpacing: 0.2,
                          }}
                        >
                          {lotSize.toFixed(2)}
                        </Text>
                      </View>
                    </View>

                    {/* P&L Row: Profit/Loss & Percentage */}
                    <View
                      style={{
                        flexDirection: "row",
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        borderRadius: 10,
                        backgroundColor: isPositive
                          ? theme.positive + "12"
                          : theme.negative + "12",
                        borderWidth: 1,
                        borderColor: isPositive
                          ? theme.positive + "30"
                          : theme.negative + "30",
                        gap: 12,
                        marginBottom: 10,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 10,
                            color: theme.secondary,
                            marginBottom: 3,
                            fontWeight: "500",
                          }}
                        >
                          P&L
                        </Text>
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: "700",
                            color: isPositive ? theme.positive : theme.negative,
                            letterSpacing: 0.3,
                          }}
                        >
                          ${pnl.toFixed(2)}
                        </Text>
                      </View>
                      <View
                        style={{ width: 1, backgroundColor: theme.border }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 10,
                            color: theme.secondary,
                            marginBottom: 3,
                            fontWeight: "500",
                          }}
                        >
                          Return %
                        </Text>
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: "700",
                            color: isPositive ? theme.positive : theme.negative,
                            letterSpacing: 0.3,
                          }}
                        >
                          {isPositive ? "+" : ""}
                          {pnlPercent.toFixed(2)}%
                        </Text>
                      </View>
                    </View>

                    {/* Additional Details Row 1 */}
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        gap: 10,
                        marginBottom: 10,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 10,
                            color: theme.secondary,
                            marginBottom: 3,
                            fontWeight: "500",
                          }}
                        >
                          Commission
                        </Text>
                        <Text
                          style={{
                            fontSize: 14,
                            color: theme.negative,
                            fontWeight: "700",
                          }}
                        >
                          ${commission.toFixed(2)}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 10,
                            color: theme.secondary,
                            marginBottom: 3,
                            fontWeight: "500",
                          }}
                        >
                          Duration
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            color: theme.text,
                            fontWeight: "700",
                          }}
                        >
                          {openTime && closeTime
                            ? `${Math.floor((new Date(closeTime) - new Date(openTime)) / 3600000)}h`
                            : "--"}
                        </Text>
                      </View>
                    </View>

                    {/* Time Info */}
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 10,
                            color: theme.secondary,
                            marginBottom: 3,
                            fontWeight: "500",
                          }}
                        >
                          Opened
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            color: theme.text,
                            fontWeight: "700",
                          }}
                        >
                          {openTime
                            ? new Date(openTime).toLocaleTimeString()
                            : "--"}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 10,
                            color: theme.secondary,
                            marginBottom: 3,
                            fontWeight: "500",
                          }}
                        >
                          Closed
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            color: theme.text,
                            fontWeight: "700",
                          }}
                        >
                          {closeTime
                            ? new Date(closeTime).toLocaleTimeString()
                            : "--"}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={() => (
            <View style={styles.emptyOuter}>
              <View style={styles.emptyInner}>
                <View
                  style={[styles.emptyIcon, { backgroundColor: theme.card }]}
                >
                  <AppIcon name="history" size={36} color={theme.secondary} />
                </View>

                <Text style={[styles.emptyTitle, { color: theme.text }]}>
                  {loading
                    ? "Loading history..."
                    : error
                      ? "Failed to load"
                      : "No closed orders"}
                </Text>

                {!!error && !loading && (
                  <Text
                    style={[
                      styles.emptyError,
                      { color: theme.negative ?? theme.secondary },
                    ]}
                  >
                    {error}
                  </Text>
                )}

                <Text
                  style={[styles.emptySubtitle, { color: theme.secondary }]}
                >
                  {loading
                    ? "Please wait while we fetch your orders."
                    : "Your closed trades will appear here."}
                </Text>
              </View>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(t) => String(getTransactionId(t))}
          contentContainerStyle={{
            paddingBottom: 40,
            paddingHorizontal: 12,
            marginTop: 12,
          }}
          renderItem={({ item }) => {
            const type = item.transactionType ?? item.type ?? "—";
            const amount = Number(
              item.amount ?? item.value ?? item.transactionAmount ?? 0,
            );
            const currency = item.currency ?? account.currency ?? "";
            const when =
              item.createdAt ?? item.transactionTime ?? item.date ?? item.time;
            const remark = item.remark ?? item.description ?? "";

            const isIn = ["Deposit", "CreditIn"].includes(type);
            const isOut = ["Withdrawal", "CreditOut", "IBwithdrawal"].includes(
              type,
            );
            const signedAmount = isOut ? -Math.abs(amount) : Math.abs(amount);
            const amountColor =
              signedAmount >= 0 ? theme.positive : theme.negative;

            return (
              <View
                style={{
                  marginVertical: 6,
                  borderRadius: 12,
                  backgroundColor: theme.card,
                  borderWidth: 1,
                  borderColor: theme.border,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        color: theme.text,
                        fontWeight: "700",
                      }}
                    >
                      {type}
                    </Text>
                    <Text
                      style={{
                        fontSize: 10,
                        color: theme.secondary,
                        marginTop: 2,
                      }}
                    >
                      {when ? new Date(when).toLocaleString() : "--"}
                    </Text>
                    {!!remark && (
                      <Text
                        style={{
                          fontSize: 10,
                          color: theme.secondary,
                          marginTop: 6,
                        }}
                        numberOfLines={2}
                      >
                        {remark}
                      </Text>
                    )}
                  </View>

                  <View style={{ alignItems: "flex-end" }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "800",
                        color: amountColor,
                      }}
                    >
                      {signedAmount >= 0 ? "+" : "-"}
                      {Math.abs(signedAmount).toFixed(2)} {currency}
                    </Text>
                    <Text
                      style={{
                        fontSize: 10,
                        color: theme.secondary,
                        marginTop: 2,
                      }}
                    >
                      {isIn ? "In" : isOut ? "Out" : "—"}
                    </Text>
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={() => (
            <View style={styles.emptyOuter}>
              <View style={styles.emptyInner}>
                <View
                  style={[styles.emptyIcon, { backgroundColor: theme.card }]}
                >
                  <AppIcon name="history" size={36} color={theme.secondary} />
                </View>

                <Text style={[styles.emptyTitle, { color: theme.text }]}>
                  {txLoading
                    ? "Loading transactions..."
                    : txError
                      ? "Failed to load"
                      : "No transactions"}
                </Text>

                {!!txError && !txLoading && (
                  <Text
                    style={[
                      styles.emptyError,
                      { color: theme.negative ?? theme.secondary },
                    ]}
                  >
                    {txError}
                  </Text>
                )}

                <Text
                  style={[styles.emptySubtitle, { color: theme.secondary }]}
                >
                  {txLoading
                    ? "Please wait while we fetch your transactions."
                    : "Your account transactions will appear here."}
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
  },
  accountInfoOuter: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  accountInfoCard: {
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  accountInfoText: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
  tabsOuter: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  filtersOuter: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  emptyOuter: {
    paddingHorizontal: 16,
    marginTop: 40,
  },
  emptyInner: {
    alignItems: "center",
    marginTop: 48,
  },
  emptyIcon: {
    width: 112,
    height: 112,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: "600",
  },
  emptyError: {
    marginTop: 8,
    fontSize: 12,
    textAlign: "center",
  },
  emptySubtitle: {
    marginTop: 4,
    fontSize: 12,
    textAlign: "center",
  },
});

export default HistoryScreen;
