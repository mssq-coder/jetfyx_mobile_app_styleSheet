import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { previewFile } from "../api/getServices";
import { confirmWithdrawal } from "../api/Services";
import { showErrorToast, showSuccessToast } from "../utils/toast";
import AppIcon from "./AppIcon";

const { height } = Dimensions.get("window");

const isLocalUri = (value) => {
  const raw = String(value || "");
  return raw.startsWith("file:") || raw.startsWith("data:");
};

const toPreviewFileInput = (urlOrPath) => {
  if (!urlOrPath) return null;
  const raw = String(urlOrPath);
  if (isLocalUri(raw)) return raw;

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const u = new URL(raw);
      const marker = "/shared/file-preview/preview/";
      const idx = u.pathname.indexOf(marker);
      if (idx !== -1) {
        const after = u.pathname.slice(idx + marker.length);
        return decodeURIComponent(after.replace(/^\/+/, ""));
      }
    } catch (_e) {
      // ignore
    }
  }

  return raw;
};

const usePreviewUri = ({ visible, imageUrl }) => {
  const [previewUri, setPreviewUri] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const previewInput = useMemo(() => toPreviewFileInput(imageUrl), [imageUrl]);

  useEffect(() => {
    let mounted = true;

    if (!visible || !previewInput) {
      setPreviewUri(null);
      setPreviewLoading(false);
      return () => {
        mounted = false;
      };
    }

    (async () => {
      try {
        setPreviewLoading(true);
        const raw = String(previewInput);

        if (isLocalUri(raw)) {
          if (mounted) setPreviewUri(raw);
          return;
        }

        const uri = await previewFile(raw);
        if (mounted) setPreviewUri(uri);
      } catch (_e) {
        if (mounted) setPreviewUri(null);
      } finally {
        if (mounted) setPreviewLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [previewInput, visible]);

  return { previewUri, previewLoading };
};

const formatFieldLabel = (key) => {
  return String(key)
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
};

const formatFieldsForDisplay = (values = {}) => {
  if (!values || typeof values !== "object") return [];

  const entries = Object.entries(values)
    .filter(([_k, v]) => v !== undefined && v !== null && String(v).trim())
    .map(([k, v]) => ({
      key: k,
      label: formatFieldLabel(k),
      value: String(v),
    }));

  return entries;
};

export default function WithdrawalDetailsModal({
  visible,
  onClose,
  theme,
  referenceNumber,
  imageUrl,
  paymentName,
  processingTime,
  amount,
  currency,
  fieldValues,
  withdrawalPayloadBase,
  detailsJsonBase,
  onSuccess,
}) {
  const [modalAnim] = useState(new Animated.Value(0));
  const [submitting, setSubmitting] = useState(false);
  const [additionalNotes, setAdditionalNotes] = useState("");

  const { previewUri, previewLoading } = usePreviewUri({ visible, imageUrl });

  const displayFields = useMemo(
    () => formatFieldsForDisplay(fieldValues),
    [fieldValues],
  );

  useEffect(() => {
    if (visible) {
      Animated.spring(modalAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 10,
      }).start();
    } else {
      modalAnim.setValue(0);
      setAdditionalNotes("");
      setSubmitting(false);
    }
  }, [visible]);

  const modalTranslateY = modalAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [height, 0],
  });

  const handleConfirm = async () => {
    if (submitting) return;

    if (!withdrawalPayloadBase || typeof withdrawalPayloadBase !== "object") {
      showErrorToast("Missing withdrawal payload.", "Withdrawal");
      return;
    }

    try {
      setSubmitting(true);

      const cleanedFields = {};
      Object.entries(fieldValues || {}).forEach(([k, v]) => {
        if (v === undefined || v === null) return;
        const s = String(v);
        if (!s.trim()) return;
        cleanedFields[k] = s;
      });

      const payload = {
        ...withdrawalPayloadBase,
        ...(additionalNotes ? { Comment: additionalNotes } : {}),
        DetailsJson: {
          ...(detailsJsonBase && typeof detailsJsonBase === "object"
            ? detailsJsonBase
            : {}),
          ...(referenceNumber ? { ReferenceNumber: referenceNumber } : {}),
          ...cleanedFields,
        },
      };

      const res = await confirmWithdrawal(payload);
      showSuccessToast("Withdrawal submitted successfully.", "Submitted");
      onSuccess?.(res);
    } catch (e) {
      showErrorToast(
        e?.response?.data?.message ||
          e?.response?.data?.title ||
          e?.message ||
          "Withdrawal submission failed.",
        "Failed",
      );
      console.error("[Withdrawal] confirmWithdrawal failed:", {
        message: e?.message,
        status: e?.response?.status,
        data: e?.response?.data,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      transparent={false}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme?.background }]}
      >
        <Animated.View
          style={{
            flex: 1,
            transform: [{ translateY: modalTranslateY }],
          }}
        >
          <View
            style={[
              styles.header,
              { backgroundColor: theme?.primary || "#111" },
            ]}
          >
            <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
              <AppIcon name="close" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Withdrawal Details</Text>
            <View style={styles.headerBtn} />
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <View
              style={[
                styles.card,
                { backgroundColor: theme?.card, borderColor: theme?.border },
              ]}
            >
              <View style={styles.rowBetween}>
                <Text style={[styles.title, { color: theme?.text }]}>
                  {paymentName || "Selected Method"}
                </Text>
                <Text style={[styles.meta, { color: theme?.secondary }]}>
                  {processingTime || ""}
                </Text>
              </View>

              {referenceNumber ? (
                <View style={{ marginTop: 10 }}>
                  <Text style={[styles.meta, { color: theme?.secondary }]}>
                    Reference Number
                  </Text>
                  <Text style={[styles.value, { color: theme?.text }]}>
                    {String(referenceNumber)}
                  </Text>
                </View>
              ) : null}

              <View style={{ marginTop: 10 }}>
                <Text style={[styles.meta, { color: theme?.secondary }]}>
                  Amount
                </Text>
                <Text style={[styles.value, { color: theme?.text }]}>
                  {String(amount ?? "—")} {String(currency ?? "")}
                </Text>
              </View>

              {imageUrl ? (
                <View style={{ marginTop: 12 }}>
                  <Text style={[styles.meta, { color: theme?.secondary }]}>
                    Method Image
                  </Text>
                  <View style={styles.imageWrap}>
                    {previewLoading ? (
                      <View
                        style={[
                          styles.image,
                          {
                            backgroundColor: theme?.background,
                            alignItems: "center",
                            justifyContent: "center",
                          },
                        ]}
                      >
                        <ActivityIndicator color={theme?.primary} />
                      </View>
                    ) : previewUri ? (
                      <Image
                        source={{ uri: previewUri }}
                        style={styles.image}
                      />
                    ) : (
                      <View
                        style={[
                          styles.image,
                          {
                            backgroundColor: theme?.background,
                            alignItems: "center",
                            justifyContent: "center",
                          },
                        ]}
                      >
                        <AppIcon
                          name="image"
                          size={22}
                          color={theme?.secondary}
                        />
                      </View>
                    )}
                  </View>
                </View>
              ) : null}
            </View>

            {displayFields.length ? (
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: theme?.card,
                    borderColor: theme?.border,
                    marginTop: 12,
                  },
                ]}
              >
                <Text style={[styles.sectionTitle, { color: theme?.text }]}>
                  Payment Details
                </Text>
                {displayFields.map((f) => (
                  <View key={f.key} style={styles.detailRow}>
                    <Text
                      style={[styles.detailKey, { color: theme?.secondary }]}
                    >
                      {f.label}
                    </Text>
                    <Text style={[styles.detailValue, { color: theme?.text }]}>
                      {f.value}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme?.card,
                  borderColor: theme?.border,
                  marginTop: 12,
                },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: theme?.text }]}>
                Notes (Optional)
              </Text>
              <TextInput
                value={additionalNotes}
                onChangeText={setAdditionalNotes}
                placeholder="Add a note..."
                placeholderTextColor={theme?.secondary}
                multiline
                style={[
                  styles.notesInput,
                  { color: theme?.text, borderColor: theme?.border },
                ]}
              />
            </View>

            <TouchableOpacity
              onPress={handleConfirm}
              disabled={submitting}
              style={[
                styles.primaryButton,
                {
                  backgroundColor: theme?.primary,
                  opacity: submitting ? 0.7 : 1,
                  marginTop: 14,
                },
              ]}
            >
              {submitting ? (
                <View style={styles.rowCenter}>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.primaryButtonText}>Confirming...</Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>Confirm Withdrawal</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerBtn: {
    width: 44,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  rowCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    justifyContent: "center",
  },
  title: {
    fontSize: 15,
    fontWeight: "900",
    flex: 1,
  },
  meta: {
    fontSize: 12,
    fontWeight: "700",
  },
  value: {
    fontSize: 14,
    fontWeight: "900",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 8,
  },
  detailRow: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  detailKey: {
    fontSize: 12,
    fontWeight: "800",
  },
  detailValue: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "800",
  },
  imageWrap: { marginTop: 6 },
  image: {
    width: "100%",
    height: 160,
    borderRadius: 12,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 90,
    fontSize: 13,
    fontWeight: "700",
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
  },
});
