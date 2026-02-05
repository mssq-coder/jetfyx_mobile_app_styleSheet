import * as DocumentPicker from "expo-document-picker";
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
import { confirmDeposit } from "../api/Services";
import { showErrorToast, showSuccessToast } from "../utils/toast";
import AppIcon from "./AppIcon";

const { width, height } = Dimensions.get("window");
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
        // Convert absolute preview URL back into storage path so previewFile
        // calls the protected preview endpoint with auth.
        const after = u.pathname.slice(idx + marker.length);
        return decodeURIComponent(after.replace(/^\/+/, ""));
      }
    } catch (_e) {
      // ignore; fall back to raw
    }
  }

  return raw;
};

const resolveReferenceNumber = ({ referenceNumber, fields }) => {
  return (
    referenceNumber ??
    fields?.referenceNumber ??
    fields?.reference ??
    fields?.referenceNo ??
    null
  );
};

const formatFieldsForDisplay = (fields = {}, { excludeKeys } = {}) => {
  if (!fields || typeof fields !== "object") return null;

  const exclusions = new Set(
    Array.isArray(excludeKeys) ? excludeKeys.map(String) : [],
  );

  const entries = Object.entries(fields)
    .filter(([key]) => !exclusions.has(String(key)))
    .map(([key, value]) => {
      const label = String(key)
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (s) => s.toUpperCase())
        .trim();
      return { key, label, value };
    });

  return entries.length > 0 ? entries : null;
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

const DepositDetailsModal = ({
  visible,
  onClose,
  fields,
  referenceNumber,
  imageUrl,
  additionalNotes,
  setAdditionalNotes,
  onProceed,
  depositPayload,
  paymentMode = "manual",
  theme,
}) => {
  const [modalAnim] = useState(new Animated.Value(0));
  const [imageFullscreen, setImageFullscreen] = useState(false);
  const [paymentProofFile, setPaymentProofFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const resolvedReference = useMemo(
    () => resolveReferenceNumber({ referenceNumber, fields }),
    [referenceNumber, fields],
  );

  const { previewUri, previewLoading } = usePreviewUri({ visible, imageUrl });

  const formattedFields = useMemo(() => {
    const excludeKeys = resolvedReference ? ["referenceNumber"] : [];
    return formatFieldsForDisplay(fields, { excludeKeys });
  }, [fields, resolvedReference]);

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
      setImageFullscreen(false);
      setPaymentProofFile(null);
    }
  }, [visible]);

  const modalTranslateY = modalAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [height, 0],
  });

  const handleImagePress = () => {
    if (previewUri) {
      setImageFullscreen(true);
    }
  };

  const pickPaymentProof = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      setPaymentProofFile({
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType,
        size: asset.size,
      });
    } catch (_e) {
      // ignore
    }
  };

  const removePaymentProof = () => setPaymentProofFile(null);

  const isImageProof = useMemo(() => {
    const mt = String(paymentProofFile?.mimeType || "").toLowerCase();
    if (mt.startsWith("image/")) return true;
    const name = String(paymentProofFile?.name || "").toLowerCase();
    return (
      name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg")
    );
  }, [paymentProofFile]);

  const handleConfirmProceed = async () => {
    if (!paymentProofFile || submitting) return;

    const mode = String(paymentMode || "manual").toLowerCase();

    // Both Manual + Stripe proof upload submit through confirmDeposit.
    if (!depositPayload || typeof depositPayload !== "object") {
      showErrorToast(
        mode === "stripe"
          ? "Missing Stripe deposit payload."
          : "Missing deposit payload.",
        mode === "stripe" ? "Stripe" : "Deposit",
      );
      return;
    }

    const payload = {
      ...depositPayload,
      Comment: additionalNotes || "",
      PaymentProofFile: paymentProofFile,
    };

    try {
      setSubmitting(true);
      const res = await confirmDeposit(payload);
      showSuccessToast("Deposit submitted successfully.", "Submitted");

      setPaymentProofFile(null);
      setAdditionalNotes?.("");
      setImageFullscreen(false);
      onProceed?.(res);
    } catch (e) {
      showErrorToast(
        e?.response?.data?.message ||
          e?.message ||
          "Deposit submission failed.",
        "Failed",
      );
      console.error("[Deposit] confirmDeposit failed:", {
        message: e?.message,
        status: e?.response?.status,
        data: e?.response?.data,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
        transparent={false}
      >
        <SafeAreaView
          style={[{ backgroundColor: theme.background }, styles.modalContainer]}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.headerIcon,
                  { backgroundColor: `${theme.primary}15` },
                ]}
              >
                <AppIcon name="receipt-long" color={theme.primary} size={24} />
              </View>
              <View>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  Deposit Details
                </Text>
                <Text
                  style={[styles.modalSubtitle, { color: theme.secondary }]}
                >
                  Review and confirm deposit information
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeButton,
                { backgroundColor: `${theme.border}20` },
              ]}
            >
              <AppIcon name="close" color={theme.secondary} size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Reference Card */}
            {resolvedReference && (
              <View
                style={[
                  styles.referenceCard,
                  {
                    backgroundColor: `${theme.primary}08`,
                    borderColor: `${theme.primary}20`,
                  },
                ]}
              >
                <View style={styles.referenceIcon}>
                  <AppIcon name="tag" color={theme.primary} size={18} />
                </View>
                <View style={styles.referenceContent}>
                  <Text
                    style={[styles.referenceLabel, { color: theme.secondary }]}
                  >
                    Reference Number
                  </Text>
                  <Text
                    style={[styles.referenceValue, { color: theme.primary }]}
                    numberOfLines={1}
                  >
                    {String(resolvedReference)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.copyButton,
                    { backgroundColor: `${theme.primary}15` },
                  ]}
                  onPress={() => {
                    // Implement copy to clipboard
                  }}
                >
                  <AppIcon
                    name="content-copy"
                    color={theme.primary}
                    size={16}
                  />
                </TouchableOpacity>
              </View>
            )}

            {/* Image Preview */}
            {imageUrl && (
              <View style={styles.imageSection}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Payment Method Image
                </Text>
                <TouchableOpacity
                  onPress={handleImagePress}
                  disabled={!previewUri}
                  style={[
                    styles.imagePreviewContainer,
                    {
                      borderColor: `${theme.primary}30`,
                      backgroundColor: theme.card,
                    },
                  ]}
                >
                  {previewLoading ? (
                    <View style={styles.imageLoading}>
                      <ActivityIndicator color={theme.primary} size="large" />
                      <Text
                        style={[styles.loadingText, { color: theme.secondary }]}
                      >
                        Loading image...
                      </Text>
                    </View>
                  ) : previewUri ? (
                    <>
                      <Image
                        source={{ uri: previewUri }}
                        style={styles.previewImage}
                        resizeMode="cover"
                      />
                      <View style={styles.imageOverlay}>
                        <View
                          style={[
                            styles.zoomIcon,
                            { backgroundColor: "rgba(0,0,0,0.6)" },
                          ]}
                        >
                          <AppIcon name="zoom-in" color="#fff" size={20} />
                        </View>
                      </View>
                    </>
                  ) : (
                    <View style={styles.imageError}>
                      <AppIcon
                        name="broken-image"
                        color={theme.secondary}
                        size={40}
                      />
                      <Text
                        style={[styles.errorText, { color: theme.secondary }]}
                      >
                        Image unavailable
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
                <Text style={[styles.imageHint, { color: theme.secondary }]}>
                  Tap to view full screen
                </Text>
              </View>
            )}

            {/* Deposit Details */}
            {formattedFields && (
              <View style={styles.detailsSection}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Deposit Information
                </Text>
                <View
                  style={[
                    styles.detailsCard,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                >
                  {formattedFields.map(({ key, label, value }, index) => (
                    <View
                      key={key}
                      style={[
                        styles.detailRow,
                        index !== formattedFields.length - 1 && {
                          borderBottomWidth: 1,
                          borderBottomColor: `${theme.border}50`,
                        },
                      ]}
                    >
                      <View style={styles.detailLabelContainer}>
                        <Text
                          style={[
                            styles.detailLabel,
                            { color: theme.secondary },
                          ]}
                        >
                          {label}
                        </Text>
                      </View>
                      <Text style={[styles.detailValue, { color: theme.text }]}>
                        {value || "—"}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Additional Notes */}
            <View style={styles.notesSection}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Additional Notes
              </Text>
              <Text style={[styles.notesSubtitle, { color: theme.secondary }]}>
                Add any extra information about this deposit (optional)
              </Text>
              <View
                style={[
                  styles.notesContainer,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <TextInput
                  style={[
                    styles.notesInput,
                    {
                      color: theme.text,
                      backgroundColor: theme.card,
                    },
                  ]}
                  placeholder="Type your notes here..."
                  placeholderTextColor={`${theme.secondary}70`}
                  value={additionalNotes}
                  onChangeText={setAdditionalNotes}
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                />
                <View style={styles.notesFooter}>
                  <AppIcon name="edit-note" color={theme.secondary} size={16} />
                  <Text style={[styles.charCount, { color: theme.secondary }]}>
                    {additionalNotes.length}/500
                  </Text>
                </View>
              </View>
            </View>

            {/* Upload Proof */}
            <View style={styles.detailsSection}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Upload Payment Proof
              </Text>
              <Text style={[styles.notesSubtitle, { color: theme.secondary }]}>
                Supported: PDF, PNG, JPG
              </Text>

              <View
                style={[
                  styles.detailsCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <TouchableOpacity
                  onPress={pickPaymentProof}
                  activeOpacity={0.8}
                  style={styles.proofRow}
                >
                  <View
                    style={[
                      styles.headerIcon,
                      { backgroundColor: `${theme.primary}15` },
                    ]}
                  >
                    <AppIcon
                      name="upload-file"
                      color={theme.primary}
                      size={22}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.detailValue, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      {paymentProofFile?.name || "Tap to select file"}
                    </Text>
                    <Text
                      style={[styles.detailLabel, { color: theme.secondary }]}
                    >
                      {paymentProofFile?.mimeType ||
                        "application/pdf • image/*"}
                    </Text>
                  </View>
                  <AppIcon
                    name="chevron-right"
                    color={theme.secondary}
                    size={22}
                  />
                </TouchableOpacity>

                {paymentProofFile?.uri ? (
                  <View style={styles.proofPreviewWrap}>
                    {isImageProof ? (
                      <Image
                        source={{ uri: paymentProofFile.uri }}
                        style={styles.proofPreview}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={[
                          styles.pdfPreview,
                          { backgroundColor: `${theme.primary}08` },
                        ]}
                      >
                        <AppIcon
                          name="picture-as-pdf"
                          color={theme.primary}
                          size={34}
                        />
                        <Text style={[styles.pdfText, { color: theme.text }]}>
                          PDF selected
                        </Text>
                      </View>
                    )}

                    <TouchableOpacity
                      style={[
                        styles.proofRemove,
                        { backgroundColor: "rgba(0,0,0,0.55)" },
                      ]}
                      onPress={removePaymentProof}
                    >
                      <AppIcon name="close" color="#fff" size={18} />
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View
            style={[
              styles.modalFooter,
              { borderTopColor: `${theme.border}30` },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.cancelButton,
                {
                  backgroundColor: `${theme.negative}10`,
                  borderColor: `${theme.negative}30`,
                },
              ]}
              onPress={onClose}
              disabled={submitting}
            >
              <AppIcon name="close" color={theme.negative} size={18} />
              <Text style={[styles.cancelText, { color: theme.negative }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.proceedButton,
                {
                  backgroundColor: theme.primary,
                  shadowColor: theme.primary,
                  opacity: paymentProofFile && !submitting ? 1 : 0.5,
                },
              ]}
              disabled={!paymentProofFile || submitting}
              onPress={handleConfirmProceed}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <AppIcon name="check-circle" color="#fff" size={20} />
              )}
              <Text style={styles.proceedText}>
                {submitting ? "Submitting..." : "Confirm & Proceed"}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Full Screen Image Modal */}
      <Modal
        visible={imageFullscreen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageFullscreen(false)}
      >
        <View style={styles.fullscreenContainer}>
          <View style={styles.fullscreenHeader}>
            <TouchableOpacity
              style={styles.fullscreenClose}
              onPress={() => setImageFullscreen(false)}
            >
              <AppIcon name="close" color="#fff" size={28} />
            </TouchableOpacity>
          </View>
          {previewUri && (
            <Image
              source={{ uri: previewUri }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          )}
          <View style={styles.fullscreenFooter}>
            <Text style={styles.fullscreenText}>
              Pinch to zoom • Swipe to dismiss
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  proofRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  proofPreviewWrap: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  proofPreview: {
    width: "100%",
    height: 160,
  },
  pdfPreview: {
    width: "100%",
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  pdfText: {
    fontSize: 14,
    fontWeight: "700",
  },
  proofRemove: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 2,
    opacity: 0.7,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  referenceCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  referenceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  referenceContent: {
    flex: 1,
  },
  referenceLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  referenceValue: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  copyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  imageSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  imagePreviewContainer: {
    borderRadius: 16,
    borderWidth: 2,
    height: 200,
    overflow: "hidden",
    position: "relative",
  },
  imageLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "500",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  zoomIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  imageError: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    fontWeight: "500",
  },
  imageHint: {
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
    fontStyle: "italic",
  },
  detailsSection: {
    marginBottom: 24,
  },
  detailsCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  detailLabelContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
    paddingLeft: 12,
  },
  notesSection: {
    marginBottom: 32,
  },
  notesSubtitle: {
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  notesContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 4,
  },
  notesInput: {
    minHeight: 100,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 12,
    textAlignVertical: "top",
  },
  notesFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 8,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  charCount: {
    fontSize: 12,
    fontWeight: "500",
  },
  modalFooter: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "700",
  },
  proceedButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  proceedText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
  },
  fullscreenHeader: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  fullscreenClose: {
    alignSelf: "flex-start",
    padding: 8,
  },
  fullscreenImage: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  fullscreenFooter: {
    paddingBottom: 40,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  fullscreenText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    fontWeight: "500",
  },
});

export default DepositDetailsModal;
