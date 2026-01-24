import { router } from "expo-router";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getFinanceOptions, previewFile } from "../../api/getServices";
import AccountSelectorModal from "../../components/Accounts/AccountSelectorModal";
import AppIcon from "../../components/AppIcon";
import { useAppTheme } from "../../contexts/ThemeContext";
import { useAuthStore } from "../../store/authStore";

const MODE = "withdrawal";

function toPreviewPath(urlOrPath) {
  if (!urlOrPath) return null;
  const raw = String(urlOrPath);

  if (raw.startsWith("file:") || raw.startsWith("data:")) return raw;

  // Only decode our protected preview URLs into a relative preview path.
  // For normal remote URLs (e.g., Azure Blob), pass through as-is so
  // `previewFile()` can download it directly.
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

function PreviewedImage({ uriOrPath, style, theme, fallbackIcon = "image" }) {
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
        <AppIcon name={fallbackIcon} color={theme?.secondary} size={22} />
      </View>
    );
  }

  return <Image source={{ uri }} style={style} />;
}

export default function WithdrawalScreen() {
  const { theme } = useAppTheme();
  const {
    accounts,
    sharedAccounts,
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

  const [amount, setAmount] = useState("");
  const normalizeAmount = (val) => String(val || "").replace(/[^0-9.]/g, "");

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

  const validateAndProceed = async () => {
    if (!selectedAccount) {
      Alert.alert("Select account", "Please select an account.");
      return;
    }

    if (!selectedMethod) {
      Alert.alert("Select method", "Please select a withdrawal method.");
      return;
    }

    const amt = Number(amount);
    if (!amount || Number.isNaN(amt) || amt <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid withdrawal amount.");
      return;
    }

    const min = Number(selectedMethod.amountMin);
    const max = Number(selectedMethod.amountMax);
    if (!Number.isNaN(min) && amt < min) {
      Alert.alert("Amount too low", `Minimum amount is ${min}.`);
      return;
    }
    if (!Number.isNaN(max) && amt > max) {
      Alert.alert("Amount too high", `Maximum amount is ${max}.`);
      return;
    }

    Alert.alert(
      "Proceed",
      `Withdrawal ${amt}\nMethod: ${selectedMethod.name}\nProcessing: ${selectedCategory?.processingTime || "—"}`,
    );
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
            Amount
          </Text>
          <View
            style={[
              styles.inputWrap,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.currencyPrefix, { color: theme.secondary }]}>
              ₹
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
                {categories.map((cat) => {
                  const active = String(cat.id) === String(selectedCategoryId);
                  return (
                    <TouchableOpacity
                      key={String(cat.id)}
                      onPress={() => {
                        setSelectedCategoryId(cat.id);
                        setSelectedMethodName(cat?.methods?.[0]?.name ?? null);
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

              <View style={{ marginTop: 12 }}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Methods
                </Text>
                {(selectedCategory?.methods || []).map((m) => {
                  const active = String(m.name) === String(selectedMethodName);
                  return (
                    <TouchableOpacity
                      key={m.name}
                      onPress={() => setSelectedMethodName(m.name)}
                      style={[
                        styles.methodLine,
                        {
                          backgroundColor: theme.card,
                          borderColor: active ? theme.primary : theme.border,
                        },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[styles.methodName, { color: theme.text }]}
                          numberOfLines={1}
                        >
                          {m.name}
                        </Text>
                        <Text
                          style={[
                            styles.methodMeta,
                            { color: theme.secondary },
                          ]}
                          numberOfLines={2}
                        >
                          {m.kind || ""}
                          {m.currenciesCsv ? ` • ${m.currenciesCsv}` : ""}
                          {m.countriesCsv ? ` • ${m.countriesCsv}` : ""}
                        </Text>
                        <Text
                          style={[
                            styles.methodMeta,
                            { color: theme.secondary },
                          ]}
                        >
                          Min {m.amountMin ?? "—"} • Max {m.amountMax ?? "—"}
                        </Text>
                      </View>
                      <AppIcon
                        name={
                          active
                            ? "radio-button-checked"
                            : "radio-button-unchecked"
                        }
                        color={active ? theme.primary : theme.secondary}
                        size={20}
                      />
                    </TouchableOpacity>
                  );
                })}
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

          <Text style={[styles.helper, { color: theme.secondary }]}>
            Options loaded from `/FinanceOptions?mode=withdrawal`.
          </Text>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: { marginRight: 16 },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 28,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  rowCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  cardSub: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
  },
  inputWrap: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: "800",
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
  },
  primaryButton: {
    marginTop: 18,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
  helper: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
  optionCard: {
    width: 160,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  optionImage: {
    width: "100%",
    height: 80,
    borderRadius: 10,
    marginBottom: 8,
  },
  optionTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  optionSub: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
  },
  methodLine: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  methodName: {
    fontSize: 14,
    fontWeight: "800",
  },
  methodMeta: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
  },
  methodImage: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    marginBottom: 10,
  },
});
