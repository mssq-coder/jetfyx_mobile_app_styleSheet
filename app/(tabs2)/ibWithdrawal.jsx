import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StatusBar,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
    getClientAccountTransactions,
    getDetailsByAmountAndCategory,
    getFinanceOptions,
} from "../../api/allServices";
import { getIbOverviewDetails, getIbOverviewFinance } from "../../api/ibPortal";
import AccountSelectorModal from "../../components/Accounts/AccountSelectorModal";
import AppIcon from "../../components/AppIcon";
import IbWithdrawalDetailsModal from "../../components/IbWithdrawalDetailsModal";
import PreviewedImage from "../../components/PreviewedImage";
import { useAppTheme } from "../../contexts/ThemeContext";
import usePullToRefresh from "../../hooks/usePullToRefresh";
import { useAuthStore } from "../../store/authStore";
import { showErrorToast, showInfoToast } from "../../utils/toast";
import styles from "./withdrawal.styles";

const MODE = "withdrawal";

export default function IbWithdrawalScreen() {
  const { theme } = useAppTheme();

  const {
    accounts,
    sharedAccounts,
    fullName,
    selectedAccountId,
    setSelectedAccount,
    refreshProfile,
  } = useAuthStore();

  const scrollRef = useRef(null);
  const [activeTab, setActiveTab] = useState("Withdrawal");
  const [accountModalOpen, setAccountModalOpen] = useState(false);

  const { refreshing, runRefresh } = usePullToRefresh();

  const selectedAccount = useMemo(() => {
    const id = selectedAccountId;
    const list = [...(accounts || []), ...(sharedAccounts || [])];
    const found = list.find((a) => String(a.accountId ?? a.id) === String(id));
    return found || list?.[0] || null;
  }, [accounts, sharedAccounts, selectedAccountId]);

  const accountId = selectedAccount?.accountId ?? selectedAccount?.id ?? null;

  const [ibDetails, setIbDetails] = useState(null);
  const [ibFinance, setIbFinance] = useState(null);
  const [loading, setLoading] = useState(false);

  // IB Withdrawal Methods (Bank/Card/UPI...) - same source as standard withdrawal
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedMethodName, setSelectedMethodName] = useState(null);

  const getPaymentType = (categoryName) => {
    if (!categoryName) return null;
    const name = String(categoryName).toLowerCase();
    if (
      name.includes("bank") ||
      name.includes("wire") ||
      name.includes("transfer")
    ) {
      return "bank";
    }
    if (name.includes("upi")) {
      return "upi";
    }
    if (
      name.includes("card") ||
      name.includes("credit") ||
      name.includes("debit")
    ) {
      return "card";
    }
    return "bank";
  };

  const [amount, setAmount] = useState("");
  const [proceeding, setProceeding] = useState(false);

  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [currentReferenceNumber, setCurrentReferenceNumber] = useState(null);
  const [currentImageUrl, setCurrentImageUrl] = useState(null);
  const [currentPaymentName, setCurrentPaymentName] = useState(null);
  const [currentProcessingTime, setCurrentProcessingTime] = useState(null);
  const [withdrawalPayloadBase, setWithdrawalPayloadBase] = useState(null);
  const [detailsJsonBase, setDetailsJsonBase] = useState(null);
  const [fieldValues, setFieldValues] = useState({});

  const [bankDetails, setBankDetails] = useState({
    accountHolderName: "",
    accountNumber: "",
    bankName: "",
    branchName: "",
    ifscCode: "",
  });

  const [upiDetails, setUpiDetails] = useState({ upiId: "" });

  const [cardDetails, setCardDetails] = useState({
    cardHolderName: "",
    cardNumber: "",
    expiryDate: "",
    cardType: "",
    bankName: "",
  });

  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const availableBalance = useMemo(() => {
    const f = ibFinance || {};
    const v =
      f?.availableBalance ??
      f?.availableToWithdrawal ??
      f?.availableToWithdraw ??
      f?.available ??
      f?.availableBalanceToWithdraw ??
      0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }, [ibFinance]);

  const totalCommission = useMemo(() => {
    const f = ibFinance || {};
    const v =
      f?.totalCommission ??
      f?.totalComission ??
      f?.commissionTotal ??
      f?.allTimeCommission ??
      0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }, [ibFinance]);

  const totalWithdrawn = useMemo(() => {
    const f = ibFinance || {};
    const v =
      f?.totalWithdrawal ??
      f?.totalWithdrawn ??
      f?.withdrawalTotal ??
      f?.totalWithdrawals ??
      0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }, [ibFinance]);

  const displayIbAccountNumber =
    ibDetails?.displayAccountNumber ||
    ibDetails?.accountNumber ||
    ibDetails?.ibAccountNumber ||
    ibDetails?.referenceId ||
    "—";

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
        e?.response?.data?.message || e?.message || "Failed to load IB balance",
      );
    } finally {
      setLoading(false);
    }
  };

  const loadIbWithdrawalMethods = async () => {
    try {
      setLoadingOptions(true);
      setOptionsError(null);
      const res = await getFinanceOptions(MODE);
      const list = res?.categories || res?.data?.categories || [];
      const safe = Array.isArray(list) ? list : [];
      setCategories(safe);

      const firstCatId = safe.length ? safe[0].id : null;
      setSelectedCategoryId((prev) => prev ?? firstCatId);
      const firstMethod = safe.length
        ? (safe[0]?.methods?.[0]?.name ?? null)
        : null;
      setSelectedMethodName((prev) => prev ?? firstMethod);
    } catch (e) {
      setOptionsError(
        e?.response?.data?.message ||
          e?.message ||
          "Failed to load withdrawal methods",
      );
    } finally {
      setLoadingOptions(false);
    }
  };

  const loadHistory = async () => {
    if (!accountId) return;
    setHistoryLoading(true);
    try {
      const resp = await getClientAccountTransactions({
        accountId,
        transactionType: "IBwithdrawal",
        includePending: true,
      });
      const rows = Array.isArray(resp?.data) ? resp.data : [];
      const filtered = rows.filter(
        (tx) => String(tx?.transactionType || "") === "IBwithdrawal",
      );
      setHistory(filtered);
    } catch (e) {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleRefresh = () =>
    runRefresh(async () => {
      await Promise.all([loadIb(), loadHistory(), loadIbWithdrawalMethods()]);
    });

  useEffect(() => {
    // Scroll to top when switching tab (web-like behavior)
    try {
      scrollRef.current?.scrollTo?.({ y: 0, animated: true });
    } catch (_e) {
      // ignore
    }
  }, [activeTab]);

  useEffect(() => {
    loadIb();
    loadHistory();
    loadIbWithdrawalMethods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  const selectedCategory = useMemo(() => {
    return (
      (categories || []).find(
        (c) => String(c.id) === String(selectedCategoryId),
      ) || null
    );
  }, [categories, selectedCategoryId]);

  const selectedMethod = useMemo(() => {
    const list = selectedCategory?.methods || [];
    return (
      list.find((m) => String(m.name) === String(selectedMethodName)) || null
    );
  }, [selectedCategory, selectedMethodName]);

  const paymentType = useMemo(() => {
    return getPaymentType(selectedCategory?.name);
  }, [selectedCategory]);

  const getCurrentFieldValues = () => {
    switch (paymentType) {
      case "bank":
        return {
          AccountHolderName: bankDetails.accountHolderName,
          AccountNumber: bankDetails.accountNumber,
          BankName: bankDetails.bankName,
          BranchName: bankDetails.branchName,
          IFSCCode: bankDetails.ifscCode,
        };
      case "upi":
        return { UPIId: upiDetails.upiId };
      case "card":
        return {
          CardHolderName: cardDetails.cardHolderName,
          CardNumber: cardDetails.cardNumber,
          ExpiryDate: cardDetails.expiryDate,
          CardType: cardDetails.cardType,
          BankName: cardDetails.bankName,
        };
      default:
        return {};
    }
  };

  const validateFields = () => {
    switch (paymentType) {
      case "bank":
        if (!bankDetails.accountHolderName.trim()) {
          showInfoToast("Please enter account holder name.");
          return false;
        }
        if (!bankDetails.accountNumber.trim()) {
          showInfoToast("Please enter account number.");
          return false;
        }
        if (!bankDetails.bankName.trim()) {
          showInfoToast("Please enter bank name.");
          return false;
        }
        return true;
      case "upi":
        if (!upiDetails.upiId.trim()) {
          showInfoToast("Please enter UPI ID.");
          return false;
        }
        return true;
      case "card":
        if (!cardDetails.cardHolderName.trim()) {
          showInfoToast("Please enter card holder name.");
          return false;
        }
        if (!cardDetails.cardNumber.trim()) {
          showInfoToast("Please enter card number.");
          return false;
        }
        if (!cardDetails.expiryDate.trim()) {
          showInfoToast("Please enter expiry date.");
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const validateAndProceed = async () => {
    if (proceeding) return;
    if (!accountId) {
      showInfoToast("Please select an account.");
      return;
    }

    if (!selectedCategory) {
      showInfoToast("Please select a withdrawal method.");
      return;
    }

    if (!validateFields()) {
      return;
    }

    const amt = Number(String(amount).replace(/[^0-9.]/g, ""));
    if (!amount || !Number.isFinite(amt) || amt < 10) {
      showInfoToast("Enter minimum amount 10.");
      return;
    }
    if (amt > availableBalance) {
      showInfoToast(
        `Insufficient available balance. Max: $${availableBalance.toFixed(2)}`,
      );
      return;
    }

    setProceeding(true);
    try {
      const methodName =
        selectedMethod?.name || selectedCategory?.name || "IBBalance";
      const detailsFields = getCurrentFieldValues();

      const response = await getDetailsByAmountAndCategory(
        selectedCategory?.name,
        amt,
        MODE,
        "USD",
      );

      const data = response?.data?.category?.methods || [];
      const referenceNumber = response?.data?.referenceNumber || null;
      const imageUrl = data[0]?.imageUrl || selectedCategory?.imageUrl || null;
      const paymentName =
        data[0]?.name ||
        methodName ||
        selectedCategory?.name ||
        "Selected Method";
      const processingTime =
        data[0]?.processingTime || selectedCategory?.processingTime || "";

      setCurrentReferenceNumber(referenceNumber);
      setCurrentImageUrl(imageUrl);
      setCurrentPaymentName(paymentName);
      setCurrentProcessingTime(processingTime);
      setFieldValues(detailsFields);

      setWithdrawalPayloadBase({
        AccountId: accountId,
        AccountNumber: String(selectedAccount?.accountNumber || ""),
        Amount: amt,
        Currency: "USD",
        PaymentCategory: selectedCategory?.name,
        PaymentMethod: methodName,
      });

      setDetailsJsonBase({
        PaymentCategory: selectedCategory?.name,
        PaymentMethod: methodName,
        paymentMethod: methodName,
        transactionType: "IBwithdrawal",
        ...detailsFields,
      });

      setDetailsModalVisible(true);
    } catch (e) {
      showErrorToast(
        e?.response?.data?.message ||
          e?.message ||
          "Failed to retrieve withdrawal details.",
      );
    } finally {
      setProceeding(false);
    }
  };

  const formatMoney = (value) => {
    const n = Number(value ?? 0);
    if (!Number.isFinite(n)) return "0.00";
    return n.toFixed(2);
  };

  const accountLabel = useMemo(() => {
    if (!selectedAccount) return "Select account";
    const number = selectedAccount.accountNumber ?? selectedAccount.id ?? "—";
    const type =
      selectedAccount.accountTypeName ||
      selectedAccount.type ||
      selectedAccount.accountType ||
      "Account";
    return `#${number} • ${type}`;
  }, [selectedAccount]);

  const SummaryCard = ({ title, value, icon, iconColor }) => {
    return (
      <View
        style={[
          styles.summaryCard,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <View style={styles.rowBetween}>
          <Text style={[styles.summaryTitle, { color: theme.secondary }]}>
            {title}
          </Text>
          <AppIcon name={icon} size={20} color={iconColor || theme.primary} />
        </View>
        <Text style={[styles.summaryValue, { color: theme.text }]}>
          ${formatMoney(value)}
        </Text>
      </View>
    );
  };

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
        <Text style={styles.headerTitle}>Transactions</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Text style={[styles.pageTitle, { color: theme.text }]}>
          Transactions
        </Text>
        <Text style={[styles.pageSubTitle, { color: theme.secondary }]}>
          Manage your withdrawals and internal transfers
        </Text>

        <View style={styles.summaryGrid}>
          <SummaryCard
            title="Total Commission"
            value={totalCommission}
            icon="payments"
            iconColor={theme.primary}
          />
          <SummaryCard
            title="Available Balance"
            value={availableBalance}
            icon="account-balance-wallet"
            iconColor={theme.primary}
          />
          <SummaryCard
            title="Total Withdrawn"
            value={totalWithdrawn}
            icon="south"
            iconColor={theme.primary}
          />
        </View>

        <TouchableOpacity
          onPress={() => setAccountModalOpen(true)}
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={styles.rowCenter}>
            <AppIcon name="badge" color={theme.primary} size={20} />
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.cardTitle, { color: theme.text }]}
                numberOfLines={1}
              >
                Account
              </Text>
              <Text
                style={[styles.cardSub, { color: theme.secondary }]}
                numberOfLines={1}
              >
                {accountLabel}
              </Text>
            </View>
            <AppIcon name="expand-more" color={theme.secondary} size={22} />
          </View>
        </TouchableOpacity>

        <View
          style={[
            styles.tabBar,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <TouchableOpacity
            onPress={() => setActiveTab("Withdrawal")}
            style={[
              styles.tabBtn,
              activeTab === "Withdrawal"
                ? { backgroundColor: theme.primary }
                : { backgroundColor: "transparent" },
            ]}
          >
            <AppIcon
              name="south"
              size={18}
              color={activeTab === "Withdrawal" ? "#fff" : theme.secondary}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === "Withdrawal" ? "#fff" : theme.text },
              ]}
            >
              Withdrawals
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab("Internal Transfer")}
            style={[
              styles.tabBtn,
              activeTab === "Internal Transfer"
                ? { backgroundColor: theme.primary }
                : { backgroundColor: "transparent" },
            ]}
          >
            <AppIcon
              name="swap-horiz"
              size={18}
              color={
                activeTab === "Internal Transfer" ? "#fff" : theme.secondary
              }
            />
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    activeTab === "Internal Transfer" ? "#fff" : theme.text,
                },
              ]}
            >
              Internal Transfers
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab !== "Withdrawal" ? (
          <View
            style={[
              styles.card,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Internal Transfers
            </Text>
            <Text style={[styles.cardSub, { color: theme.secondary }]}>
              Transfer IB funds between accounts.
            </Text>
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/(tabs2)/internalTransfer",
                  params: { flow: "ib" },
                })
              }
              style={[styles.primaryButton, { backgroundColor: theme.primary }]}
            >
              <Text style={styles.primaryButtonText}>
                Go to Internal Transfer
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              IB Withdrawal Methods
            </Text>

            {loadingOptions ? (
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    alignItems: "center",
                  },
                ]}
              >
                <ActivityIndicator color={theme.primary} />
                <Text
                  style={[
                    styles.cardSub,
                    { color: theme.secondary, marginTop: 8 },
                  ]}
                >
                  Loading methods...
                </Text>
              </View>
            ) : optionsError ? (
              <View
                style={[
                  styles.card,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  Failed to load
                </Text>
                <Text style={[styles.cardSub, { color: theme.secondary }]}>
                  {optionsError}
                </Text>
                <Text
                  style={[
                    styles.cardSub,
                    { color: theme.secondary, marginTop: 6 },
                  ]}
                >
                  Endpoint: /FinanceOptions?mode=withdrawal
                </Text>
              </View>
            ) : categories.length ? (
              <View style={{ marginBottom: 12 }}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 12, paddingVertical: 4 }}
                >
                  {(Array.isArray(categories) ? categories : []).map((cat) => {
                    const active =
                      String(cat.id) === String(selectedCategoryId);
                    return (
                      <TouchableOpacity
                        key={String(cat.id)}
                        onPress={() => {
                          setSelectedCategoryId(cat.id);
                          const nextMethod = cat?.methods?.[0] || null;
                          setSelectedMethodName(nextMethod?.name ?? null);

                          // reset fields when switching payment option
                          setBankDetails({
                            accountHolderName: "",
                            accountNumber: "",
                            bankName: "",
                            branchName: "",
                            ifscCode: "",
                          });
                          setUpiDetails({ upiId: "" });
                          setCardDetails({
                            cardHolderName: "",
                            cardNumber: "",
                            expiryDate: "",
                            cardType: "",
                            bankName: "",
                          });
                        }}
                        style={[
                          styles.optionCard,
                          {
                            backgroundColor: theme.card,
                            borderColor: active ? theme.primary : theme.border,
                          },
                        ]}
                      >
                        <PreviewedImage
                          uriOrPath={cat.imageUrl}
                          style={styles.optionImage}
                          theme={theme}
                          fallbackIcon="payments"
                        />
                        <Text
                          style={[styles.optionTitle, { color: theme.text }]}
                          numberOfLines={1}
                        >
                          {cat.name}
                        </Text>
                        <Text
                          style={[styles.optionSub, { color: theme.secondary }]}
                          numberOfLines={1}
                        >
                          {cat.processingTime || "—"}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {selectedCategory ? (
                  <View style={{ marginTop: 14 }}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>
                      {paymentType === "bank"
                        ? "Bank Details"
                        : paymentType === "upi"
                          ? "UPI Details"
                          : paymentType === "card"
                            ? "Card Details"
                            : "Payment Details"}
                    </Text>

                    {paymentType === "bank" && (
                      <>
                        <View
                          style={[
                            styles.inputWrap,
                            {
                              backgroundColor: theme.card,
                              borderColor: theme.border,
                              marginBottom: 10,
                            },
                          ]}
                        >
                          <TextInput
                            value={bankDetails.accountHolderName}
                            onChangeText={(t) =>
                              setBankDetails((prev) => ({
                                ...prev,
                                accountHolderName: t,
                              }))
                            }
                            placeholder="Account Holder Name *"
                            placeholderTextColor={theme.secondary}
                            style={[styles.textInput, { color: theme.text }]}
                          />
                        </View>
                        <View
                          style={[
                            styles.inputWrap,
                            {
                              backgroundColor: theme.card,
                              borderColor: theme.border,
                              marginBottom: 10,
                            },
                          ]}
                        >
                          <TextInput
                            value={bankDetails.accountNumber}
                            onChangeText={(t) =>
                              setBankDetails((prev) => ({
                                ...prev,
                                accountNumber: t,
                              }))
                            }
                            placeholder="Account Number *"
                            placeholderTextColor={theme.secondary}
                            keyboardType="number-pad"
                            style={[styles.textInput, { color: theme.text }]}
                          />
                        </View>
                        <View
                          style={[
                            styles.inputWrap,
                            {
                              backgroundColor: theme.card,
                              borderColor: theme.border,
                              marginBottom: 10,
                            },
                          ]}
                        >
                          <TextInput
                            value={bankDetails.bankName}
                            onChangeText={(t) =>
                              setBankDetails((prev) => ({
                                ...prev,
                                bankName: t,
                              }))
                            }
                            placeholder="Bank Name *"
                            placeholderTextColor={theme.secondary}
                            style={[styles.textInput, { color: theme.text }]}
                          />
                        </View>
                        <View
                          style={[
                            styles.inputWrap,
                            {
                              backgroundColor: theme.card,
                              borderColor: theme.border,
                              marginBottom: 10,
                            },
                          ]}
                        >
                          <TextInput
                            value={bankDetails.branchName}
                            onChangeText={(t) =>
                              setBankDetails((prev) => ({
                                ...prev,
                                branchName: t,
                              }))
                            }
                            placeholder="Branch Name"
                            placeholderTextColor={theme.secondary}
                            style={[styles.textInput, { color: theme.text }]}
                          />
                        </View>
                        <View
                          style={[
                            styles.inputWrap,
                            {
                              backgroundColor: theme.card,
                              borderColor: theme.border,
                            },
                          ]}
                        >
                          <TextInput
                            value={bankDetails.ifscCode}
                            onChangeText={(t) =>
                              setBankDetails((prev) => ({
                                ...prev,
                                ifscCode: String(t || "").toUpperCase(),
                              }))
                            }
                            placeholder="IFSC Code"
                            placeholderTextColor={theme.secondary}
                            autoCapitalize="characters"
                            style={[styles.textInput, { color: theme.text }]}
                          />
                        </View>
                      </>
                    )}

                    {paymentType === "upi" && (
                      <View
                        style={[
                          styles.inputWrap,
                          {
                            backgroundColor: theme.card,
                            borderColor: theme.border,
                          },
                        ]}
                      >
                        <TextInput
                          value={upiDetails.upiId}
                          onChangeText={(t) =>
                            setUpiDetails((prev) => ({ ...prev, upiId: t }))
                          }
                          placeholder="UPI ID (e.g., name@upi) *"
                          placeholderTextColor={theme.secondary}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          style={[styles.textInput, { color: theme.text }]}
                        />
                      </View>
                    )}

                    {paymentType === "card" && (
                      <>
                        <View
                          style={[
                            styles.inputWrap,
                            {
                              backgroundColor: theme.card,
                              borderColor: theme.border,
                              marginBottom: 10,
                            },
                          ]}
                        >
                          <TextInput
                            value={cardDetails.cardHolderName}
                            onChangeText={(t) =>
                              setCardDetails((prev) => ({
                                ...prev,
                                cardHolderName: t,
                              }))
                            }
                            placeholder="Card Holder Name *"
                            placeholderTextColor={theme.secondary}
                            style={[styles.textInput, { color: theme.text }]}
                          />
                        </View>
                        <View
                          style={[
                            styles.inputWrap,
                            {
                              backgroundColor: theme.card,
                              borderColor: theme.border,
                              marginBottom: 10,
                            },
                          ]}
                        >
                          <TextInput
                            value={cardDetails.cardNumber}
                            onChangeText={(t) =>
                              setCardDetails((prev) => ({
                                ...prev,
                                cardNumber: String(t || "").replace(
                                  /[^0-9]/g,
                                  "",
                                ),
                              }))
                            }
                            placeholder="Card Number *"
                            placeholderTextColor={theme.secondary}
                            keyboardType="number-pad"
                            maxLength={16}
                            style={[styles.textInput, { color: theme.text }]}
                          />
                        </View>
                        <View
                          style={[
                            styles.inputWrap,
                            {
                              backgroundColor: theme.card,
                              borderColor: theme.border,
                              marginBottom: 10,
                            },
                          ]}
                        >
                          <TextInput
                            value={cardDetails.expiryDate}
                            onChangeText={(t) => {
                              let formatted = String(t || "").replace(
                                /[^0-9]/g,
                                "",
                              );
                              if (formatted.length > 2) {
                                formatted =
                                  formatted.slice(0, 2) +
                                  "/" +
                                  formatted.slice(2, 4);
                              }
                              setCardDetails((prev) => ({
                                ...prev,
                                expiryDate: formatted,
                              }));
                            }}
                            placeholder="Expiry Date (MM/YY) *"
                            placeholderTextColor={theme.secondary}
                            keyboardType="number-pad"
                            maxLength={5}
                            style={[styles.textInput, { color: theme.text }]}
                          />
                        </View>
                        <View
                          style={[
                            styles.inputWrap,
                            {
                              backgroundColor: theme.card,
                              borderColor: theme.border,
                              marginBottom: 10,
                            },
                          ]}
                        >
                          <TextInput
                            value={cardDetails.cardType}
                            onChangeText={(t) =>
                              setCardDetails((prev) => ({
                                ...prev,
                                cardType: t,
                              }))
                            }
                            placeholder="Card Type (Visa, MasterCard, etc.)"
                            placeholderTextColor={theme.secondary}
                            style={[styles.textInput, { color: theme.text }]}
                          />
                        </View>
                        <View
                          style={[
                            styles.inputWrap,
                            {
                              backgroundColor: theme.card,
                              borderColor: theme.border,
                            },
                          ]}
                        >
                          <TextInput
                            value={cardDetails.bankName}
                            onChangeText={(t) =>
                              setCardDetails((prev) => ({
                                ...prev,
                                bankName: t,
                              }))
                            }
                            placeholder="Bank Name"
                            placeholderTextColor={theme.secondary}
                            style={[styles.textInput, { color: theme.text }]}
                          />
                        </View>
                      </>
                    )}
                  </View>
                ) : null}
              </View>
            ) : (
              <View
                style={[
                  styles.card,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  No methods
                </Text>
                <Text style={[styles.cardSub, { color: theme.secondary }]}>
                  No IB withdrawal methods available.
                </Text>
              </View>
            )}

            <View
              style={[
                styles.card,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <View style={styles.rowCenter}>
                <AppIcon name="badge" color={theme.primary} size={20} />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.cardTitle, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    IB Account Number
                  </Text>
                  <Text
                    style={[styles.cardSub, { color: theme.secondary }]}
                    numberOfLines={1}
                  >
                    {displayIbAccountNumber}
                  </Text>
                </View>
              </View>
            </View>

            <View
              style={[
                styles.card,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Available
              </Text>
              <Text style={[styles.bigValue, { color: theme.text }]}>
                ${availableBalance.toFixed(2)}
              </Text>
              {loading ? <ActivityIndicator color={theme.primary} /> : null}
            </View>

            <View
              style={[
                styles.card,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Amount (USD)
              </Text>
              <View
                style={[
                  styles.inputRow,
                  {
                    borderColor: theme.border,
                    backgroundColor: theme.background,
                  },
                ]}
              >
                <Text style={[styles.dollar, { color: theme.secondary }]}>
                  $
                </Text>
                <TextInput
                  value={amount}
                  onChangeText={(t) =>
                    setAmount(String(t || "").replace(/[^0-9.]/g, ""))
                  }
                  keyboardType="decimal-pad"
                  placeholder="Enter amount"
                  placeholderTextColor={theme.secondary}
                  style={[styles.amountInputSmall, { color: theme.text }]}
                />
              </View>

              <TouchableOpacity
                onPress={validateAndProceed}
                disabled={proceeding}
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: theme.primary,
                    opacity: proceeding ? 0.7 : 1,
                  },
                ]}
              >
                <Text style={styles.primaryButtonText}>
                  {proceeding ? "Please wait…" : "Proceed"}
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
                  History
                </Text>
                <TouchableOpacity onPress={loadHistory} activeOpacity={0.85}>
                  <AppIcon name="refresh" size={18} color={theme.primary} />
                </TouchableOpacity>
              </View>

              {historyLoading ? (
                <ActivityIndicator color={theme.primary} />
              ) : null}
              {history.length ? (
                history.slice(0, 10).map((tx, idx) => (
                  <View
                    key={String(tx?.id ?? idx)}
                    style={[styles.historyRow, { borderColor: theme.border }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.historyTitle, { color: theme.text }]}
                        numberOfLines={1}
                      >
                        {String(tx?.status || tx?.state || "Pending")}
                      </Text>
                      <Text
                        style={[styles.historySub, { color: theme.secondary }]}
                        numberOfLines={1}
                      >
                        {String(tx?.createdAt || tx?.date || tx?.time || "")}
                      </Text>
                    </View>
                    <Text style={[styles.historyAmt, { color: theme.text }]}>
                      ${Number(tx?.amount || 0).toFixed(2)}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={[styles.cardSub, { color: theme.secondary }]}>
                  No IB withdrawals found.
                </Text>
              )}
            </View>
          </>
        )}
      </ScrollView>

      <AccountSelectorModal
        visible={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
        accounts={accounts}
        sharedAccounts={sharedAccounts}
        fullName={fullName}
        selectedAccountId={selectedAccount?.accountId ?? selectedAccount?.id}
        onSelectAccount={(acc) => setSelectedAccount(acc)}
        onRefresh={() => refreshProfile?.()}
      />

      <IbWithdrawalDetailsModal
        visible={detailsModalVisible}
        onClose={() => setDetailsModalVisible(false)}
        theme={theme}
        referenceNumber={currentReferenceNumber}
        imageUrl={currentImageUrl}
        paymentName={currentPaymentName}
        processingTime={currentProcessingTime}
        amount={amount}
        currency="USD"
        fieldValues={fieldValues}
        withdrawalPayloadBase={withdrawalPayloadBase}
        detailsJsonBase={detailsJsonBase}
        onSuccess={async () => {
          setDetailsModalVisible(false);
          setAmount("");
          setBankDetails({
            accountHolderName: "",
            accountNumber: "",
            bankName: "",
            branchName: "",
            ifscCode: "",
          });
          setUpiDetails({ upiId: "" });
          setCardDetails({
            cardHolderName: "",
            cardNumber: "",
            expiryDate: "",
            cardType: "",
            bankName: "",
          });
          await loadIb();
          await loadHistory();
        }}
      />
    </SafeAreaView>
  );
}
