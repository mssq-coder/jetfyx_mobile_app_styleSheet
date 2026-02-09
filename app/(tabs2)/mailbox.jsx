import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getMessages, markMessageAsRead, previewFile } from "../../api/mailbox";
import AppIcon from "../../components/AppIcon";
import { useAppTheme } from "../../contexts/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import { showErrorToast } from "../../utils/toast";
import usePullToRefresh from "../../hooks/usePullToRefresh";

const getFileType = (url = "") => {
  if (!url) return "file";
  const ext = String(url).split(".").pop()?.toLowerCase()?.split("?")[0];
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(ext))
    return "image";
  if (ext === "pdf") return "pdf";
  if (["mp4", "mov", "avi", "mkv", "webm", "flv"].includes(ext)) return "video";
  return "file";
};

const getFilename = (url = "") => {
  if (!url) return "attachment";
  const path = String(url).split("/").pop()?.split("?")[0] || "attachment";
  return path.replace(/^[a-f0-9]{32}_/i, "");
};

const getAttachmentsFromEmail = (email) => {
  if (!email) return [];

  const out = [];
  const push = (v) => {
    if (!v) return;
    if (Array.isArray(v)) {
      v.forEach(push);
      return;
    }
    if (typeof v === "string") {
      out.push(v);
      return;
    }
    if (typeof v === "object") {
      out.push(
        v.url ||
          v.path ||
          v.filePath ||
          v.attachmentPath ||
          v.attachmentUrl ||
          v.uri ||
          "",
      );
    }
  };

  push(email.attachmentPath);
  push(email.attachmentUrl);
  push(email.attachmentUrls);
  push(email.attachmentPaths);
  push(email.attachments);

  // Some backends embed attachmentUrls inside a JSON body
  const tryParse = (text) => {
    if (!text || typeof text !== "string") return;
    try {
      const parsed = JSON.parse(text);
      push(parsed?.attachmentUrls);
      push(parsed?.attachmentPaths);
      push(parsed?.attachments);
    } catch {
      // ignore
    }
  };

  tryParse(email.body);
  tryParse(email.message);

  return Array.from(new Set(out.map((s) => String(s)).filter(Boolean)));
};

function formatDateTime(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

export default function Mailbox() {
  const { theme } = useAppTheme();
  const { refreshing, runRefresh } = usePullToRefresh();
  const selectedAccountId = useAuthStore((s) => s.selectedAccountId);
  const [imagePreviewUri, setImagePreviewUri] = useState(null);

  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((totalCount || 0) / pageSize)),
    [totalCount, pageSize],
  );

  const [showModal, setShowModal] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [showAttachments, setShowAttachments] = useState(false);
  const [previewUrls, setPreviewUrls] = useState({});

  const fetchRef = useRef(null);
  const lastFetchErrorRef = useRef(null);

  useEffect(() => {
    if (pageNumber > totalPages) setPageNumber(totalPages);
  }, [totalPages, pageNumber]);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true);
        const accountId = selectedAccountId;
        if (!accountId) {
          setEmails([]);
          setTotalCount(0);
          return;
        }

        const res = await getMessages(accountId, { pageNumber, pageSize });
        const root = res?.data && typeof res.data === "object" ? res.data : res;
        const dataRoot =
          root?.data && typeof root.data === "object" ? root.data : root;
        const items =
          dataRoot?.items ??
          dataRoot?.data?.items ??
          (Array.isArray(dataRoot) ? dataRoot : []);
        setEmails(Array.isArray(items) ? items : []);
        setTotalCount(
          dataRoot?.totalCount ??
            dataRoot?.data?.totalCount ??
            items?.length ??
            0,
        );
        lastFetchErrorRef.current = null;
      } catch (_e) {
        setEmails([]);
        setTotalCount(0);

        const message =
          _e?.response?.data?.message ||
          _e?.response?.data?.title ||
          _e?.message ||
          "Failed to load messages";
        if (lastFetchErrorRef.current !== message) {
          lastFetchErrorRef.current = message;
          showErrorToast(message, "Mailbox");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRef.current = fetchMessages;
    fetchMessages();
  }, [selectedAccountId, pageNumber, pageSize]);

  const handleView = async (email) => {
    setSelectedEmail(email);
    setShowModal(true);
    setShowAttachments(false);
    setPreviewUrls({});

    const attachmentPaths = getAttachmentsFromEmail(email);
    if (attachmentPaths.length > 0) {
      const urls = {};
      for (let i = 0; i < attachmentPaths.length; i += 1) {
        try {
          urls[i] = await previewFile(attachmentPaths[i]);
        } catch (_err) {
          urls[i] = null;
        }
      }
      setPreviewUrls(urls);
    }

    if (email && (email.read === false || email.isRead === false)) {
      setEmails((prev) =>
        prev.map((e) =>
          e.id === email.id ? { ...e, read: true, isRead: true } : e,
        ),
      );

      (async () => {
        try {
          const accountId = selectedAccountId;
          if (accountId) {
            await markMessageAsRead(accountId, email.id);
            await fetchRef.current?.();
          }
        } catch (_e) {}
      })();
    }
  };

  const openAttachment = async (attachmentPath, index, fileType) => {
    try {
      const url = previewUrls?.[index] || (await previewFile(attachmentPath));
      if (!url) return;

      // expo-web-browser cannot reliably open local file:// URIs.
      if (fileType === "image" && String(url).startsWith("file:")) {
        setImagePreviewUri(url);
        return;
      }

      await WebBrowser.openBrowserAsync(url);
    } catch (_e) {}
  };

  const renderRow = (email) => {
    const isRead = Boolean(email?.isRead ?? email?.read);
    const stableKey =
      email?.id ??
      `${email?.subject || ""}_${email?.sentAt || email?.date || ""}_${email?.fromAddress || ""}`;
    return (
      <TouchableOpacity
        key={String(stableKey)}
        style={[styles.row, { borderBottomColor: theme.border }]}
        onPress={() => handleView(email)}
        activeOpacity={0.7}
      >
        <View style={styles.rowLeft}>
          {!isRead ? (
            <View
              style={[styles.unreadDot, { backgroundColor: theme.primary }]}
            />
          ) : null}
          <View style={{ flex: 1 }}>
            <Text
              style={[styles.subject, { color: theme.text }]}
              numberOfLines={1}
            >
              {email?.subject || "(No subject)"}
            </Text>
            <Text
              style={[styles.from, { color: theme.secondary }]}
              numberOfLines={1}
            >
              {email?.fromAddress || email?.from || "-"}
            </Text>
          </View>
        </View>
        <Text
          style={[styles.time, { color: theme.secondary }]}
          numberOfLines={1}
        >
          {formatDateTime(email?.sentAt || email?.date)}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Mailbox</Text>
        <Text style={[styles.headerSub, { color: theme.secondary }]}>
          {selectedAccountId
            ? `Account #${selectedAccountId}`
            : "Select an account"}
        </Text>
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            Messages
          </Text>
          <View style={styles.pageSizePills}>
            {[10, 25, 50].map((n) => (
              <TouchableOpacity
                key={n}
                onPress={() => {
                  setPageSize(n);
                  setPageNumber(1);
                }}
                style={[
                  styles.pill,
                  {
                    backgroundColor:
                      pageSize === n ? theme.primary + "22" : theme.background,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text
                  style={{ color: theme.text, fontWeight: "700", fontSize: 12 }}
                >
                  {n}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={{ paddingBottom: 8 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() =>
                runRefresh(async () => {
                  await fetchRef.current?.();
                })
              }
              tintColor={theme.primary}
            />
          }
        >
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={theme.primary} />
              <Text style={{ color: theme.secondary, marginTop: 10 }}>
                Loading messages...
              </Text>
            </View>
          ) : emails.length === 0 ? (
            <View style={styles.emptyBox}>
              <AppIcon name="mail" size={28} color={theme.secondary} />
              <Text style={{ color: theme.secondary, marginTop: 10 }}>
                No messages
              </Text>
            </View>
          ) : (
            emails.map(renderRow)
          )}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: theme.border }]}>
          <TouchableOpacity
            onPress={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
            style={[
              styles.footerBtn,
              {
                opacity: pageNumber <= 1 ? 0.5 : 1,
                borderColor: theme.border,
                backgroundColor: theme.background,
              },
            ]}
          >
            <Text style={{ color: theme.text, fontWeight: "700" }}>Prev</Text>
          </TouchableOpacity>
          <Text style={{ color: theme.secondary, fontWeight: "700" }}>
            {pageNumber} / {totalPages}
          </Text>
          <TouchableOpacity
            onPress={() => setPageNumber((p) => Math.min(totalPages, p + 1))}
            disabled={pageNumber >= totalPages}
            style={[
              styles.footerBtn,
              {
                opacity: pageNumber >= totalPages ? 0.5 : 1,
                borderColor: theme.border,
                backgroundColor: theme.background,
              },
            ]}
          >
            <Text style={{ color: theme.text, fontWeight: "700" }}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={showModal && !!selectedEmail}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text
                style={[styles.modalTitle, { color: theme.text }]}
                numberOfLines={2}
              >
                {selectedEmail?.subject || "(No subject)"}
              </Text>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={styles.closeBtn}
              >
                <AppIcon name="close" size={20} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.metaBox,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.metaLabel, { color: theme.secondary }]}>
                  From
                </Text>
                <Text
                  style={[styles.metaValue, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {selectedEmail?.fromAddress || selectedEmail?.from || "-"}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.metaLabel, { color: theme.secondary }]}>
                  Date and Time
                </Text>
                <Text style={[styles.metaValue, { color: theme.text }]}>
                  {formatDateTime(selectedEmail?.sentAt || selectedEmail?.date)}
                </Text>
              </View>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 16 }}
            >
              <Text style={[styles.bodyText, { color: theme.text }]}>
                {selectedEmail?.body || selectedEmail?.message || ""}
              </Text>

              {getAttachmentsFromEmail(selectedEmail).length > 0 ? (
                <View style={{ marginTop: 16 }}>
                  <TouchableOpacity
                    onPress={() => setShowAttachments((v) => !v)}
                    style={[
                      styles.attachToggle,
                      { backgroundColor: theme.primary },
                    ]}
                    activeOpacity={0.8}
                  >
                    <Text style={{ color: "#fff", fontWeight: "800" }}>
                      {showAttachments
                        ? "Hide Attachments"
                        : `Show Attachments (${getAttachmentsFromEmail(selectedEmail).length})`}
                    </Text>
                  </TouchableOpacity>

                  {showAttachments ? (
                    <View style={{ marginTop: 12, gap: 10 }}>
                      {getAttachmentsFromEmail(selectedEmail).map(
                        (attachmentPath, index) => {
                          const filename = getFilename(attachmentPath);
                          const fileType = getFileType(filename);
                          const isImage = fileType === "image";
                          const isPdf = fileType === "pdf";
                          const isVideo = fileType === "video";

                          return (
                            <TouchableOpacity
                              key={`${index}_${filename}`}
                              onPress={() =>
                                openAttachment(attachmentPath, index, fileType)
                              }
                              style={[
                                styles.attachmentRow,
                                {
                                  borderColor: theme.border,
                                  backgroundColor: theme.background,
                                },
                              ]}
                              activeOpacity={0.8}
                            >
                              {isImage && previewUrls?.[index] ? (
                                <Image
                                  source={{ uri: previewUrls[index] }}
                                  style={styles.attachmentThumb}
                                  resizeMode="cover"
                                />
                              ) : (
                                <AppIcon
                                  name={
                                    isImage
                                      ? "image"
                                      : isPdf
                                        ? "picture-as-pdf"
                                        : isVideo
                                          ? "videocam"
                                          : "attach-file"
                                  }
                                  size={20}
                                  color={theme.primary}
                                />
                              )}
                              <View style={{ flex: 1 }}>
                                <Text
                                  style={{
                                    color: theme.text,
                                    fontWeight: "700",
                                  }}
                                  numberOfLines={1}
                                >
                                  {filename}
                                </Text>
                                <Text
                                  style={{
                                    color: theme.secondary,
                                    fontSize: 12,
                                  }}
                                >
                                  Tap to open
                                </Text>
                              </View>
                              <AppIcon
                                name="open-in-new"
                                size={18}
                                color={theme.secondary}
                              />
                            </TouchableOpacity>
                          );
                        },
                      )}
                    </View>
                  ) : null}
                </View>
              ) : null}
            </ScrollView>

            <View
              style={[styles.modalFooter, { borderTopColor: theme.border }]}
            >
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={[
                  styles.footerBtn,
                  {
                    borderColor: theme.border,
                    backgroundColor: theme.background,
                  },
                ]}
              >
                <Text style={{ color: theme.text, fontWeight: "800" }}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!imagePreviewUri}
        transparent
        animationType="fade"
        onRequestClose={() => setImagePreviewUri(null)}
      >
        <View style={styles.imageModalOverlay}>
          <TouchableOpacity
            style={styles.imageModalClose}
            onPress={() => setImagePreviewUri(null)}
            activeOpacity={0.8}
          >
            <AppIcon name="close" size={22} color="#fff" />
          </TouchableOpacity>
          {imagePreviewUri ? (
            <Image
              source={{ uri: imagePreviewUri }}
              style={styles.imageModalImage}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: "900" },
  headerSub: { marginTop: 4, fontSize: 12, fontWeight: "700" },
  card: {
    flex: 1,
    margin: 16,
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  cardHeader: {
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: { fontSize: 16, fontWeight: "900" },
  pageSizePills: { flexDirection: "row", gap: 8 },
  pill: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  list: { flex: 1 },
  row: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 10 },
  subject: { fontSize: 14, fontWeight: "900" },
  from: { marginTop: 3, fontSize: 12, fontWeight: "700" },
  time: { fontSize: 12, fontWeight: "800", maxWidth: 120, textAlign: "right" },
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  emptyBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  footer: {
    padding: 12,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerBtn: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 86,
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    padding: 14,
    justifyContent: "center",
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: 18,
    maxHeight: "90%",
    overflow: "hidden",
  },
  modalHeader: {
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: "900", flex: 1 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  metaBox: {
    marginHorizontal: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    gap: 12,
  },
  metaLabel: { fontSize: 12, fontWeight: "800" },
  metaValue: { marginTop: 2, fontSize: 13, fontWeight: "900" },
  bodyText: { fontSize: 15, fontWeight: "700", lineHeight: 20 },
  attachToggle: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  attachmentRow: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  attachmentThumb: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  modalFooter: { padding: 12, borderTopWidth: 1, alignItems: "flex-end" },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    padding: 14,
    justifyContent: "center",
  },
  imageModalImage: {
    width: "100%",
    height: "80%",
  },
  imageModalClose: {
    position: "absolute",
    top: 18,
    right: 18,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
});
