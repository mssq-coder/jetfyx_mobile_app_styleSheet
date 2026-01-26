import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getFinanceOptions, previewFile } from "../../api/getServices";
import AccountSelectorModal from "../../components/Accounts/AccountSelectorModal";
import AppIcon from "../../components/AppIcon";
import { useAppTheme } from "../../contexts/ThemeContext";
import { useAuthStore } from "../../store/authStore";

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MODE = "deposit";

function toPreviewPath(urlOrPath) {
  if (!urlOrPath) return null;
  const raw = String(urlOrPath);

  if (raw.startsWith("file:") || raw.startsWith("data:")) return raw;

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const u = new URL(raw);
      const marker = "/shared/file-preview/preview/";
      const idx = u.pathname.indexOf(marker);
      if (idx !== -1) {
        const encoded = u.pathname.slice(idx + marker.length);
        return decodeURIComponent(encoded);
      }

      if (u.hostname.toLowerCase().endsWith(".blob.core.windows.net")) {
        const p = decodeURIComponent(u.pathname.replace(/^\//, ""));
        const parts = p.split("/").filter(Boolean);
        return parts.length >= 2 ? parts.slice(1).join("/") : p;
      }

      return raw;
    } catch (_e) {
      return raw;
    }
  }

  return raw;
}

function PreviewedImage({ uriOrPath, style, theme, fallbackIcon = "payments" }) {
  const [uri, setUri] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const p = toPreviewPath(uriOrPath);
      if (!p) {
        if (mounted) setUri(null);
        return;
      }

      if (p.startsWith("file:") || p.startsWith("data:")) {
        if (mounted) setUri(p);
        return;
      }

      try {
        const localUri = await previewFile(p);
        if (mounted) setUri(localUri);
      } catch (_e) {
        const raw = String(uriOrPath || "");
        const isBlob = /(^https?:\/\/[^/]+\.blob\.core\.windows\.net\/)/i.test(
          raw,
        );
        if (mounted) setUri(isBlob ? null : raw);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [uriOrPath]);

  if (!uri) {
    return (
      <View
        style={[
          style,
          {
            backgroundColor: theme?.background,
            alignItems: "center",
            justifyContent: "center",
          },
        ]}
      >
        <AppIcon name={fallbackIcon} color={theme?.secondary} size={32} />
      </View>
    );
  }

  return <Image source={{ uri }} style={style} />;
}

export default function DepositScreen() {
  const { theme } = useAppTheme();
  const {
    accounts,
    sharedAccounts,
    userEmail,
    fullName,
    selectedAccountId,
    setSelectedAccount,
  } = useAuthStore();

  const selectedAccount = useMemo(() => {
    const id = selectedAccountId;
    const found = (accounts || []).find(
      (a) => String(a.accountId ?? a.id) === String(id),
    );
    return found || accounts?.[0] || null;
  }, [accounts, selectedAccountId]);

  const [accountModalOpen, setAccountModalOpen] = useState(false);

  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedMethodName, setSelectedMethodName] = useState(null);
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  const [amount, setAmount] = useState("");
  const [buttonScale] = useState(new Animated.Value(1));

  const accountLabel = useMemo(() => {
    if (!selectedAccount) return "Select account";
    const number = selectedAccount.accountNumber ?? selectedAccount.id ?? "—";
    const type =
      selectedAccount.accountTypeName ||
      selectedAccount.type ||
      selectedAccount.accountType ||
      "Account";
    return `${number} • ${type}`;
  }, [selectedAccount]);

  const normalizeAmount = (val) => String(val || "").replace(/[^0-9.]/g, "");

  const parseSettings = (settingsJson) => {
    if (!settingsJson) return {};
    try {
      return JSON.parse(settingsJson);
    } catch (_e) {
      return {};
    }
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
    const methods = selectedCategory?.methods || [];
    const all = methods.flatMap((m) => {
      const csv = m?.currenciesCsv || "";
      return csv.split(",").map((s) => s.trim()).filter(Boolean);
    });
    return Array.from(new Set(all));
  }, [selectedCategory]);

  const currencyLimits = useMemo(() => {
    if (!selectedCurrency || !selectedCategory) return { min: null, max: null, method: null };
    const methods = (selectedCategory?.methods || []).filter((m) => {
      const csv = m?.currenciesCsv || "";
      return csv.split(",").map((s) => s.trim()).includes(selectedCurrency);
    });
    if (!methods.length) return { min: null, max: null, method: null };
    const mins = methods.map((m) => Number(m.amountMin || 0)).filter((v) => !Number.isNaN(v));
    const maxs = methods.map((m) => Number(m.amountMax || 0)).filter((v) => !Number.isNaN(v));
    const min = mins.length ? Math.min(...mins) : null;
    const max = maxs.length ? Math.max(...maxs) : null;
    return { min, max, method: methods[0] };
  }, [selectedCategory, selectedCurrency]);

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
      } catch (e) {
        if (!mounted) return;
        setOptionsError(
          e?.response?.data?.message ||
            e?.message ||
            "Failed to load deposit options",
        );
      } finally {
        if (mounted) setLoadingOptions(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const animateButton = () => {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(buttonScale, {
        toValue: 1,
        tension: 150,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const validateAndProceed = async () => {
    animateButton();
    
    if (!selectedAccount) {
      Alert.alert(
        "Select Account",
        "Please select an account to deposit into.",
      );
      return;
    }

    if (!selectedMethod) {
      Alert.alert("Select Method", "Please select a deposit method.");
      return;
    }

    const amt = Number(amount);
    if (!amount || Number.isNaN(amt) || amt <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid deposit amount.");
      return;
    }

    // const min = Number(selectedMethod.amountMin);
    // const max = Number(selectedMethod.amountMax);
    // if (!Number.isNaN(min) && amt < min) {
    //   Alert.alert("Amount Too Low", `Minimum amount is ${min}.`);
    //   return;
    // }
    // if (!Number.isNaN(max) && amt > max) {
    //   Alert.alert("Amount Too High", `Maximum amount is ${max}.`);
    //   return;
    // }

    const settings = parseSettings(selectedMethod.settingsJson);
    const fields = settings?.fields || {};
    const kind = String(selectedMethod.kind || "").toLowerCase();

    if (kind.includes("stripe")) {
      const link = fields?.paymentLink;
      if (!link) {
        Alert.alert("Payment Link Missing", "No payment link found.");
        return;
      }
      await WebBrowser.openBrowserAsync(String(link));
      return;
    }

    if (kind.includes("upi")) {
      Alert.alert(
        "UPI Deposit",
        `Amount: ${amt}\nUPI ID: ${fields?.upiId || "—"}\nProcessing: ${selectedCategory?.processingTime || "—"}`,
      );
      return;
    }

    if (kind.includes("bank")) {
      const lines = [
        `Amount: ${amt}`,
        `Selected Category: ${selectedCategory?.name || "—"}`,
        `Branch: ${fields?.branchName || "—"}`,
        fields?.ifscCode ? `IFSC: ${fields.ifscCode}` : null,
        `Mode: ${MODE}`,
        `Curency: ${selectedCurrency || "—"}`,
        `userEmail: ${userEmail || "—"}`,
        `Processing: ${selectedCategory?.processingTime || "—"}`,
      ].filter(Boolean);
      Alert.alert("Bank Deposit", lines.join("\n"));
      return;
    }

    Alert.alert(
      "Proceed",
      `Selected: ${selectedMethod.name}\nAmount: ${amt}\nThis method is not wired yet.`,
    );
  };

  const quickAmounts = [100, 500, 1000, 5000];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <StatusBar backgroundColor={theme.primary} barStyle="light-content" />

      {/* Enhanced Header */}
      <View style={[styles.header, { 
        backgroundColor: theme.primary,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
      }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { 
            backgroundColor: 'rgba(255,255,255,0.2)',
          }]}
        >
          <AppIcon name="arrow-back" color="#fff" size={22} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Deposit Funds</Text>
          <Text style={styles.headerSubtitle}>Add funds to your trading account</Text>
        </View>
        <TouchableOpacity style={[styles.headerButton, { 
          backgroundColor: 'rgba(255,255,255,0.2)',
        }]}>
          <AppIcon name="help-outline" color="#fff" size={20} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Account Selection Card */}
          <TouchableOpacity
            onPress={() => setAccountModalOpen(true)}
            style={[
              styles.accountCard,
              { 
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.border,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 4,
              }
            ]}
            activeOpacity={0.7}
          >
            <View style={styles.accountCardContent}>
              <View style={[styles.accountIcon, { backgroundColor: `${theme.primary}15` }]}>
                <AppIcon name="account-balance" color={theme.primary} size={24} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.accountTitle, { color: theme.text }]}>
                  Deposit to Account
                </Text>
                <Text style={[styles.accountLabel, { color: theme.text }]} numberOfLines={1}>
                  {accountLabel}
                </Text>
                <Text style={[styles.accountBalance, { color: theme.secondary }]}>
                  Balance: {selectedAccount?.balance ? `$${selectedAccount.balance}` : "$0.00"} • {selectedAccount?.currency || "USD"}
                </Text>
              </View>
              <AppIcon name="chevron-right" color={theme.secondary} size={22} />
            </View>
          </TouchableOpacity>

          {/* Payment Methods Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Payment Method
              </Text>
              <Text style={[styles.sectionSubtitle, { color: theme.secondary }]}>
                Choose how you want to deposit
              </Text>
            </View>

            {loadingOptions ? (
              <View style={[styles.loadingCard, { backgroundColor: theme.card }]}>
                <ActivityIndicator color={theme.primary} size="large" />
                <Text style={[styles.loadingText, { color: theme.secondary }]}>
                  Loading deposit options...
                </Text>
              </View>
            ) : optionsError ? (
              <View style={[styles.errorCard, { backgroundColor: theme.card }]}>
                <View style={[styles.errorIcon, { backgroundColor: `${theme.negative}15` }]}>
                  <AppIcon name="error" color={theme.negative} size={24} />
                </View>
                <Text style={[styles.errorTitle, { color: theme.text }]}>
                  Failed to Load
                </Text>
                <Text style={[styles.errorMessage, { color: theme.secondary }]}>
                  {optionsError}
                </Text>
              </View>
            ) : categories.length ? (
              <>
                {/* Category Selection */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryContainer}
                >
                  {categories.map((cat) => {
                    const active = String(cat.id) === String(selectedCategoryId);
                    return (
                      <TouchableOpacity
                        key={String(cat.id)}
                        onPress={() => {
                          setSelectedCategoryId(cat.id);
                          setSelectedMethodName(cat?.methods?.[0]?.name ?? null);
                          const firstCsv = cat?.methods?.[0]?.currenciesCsv || "";
                          const firstCurrency = (firstCsv.split(",").map((s) => s.trim()).filter(Boolean) || [null])[0];
                          setSelectedCurrency(firstCurrency ?? null);
                        }}
                        style={[
                          styles.categoryCard,
                          { 
                            backgroundColor: active ? theme.card : `${theme.card}80`,
                            borderColor: active ? theme.primary : theme.border,
                          }
                        ]}
                        activeOpacity={0.7}
                      >
                        <PreviewedImage
                          uriOrPath={cat.imageUrl}
                          style={styles.categoryImage}
                          theme={theme}
                          fallbackIcon="payments"
                        />
                        <Text style={[styles.categoryName, { 
                          color: active ? theme.text : theme.secondary,
                          fontWeight: active ? "700" : "600",
                        }]}>
                          {cat.name}
                        </Text>
                        <Text style={[styles.categoryProcessing, { color: theme.secondary }]}>
                          {cat.processingTime || "Instant"}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Currency Selection */}
                <View style={{ marginTop: 20 }}>
                  <Text style={[styles.sectionLabel, { color: theme.text }]}>
                    Select Currency
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.currencyContainer}
                  >
                    {currencyList.length ? (
                      currencyList.map((c) => {
                        const active = String(c) === String(selectedCurrency);
                        const limits = currencyList.includes(c) ? currencyLimits : { min: null, max: null };
                        return (
                          <TouchableOpacity
                            key={c}
                            onPress={() => setSelectedCurrency(c)}
                            style={[
                              styles.currencyCard,
                              { 
                                backgroundColor: active ? `${theme.primary}15` : theme.card,
                                borderColor: active ? theme.primary : theme.border,
                              }
                            ]}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.currencySymbol, { 
                              color: active ? theme.primary : theme.text,
                              fontWeight: "800",
                            }]}>
                              {c}
                            </Text>
                            <Text style={[styles.currencyLimits, { color: theme.secondary }]}>
                              Min: {limits.min || "—"} • Max: {limits.max || "—"}
                            </Text>
                          </TouchableOpacity>
                        );
                      })
                    ) : (
                      <View style={[styles.emptyCurrencies, { backgroundColor: theme.card }]}>
                        <Text style={[styles.emptyText, { color: theme.secondary }]}>
                          No currencies available for this method
                        </Text>
                      </View>
                    )}
                  </ScrollView>
                </View>

              </>
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: theme.card }]}>
                <View style={[styles.emptyIcon, { backgroundColor: `${theme.secondary}15` }]}>
                  <AppIcon name="payment" color={theme.secondary} size={32} />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>
                  No Deposit Methods
                </Text>
                <Text style={[styles.emptyMessage, { color: theme.secondary }]}>
                  No payment methods are currently available.
                </Text>
              </View>
            )}
          </View>

          {/* Amount Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Deposit Amount
              </Text>
              <Text style={[styles.sectionSubtitle, { color: theme.secondary }]}>
                Enter the amount you wish to deposit
              </Text>
            </View>

            {/* Quick Amounts */}
            <View style={styles.quickAmounts}>
              {quickAmounts.map((amt) => (
                <TouchableOpacity
                  key={amt}
                  onPress={() => setAmount(amt.toString())}
                  style={[
                    styles.quickAmountButton,
                    { 
                      backgroundColor: amount === amt.toString() 
                        ? theme.primary 
                        : theme.card,
                      borderColor: amount === amt.toString() 
                        ? theme.primary 
                        : theme.border,
                    }
                  ]}
                >
                  <Text style={[
                    styles.quickAmountText,
                    { 
                      color: amount === amt.toString() 
                        ? "#FFFFFF" 
                        : theme.text,
                      fontWeight: amount === amt.toString() 
                        ? "700" 
                        : "600",
                    }
                  ]}>
                    ${amt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Amount Input */}
            <View style={[
              styles.amountInputContainer,
              { 
                backgroundColor: theme.card,
                borderColor: theme.border,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 4,
              }
            ]}>
              <View style={styles.amountInputHeader}>
                <Text style={[styles.amountLabel, { color: theme.secondary }]}>
                  Enter Amount
                </Text>
                {currencyLimits.min && (
                  <Text style={[styles.amountLimits, { color: theme.secondary }]}>
                    Min: {currencyLimits.min} • Max: {currencyLimits.max || "No limit"}
                  </Text>
                )}
              </View>
              <View style={styles.amountInputWrapper}>
                <Text style={[styles.currencySymbol, { color: theme.secondary, fontSize: 28 }]}>
                  $
                </Text>
                <TextInput
                  value={amount}
                  onChangeText={(t) => setAmount(normalizeAmount(t))}
                  placeholder="0.00"
                  placeholderTextColor={theme.secondary}
                  keyboardType="decimal-pad"
                  style={[styles.amountInput, { color: theme.text }]}
                />
                <Text style={[styles.currencyCode, { color: theme.secondary }]}>
                  {selectedCurrency || "USD"}
                </Text>
              </View>
            </View>

            {/* Amount Summary */}
            <View style={[styles.amountSummary, { backgroundColor: `${theme.primary}10` }]}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.text }]}>
                  Amount to Deposit
                </Text>
                <Text style={[styles.summaryValue, { color: theme.text, fontWeight: "700" }]}>
                  ${amount || "0.00"}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.secondary }]}>
                  Processing Time
                </Text>
                <Text style={[styles.summaryValue, { color: theme.positive }]}>
                  {selectedCategory?.processingTime || "Instant"}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.secondary }]}>
                  Fee
                </Text>
                <Text style={[styles.summaryValue, { color: theme.text }]}>
                  No fee
                </Text>
              </View>
            </View>
          </View>

          {/* Proceed Button */}
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity
              onPress={validateAndProceed}
              style={[
                styles.proceedButton,
                { 
                  backgroundColor: theme.primary,
                  shadowColor: theme.primary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 6,
                }
              ]}
              activeOpacity={0.8}
            >
              <View style={styles.buttonContent}>
                <AppIcon name="payment" color="#FFFFFF" size={20} />
                <Text style={styles.proceedButtonText}>
                  Proceed to Deposit
                </Text>
              </View>
              <Text style={styles.proceedButtonSubtext}>
                Deposit ${amount || "0.00"} to your account
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Security Notice */}
          <View style={[styles.securityNotice, { backgroundColor: `${theme.primary}10` }]}>
            <AppIcon name="security" color={theme.primary} size={16} />
            <Text style={[styles.securityText, { color: theme.secondary }]}>
              Your payment is secured with 256-bit encryption
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <AccountSelectorModal
        visible={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
        accounts={accounts}
        sharedAccounts={sharedAccounts}
        fullName={fullName}
        selectedAccountId={selectedAccount?.accountId ?? selectedAccount?.id}
        onSelectAccount={(acc) => setSelectedAccount(acc)}
        onRefresh={() => {}}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 30,
    gap: 24,
  },
  accountCard: {
    borderRadius: 16,
    padding: 20,
  },
  accountCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  accountIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  accountTitle: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  accountLabel: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  accountBalance: {
    fontSize: 12,
    fontWeight: "600",
  },
  section: {
    gap: 16,
  },
  sectionHeader: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: "500",
  },
  loadingCard: {
    padding: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
  },
  errorIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  categoryContainer: {
    gap: 12,
    paddingVertical: 4,
  },
  categoryCard: {
    width: 140,
    borderWidth: 2,
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
  },
  categoryImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 4,
  },
  categoryProcessing: {
    fontSize: 11,
    fontWeight: "600",
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
  },
  currencyContainer: {
    gap: 12,
    paddingVertical: 4,
  },
  currencyCard: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  currencySymbol: {
    fontSize: 18,
    marginBottom: 4,
  },
  currencyLimits: {
    fontSize: 11,
    fontWeight: "600",
  },
  emptyCurrencies: {
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
  },
  methodDetails: {
    padding: 20,
    borderRadius: 16,
    gap: 16,
  },
  methodTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  methodDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  methodFeatures: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  featureIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    fontSize: 13,
    fontWeight: "600",
  },
  methodInfo: {
    gap: 8,
    marginTop: 8,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  infoValue: {
    fontSize: 13,
  },
  emptyCard: {
    padding: 32,
    borderRadius: 16,
    alignItems: "center",
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    textAlign: "center",
  },
  quickAmounts: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  quickAmountButton: {
    flex: 1,
    minWidth: (SCREEN_WIDTH - 72) / 4,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: "600",
  },
  amountInputContainer: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  amountInputHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  amountLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  amountLimits: {
    fontSize: 11,
    fontWeight: "600",
  },
  amountInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: "800",
    padding: 0,
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: "700",
    opacity: 0.8,
  },
  amountSummary: {
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  summaryValue: {
    fontSize: 14,
  },
  proceedButton: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  proceedButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  proceedButtonSubtext: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    fontWeight: "600",
  },
  securityNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 16,
    borderRadius: 12,
    justifyContent: "center",
  },
  securityText: {
    fontSize: 12,
    fontWeight: "600",
  },
});