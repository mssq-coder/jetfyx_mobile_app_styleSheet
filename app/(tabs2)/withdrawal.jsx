import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
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
  getDetailsByAmountAndCategory,
  getFinanceOptions,
} from "../../api/allServices";
import AccountSelectorModal from "../../components/Accounts/AccountSelectorModal";
import AppIcon from "../../components/AppIcon";
import PreviewedImage from "../../components/PreviewedImage";
import WithdrawalDetailsModal from "../../components/WithdrawalDetailsModal";
import { useAppTheme } from "../../contexts/ThemeContext";
import usePullToRefresh from "../../hooks/usePullToRefresh";
import { useAuthStore } from "../../store/authStore";
import {
  filterOutDemoAccounts,
  filterSharedAccountsOutDemo,
} from "../../utils/accountVisibility";
import { showErrorToast, showInfoToast } from "../../utils/toast";
import styles from "./withdrawal.styles";

const MODE = "withdrawal";

export default function WithdrawalScreen() {
  return <StandardWithdrawalScreen />;
}

function StandardWithdrawalScreen() {
  const { theme } = useAppTheme();
  const {
    accounts,
    sharedAccounts,
    fullName,
    selectedAccountId,
    setSelectedAccount,
  } = useAuthStore();

  const visibleAccounts = useMemo(
    () => filterOutDemoAccounts(accounts),
    [accounts],
  );
  const visibleSharedAccounts = useMemo(
    () => filterSharedAccountsOutDemo(sharedAccounts),
    [sharedAccounts],
  );

  const { refreshing, runRefresh } = usePullToRefresh();

  useEffect(() => {
    if (!visibleAccounts.length) return;
    const id = selectedAccountId;
    const exists = visibleAccounts.some(
      (a) => String(a.accountId ?? a.id) === String(id),
    );
    if (!id || !exists) {
      setSelectedAccount(visibleAccounts[0]);
    }
  }, [selectedAccountId, visibleAccounts, setSelectedAccount]);

  const selectedAccount = useMemo(() => {
    const id = selectedAccountId;
    const found = (visibleAccounts || []).find(
      (a) => String(a.accountId ?? a.id) === String(id),
    );
    return found || visibleAccounts?.[0] || null;
  }, [visibleAccounts, selectedAccountId]);

  const [accountModalOpen, setAccountModalOpen] = useState(false);

  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedMethodName, setSelectedMethodName] = useState(null);
  const [selectedCurrency, setSelectedCurrency] = useState(null);

  const parseCurrenciesCsv = (csv) => {
    return String(csv || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const methodSupportsCurrency = (method, currency) => {
    if (!currency) return false;
    const list = parseCurrenciesCsv(method?.currenciesCsv);
    return list.some(
      (c) => String(c).toUpperCase() === String(currency).toUpperCase(),
    );
  };

  const [amount, setAmount] = useState("");
  const normalizeAmount = (val) => String(val || "").replace(/[^0-9.]/g, "");

  // Dynamic input fields based on payment type
  const [bankDetails, setBankDetails] = useState({
    accountHolderName: "",
    accountNumber: "",
    bankName: "",
    branchName: "",
    ifscCode: "",
  });

  const [upiDetails, setUpiDetails] = useState({
    upiId: "",
  });

  const [cardDetails, setCardDetails] = useState({
    cardHolderName: "",
    cardNumber: "",
    expiryDate: "",
    cardType: "",
    bankName: "",
  });

  // Modal state
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [currentReferenceNumber, setCurrentReferenceNumber] = useState(null);
  const [currentImageUrl, setCurrentImageUrl] = useState(null);
  const [currentPaymentName, setCurrentPaymentName] = useState(null);
  const [currentProcessingTime, setCurrentProcessingTime] = useState(null);
  const [withdrawalPayloadBase, setWithdrawalPayloadBase] = useState(null);
  const [detailsJsonBase, setDetailsJsonBase] = useState(null);
  const [fieldValues, setFieldValues] = useState({});

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingOptions(true);
        setOptionsError(null);

        const res = await getFinanceOptions(MODE);
        const list = res?.categories || res?.data?.categories || [];

        if (!mounted) return;
        const safe = Array.isArray(list) ? list : [];
        setCategories(safe);

        const firstCatId = safe.length ? safe[0].id : null;
        setSelectedCategoryId((prev) => prev ?? firstCatId);
        const firstMethod = safe.length
          ? (safe[0]?.methods?.[0]?.name ?? null)
          : null;
        setSelectedMethodName((prev) => prev ?? firstMethod);

        // Default currency should be derived from the initially selected category (payment option)
        // because the flow is: Payment option -> Currency.
        const firstCategory = safe[0] || null;
        const firstCategoryCurrencies = Array.from(
          new Set(
            (firstCategory?.methods || [])
              .flatMap((m) => parseCurrenciesCsv(m?.currenciesCsv))
              .map((c) => String(c).toUpperCase()),
          ),
        ).filter(Boolean);
        setSelectedCurrency(
          (prev) => prev ?? firstCategoryCurrencies[0] ?? null,
        );
      } catch (e) {
        if (!mounted) return;
        setOptionsError(
          e?.response?.data?.message ||
            e?.message ||
            "Failed to load finance options",
        );
      } finally {
        if (mounted) setLoadingOptions(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleRefresh = () =>
    runRefresh(async () => {
      try {
        setLoadingOptions(true);
        setOptionsError(null);

        const res = await getFinanceOptions(MODE);
        const list = res?.categories || res?.data?.categories || [];
        const safe = Array.isArray(list) ? list : [];
        setCategories(safe);

        setSelectedCategoryId((prev) => {
          if (prev == null) return safe?.[0]?.id ?? null;
          const exists = safe.some((c) => String(c?.id) === String(prev));
          return exists ? prev : (safe?.[0]?.id ?? null);
        });

        setSelectedMethodName((prev) => {
          if (prev == null) return safe?.[0]?.methods?.[0]?.name ?? null;
          const flatMethods = safe.flatMap((c) => c?.methods || []);
          const exists = flatMethods.some(
            (m) => String(m?.name) === String(prev),
          );
          return exists ? prev : (safe?.[0]?.methods?.[0]?.name ?? null);
        });

        // Keep currency if still supported; otherwise reset.
        setSelectedCurrency((prev) => {
          if (!prev) {
            const firstCategory = safe[0] || null;
            const firstCategoryCurrencies = Array.from(
              new Set(
                (firstCategory?.methods || [])
                  .flatMap((m) => parseCurrenciesCsv(m?.currenciesCsv))
                  .map((c) => String(c).toUpperCase()),
              ),
            ).filter(Boolean);
            return firstCategoryCurrencies[0] ?? null;
          }

          const selectedCategory = safe.find(
            (c) => String(c?.id) === String(selectedCategoryId),
          );
          const methods = selectedCategory?.methods || [];
          const isSupported = methods.some((m) =>
            methodSupportsCurrency(m, prev),
          );
          if (isSupported) return prev;

          const firstCategory = safe[0] || null;
          const firstCategoryCurrencies = Array.from(
            new Set(
              (firstCategory?.methods || [])
                .flatMap((m) => parseCurrenciesCsv(m?.currenciesCsv))
                .map((c) => String(c).toUpperCase()),
            ),
          ).filter(Boolean);
          return firstCategoryCurrencies[0] ?? null;
        });
      } catch (e) {
        setOptionsError(
          e?.response?.data?.message ||
            e?.message ||
            "Failed to load finance options",
        );
      } finally {
        setLoadingOptions(false);
      }
    });

  // Determine payment type based on category name
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
    return "bank"; // default to bank
  };

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

  const currencyList = useMemo(() => {
    // Currency comes AFTER selecting payment option/category.
    if (!selectedCategory) return [];

    const all = (selectedCategory?.methods || []).flatMap((m) =>
      parseCurrenciesCsv(m?.currenciesCsv),
    );
    const unique = Array.from(new Set(all.map((c) => String(c).toUpperCase())));
    return unique;
  }, [selectedCategory]);

  // When category changes, ensure selectedCurrency is valid for that category.
  useEffect(() => {
    if (!selectedCategory) return;
    const allowed = (selectedCategory?.methods || [])
      .flatMap((m) => parseCurrenciesCsv(m?.currenciesCsv))
      .map((c) => String(c).toUpperCase());

    const allowedUnique = Array.from(new Set(allowed)).filter(Boolean);
    if (!allowedUnique.length) return;

    const current = String(selectedCurrency || "").toUpperCase();
    if (!current || !allowedUnique.includes(current)) {
      setSelectedCurrency(allowedUnique[0]);
    }
  }, [selectedCategoryId]);

  // When currency changes, ensure the selected method is valid for that currency within the selected category.
  useEffect(() => {
    if (!selectedCategory) return;
    if (!selectedCurrency) return;

    const supportedMethod = (selectedCategory?.methods || []).find((m) =>
      methodSupportsCurrency(m, selectedCurrency),
    );
    setSelectedMethodName(supportedMethod?.name ?? null);
  }, [selectedCurrency, selectedCategoryId]);

  const paymentType = useMemo(() => {
    return getPaymentType(selectedCategory?.name);
  }, [selectedCategory]);

  // Get current field values based on payment type
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
        return {
          UPIId: upiDetails.upiId,
        };
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

  // Validate fields based on payment type
  const validateFields = () => {
    switch (paymentType) {
      case "bank":
        if (!bankDetails.accountHolderName.trim()) {
          showInfoToast("Please enter account holder name.", "Required");
          return false;
        }
        if (!bankDetails.accountNumber.trim()) {
          showInfoToast("Please enter account number.", "Required");
          return false;
        }
        if (!bankDetails.bankName.trim()) {
          showInfoToast("Please enter bank name.", "Required");
          return false;
        }
        return true;
      case "upi":
        if (!upiDetails.upiId.trim()) {
          showInfoToast("Please enter UPI ID.", "Required");
          return false;
        }
        return true;
      case "card":
        if (!cardDetails.cardHolderName.trim()) {
          showInfoToast("Please enter card holder name.", "Required");
          return false;
        }
        if (!cardDetails.cardNumber.trim()) {
          showInfoToast("Please enter card number.", "Required");
          return false;
        }
        if (!cardDetails.expiryDate.trim()) {
          showInfoToast("Please enter expiry date.", "Required");
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const validateAndProceed = async () => {
    if (!selectedAccount) {
      showInfoToast("Please select an account.", "Select account");
      return;
    }

    if (!selectedCategory) {
      showInfoToast("Please select a withdrawal method.", "Select method");
      return;
    }

    if (!selectedCurrency) {
      showInfoToast("Please select a currency.", "Select currency");
      return;
    }

    if (!validateFields()) {
      return;
    }

    const amt = Number(amount);
    if (!amount || Number.isNaN(amt) || amt <= 0) {
      showInfoToast(
        "Please enter a valid withdrawal amount.",
        "Invalid amount",
      );
      return;
    }

    try {
      const accountId = selectedAccount?.accountId ?? selectedAccount?.id;
      const currency = selectedCurrency;

      const response = await getDetailsByAmountAndCategory(
        selectedCategory?.name,
        amt,
        MODE,
        currency,
      );

      const data = response?.data?.category?.methods || [];
      const referenceNumber = response?.data?.referenceNumber || null;
      const imageUrl = data[0]?.imageUrl || selectedCategory?.imageUrl || null;
      const paymentName =
        data[0]?.name ||
        selectedMethod?.name ||
        selectedCategory?.name ||
        "Selected Method";
      const processingTime =
        data[0]?.processingTime || selectedCategory?.processingTime || "";

      const currentFields = getCurrentFieldValues();

      setCurrentReferenceNumber(referenceNumber);
      setCurrentImageUrl(imageUrl);
      setCurrentPaymentName(paymentName);
      setCurrentProcessingTime(processingTime);
      setFieldValues(currentFields);

      setWithdrawalPayloadBase({
        AccountId: accountId,
        Amount: amt,
        Currency: currency,
        PaymentCategory: selectedCategory?.name,
        PaymentMethod: selectedMethod?.name || selectedCategory?.name,
      });

      setDetailsJsonBase({
        PaymentCategory: selectedCategory?.name,
        PaymentMethod: selectedMethod?.name || selectedCategory?.name,
        ...currentFields,
      });

      setDetailsModalVisible(true);
    } catch (e) {
      showErrorToast(
        e?.response?.data?.message ||
          e?.message ||
          "Failed to retrieve withdrawal details.",
        "Error",
      );
    }
  };

  const accountLabel = useMemo(() => {
    if (!selectedAccount) return "Select account";
    const number = selectedAccount.accountNumber ?? selectedAccount.id ?? "—";
    const type =
      selectedAccount.accountTypeName ||
      selectedAccount.type ||
      selectedAccount.accountType ||
      "Account";
    const bal =
      selectedAccount.balance != null
        ? `${selectedAccount.balance} ${selectedAccount.currency ?? ""}`.trim()
        : "—";
    return `${number} • ${type} • ${bal}`;
  }, [selectedAccount]);

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
        <Text style={styles.headerTitle}>Withdrawal</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
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
                  {accountLabel}
                </Text>
                <Text
                  style={[styles.cardSub, { color: theme.secondary }]}
                  numberOfLines={1}
                >
                  Tap to change account
                </Text>
              </View>
              <AppIcon name="expand-more" color={theme.secondary} size={22} />
            </View>
          </TouchableOpacity>

          <Text
            style={[styles.sectionTitle, { color: theme.text, marginTop: 16 }]}
          >
            Payment Options
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
                Loading options...
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
            <View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12, paddingVertical: 4 }}
              >
                {(Array.isArray(categories) ? categories : []).map((cat) => {
                  const active = String(cat.id) === String(selectedCategoryId);
                  return (
                    <TouchableOpacity
                      key={String(cat.id)}
                      onPress={() => {
                        setSelectedCategoryId(cat.id);

                        // If the currently selected currency isn't supported by this category,
                        // switch to the first supported currency for this category.
                        const categoryCurrencies = Array.from(
                          new Set(
                            (cat?.methods || [])
                              .flatMap((m) =>
                                parseCurrenciesCsv(m?.currenciesCsv),
                              )
                              .map((c) => String(c).toUpperCase()),
                          ),
                        ).filter(Boolean);
                        const current = String(
                          selectedCurrency || "",
                        ).toUpperCase();
                        const currencyToUse =
                          categoryCurrencies.length &&
                          categoryCurrencies.includes(current)
                            ? current
                            : (categoryCurrencies[0] ?? null);

                        setSelectedCurrency(currencyToUse);

                        const nextMethod =
                          (cat?.methods || []).find((m) =>
                            methodSupportsCurrency(m, currencyToUse),
                          ) ||
                          cat?.methods?.[0] ||
                          null;
                        setSelectedMethodName(nextMethod?.name ?? null);
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

              {/* Currency Selection (after Payment Option) */}
              {selectedCategory && currencyList.length ? (
                <View style={{ marginTop: 12 }}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>
                    Currency
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 10, paddingVertical: 4 }}
                  >
                    {currencyList.map((c) => {
                      const active =
                        String(c).toUpperCase() ===
                        String(selectedCurrency || "").toUpperCase();
                      return (
                        <TouchableOpacity
                          key={String(c)}
                          onPress={() => setSelectedCurrency(c)}
                          style={[
                            styles.currencyChip,
                            {
                              backgroundColor: active
                                ? `${theme.primary}15`
                                : theme.card,
                              borderColor: active
                                ? theme.primary
                                : theme.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.currencyChipText,
                              { color: active ? theme.primary : theme.text },
                            ]}
                          >
                            {String(c)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : null}

              {/* Dynamic Input Fields based on payment type */}
              {selectedCategory && (
                <View style={{ marginTop: 16 }}>
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
                              ifscCode: t.toUpperCase(),
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
                              cardNumber: t.replace(/[^0-9]/g, ""),
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
                            let formatted = t.replace(/[^0-9]/g, "");
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
              )}

              {/* Amount Section */}
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.text, marginTop: 16 },
                ]}
              >
                Amount
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <Text
                  style={[styles.currencyPrefix, { color: theme.secondary }]}
                >
                  {String(selectedCurrency || "").toUpperCase() === "INR"
                    ? "₹"
                    : "$"}
                </Text>
                <TextInput
                  value={amount}
                  onChangeText={(t) => setAmount(normalizeAmount(t))}
                  placeholder="0.00"
                  placeholderTextColor={theme.secondary}
                  keyboardType="decimal-pad"
                  style={[styles.amountInput, { color: theme.text }]}
                />
              </View>
            </View>
          ) : (
            <View
              style={[
                styles.card,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                No options
              </Text>
              <Text style={[styles.cardSub, { color: theme.secondary }]}>
                No withdrawal methods available.
              </Text>
            </View>
          )}

          <TouchableOpacity
            onPress={validateAndProceed}
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}
          >
            <Text style={styles.primaryButtonText}>Proceed</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <AccountSelectorModal
        visible={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
        accounts={visibleAccounts}
        sharedAccounts={visibleSharedAccounts}
        fullName={fullName}
        selectedAccountId={selectedAccount?.accountId ?? selectedAccount?.id}
        onSelectAccount={(acc) => setSelectedAccount(acc)}
        onRefresh={() => {}}
      />

      <WithdrawalDetailsModal
        visible={detailsModalVisible}
        onClose={() => setDetailsModalVisible(false)}
        theme={theme}
        referenceNumber={currentReferenceNumber}
        imageUrl={currentImageUrl}
        paymentName={currentPaymentName}
        processingTime={currentProcessingTime}
        amount={amount}
        currency={selectedCurrency || "USD"}
        fieldValues={fieldValues}
        withdrawalPayloadBase={withdrawalPayloadBase}
        detailsJsonBase={detailsJsonBase}
        onSuccess={() => {
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
          router.back();
        }}
      />
    </SafeAreaView>
  );
}
