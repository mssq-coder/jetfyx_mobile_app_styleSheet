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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getFinanceOptions, previewFile } from "../../api/getServices";
import AccountSelectorModal from "../../components/Accounts/AccountSelectorModal";
import AppIcon from "../../components/AppIcon";
import { useAppTheme } from "../../contexts/ThemeContext";
import { useAuthStore } from "../../store/authStore";

const MODE = "deposit";

function toPreviewPath(urlOrPath) {
  if (!urlOrPath) return null;
  const raw = String(urlOrPath);

  // Already local or inline
  if (raw.startsWith("file:") || raw.startsWith("data:")) return raw;

  // If backend gave a full URL, only extract the preview path when it is
  // already pointing at our protected preview endpoint. Otherwise, pass
  // the URL through so `previewFile()` can download it directly.
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const u = new URL(raw);
      const marker = "/shared/file-preview/preview/";
      const idx = u.pathname.indexOf(marker);
      if (idx !== -1) {
        const encoded = u.pathname.slice(idx + marker.length);
        return decodeURIComponent(encoded);
      }

      // Azure Blob URLs are often private (409 PublicAccessNotPermitted).
      // Convert them into a container/path string so our backend preview
      // endpoint can fetch the blob server-side.
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

      // If it's already local/data, just use it.
      if (p.startsWith("file:") || p.startsWith("data:")) {
        if (mounted) setUri(p);
        return;
      }

      try {
        const localUri = await previewFile(p);
        if (mounted) setUri(localUri);
      } catch (_e) {
        // Don't fall back to Azure Blob direct URLs (often private -> 409).
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

export default function DepositScreen() {
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
  const [selectedCurrency, setSelectedCurrency] = useState(null);

  const [amount, setAmount] = useState("");

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
      Alert.alert(
        "Select account",
        "Please select an account to deposit into.",
      );
      return;
    }

    if (!selectedMethod) {
      Alert.alert("Select method", "Please select a deposit method.");
      return;
    }

    const amt = Number(amount);
    if (!amount || Number.isNaN(amt) || amt <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid deposit amount.");
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

    const settings = parseSettings(selectedMethod.settingsJson);
    const fields = settings?.fields || {};
    const kind = String(selectedMethod.kind || "").toLowerCase();

    if (kind.includes("stripe")) {
      const link = fields?.paymentLink;
      if (!link) {
        Alert.alert("Payment link missing", "No payment link found.");
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
        `Account Holder: ${fields?.accountHolderName || "—"}`,
        `Account Number: ${fields?.accountNumber || "—"}`,
        `Bank: ${fields?.bankName || "—"}`,
        `Branch: ${fields?.branchName || "—"}`,
        fields?.ifscCode ? `IFSC: ${fields.ifscCode}` : null,
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
        <Text style={styles.headerTitle}>Deposit</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Account */}
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


          {/* Payment Options */}
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
                Endpoint: /FinanceOptions?mode=deposit
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
                        // set first available currency for the category
                        const firstCsv = cat?.methods?.[0]?.currenciesCsv || "";
                        const firstCurrency = (firstCsv.split(",").map((s) => s.trim()).filter(Boolean) || [null])[0];
                        setSelectedCurrency(firstCurrency ?? null);
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

              

              {/* {selectedMethod ? (
                <View style={{ marginTop: 12 }}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>
                    Details
                  </Text>
                  <View
                    style={[
                      styles.card,
                      {
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    {selectedMethod.imageUrl ? (
                      <PreviewedImage
                        uriOrPath={selectedMethod.imageUrl}
                        style={styles.methodImage}
                        theme={theme}
                        fallbackIcon="image"
                      />
                    ) : null}
                    <Text style={[styles.cardTitle, { color: theme.text }]}>
                      {selectedMethod.name}
                    </Text>
                    <Text style={[styles.cardSub, { color: theme.secondary }]}>
                      {selectedMethod.kind || ""}
                    </Text>
                    <Text
                      style={[
                        styles.cardSub,
                        { color: theme.secondary, marginTop: 6 },
                      ]}
                    >
                      Processing time: {selectedCategory?.processingTime || "—"}
                    </Text>
                    {(() => {
                      const s = parseSettings(selectedMethod.settingsJson);
                      const f = s?.fields || {};
                      const kind = String(
                        selectedMethod.kind || "",
                      ).toLowerCase();
                      if (kind.includes("upi")) {
                        return (
                          <Text
                            style={[
                              styles.cardSub,
                              { color: theme.text, marginTop: 10 },
                            ]}
                          >
                            UPI ID: {f?.upiId || "—"}
                          </Text>
                        );
                      }
                      if (kind.includes("stripe")) {
                        return (
                          <Text
                            style={[
                              styles.cardSub,
                              { color: theme.text, marginTop: 10 },
                            ]}
                          >
                            Payment Link: {f?.paymentLink || "—"}
                          </Text>
                        );
                      }
                      if (kind.includes("bank")) {
                        return (
                          <View style={{ marginTop: 10, gap: 4 }}>
                            <Text
                              style={[styles.cardSub, { color: theme.text }]}
                            >
                              Account Holder: {f?.accountHolderName || "—"}
                            </Text>
                            <Text
                              style={[styles.cardSub, { color: theme.text }]}
                            >
                              Account Number: {f?.accountNumber || "—"}
                            </Text>
                            <Text
                              style={[styles.cardSub, { color: theme.text }]}
                            >
                              Bank: {f?.bankName || "—"}
                            </Text>
                            <Text
                              style={[styles.cardSub, { color: theme.text }]}
                            >
                              Branch: {f?.branchName || "—"}
                            </Text>
                            {f?.ifscCode ? (
                              <Text
                                style={[styles.cardSub, { color: theme.text }]}
                              >
                                IFSC: {f.ifscCode}
                              </Text>
                            ) : null}
                          </View>
                        );
                      }
                      return (
                        <Text
                          style={[
                            styles.cardSub,
                            { color: theme.secondary, marginTop: 10 },
                          ]}
                        >
                          No extra details for this method.
                        </Text>
                      );
                    })()}
                  </View>
                </View>
              ) : null} */}
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
                No deposit methods available.
              </Text>
            </View>
          )}

         

          <View style={{ marginTop: 12 }}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Currency</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 12, paddingVertical: 4 }}
                >
                  {currencyList.length ? (
                    currencyList.map((c) => {
                      const active = String(c) === String(selectedCurrency);
                      return (
                        <TouchableOpacity
                          key={c}
                          onPress={() => setSelectedCurrency(c)}
                          style={[
                            styles.optionCard,
                            {
                              backgroundColor: theme.card,
                              borderColor: active ? theme.primary : theme.border,
                              minWidth: 100,
                            },
                          ]}
                        >
                          <Text style={[styles.optionTitle, { color: theme.text }]}>
                            {c}
                          </Text>
                          <Text style={[styles.optionSub, { color: theme.secondary }]}> 
                            Min {currencyLimits.min ?? "—"} • Max {currencyLimits.max ?? "—"}
                          </Text>
                        </TouchableOpacity>
                      );
                    })
                  ) : (
                    <View style={[styles.methodLine, { backgroundColor: theme.card }]}> 
                      <Text style={{ color: theme.secondary }}>No currencies available</Text>
                    </View>
                  )}
                </ScrollView>
              </View>

          {/* Amount */}
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
          </View>



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
  textInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
  },
  methodRow: {
    flexDirection: "row",
    gap: 12,
  },
  methodCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  methodTitle: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "800",
  },
  methodSub: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
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
