import { ResizeMode, Video } from "expo-av";
import { BlurView } from "expo-blur";
import * as FileSystem from "expo-file-system";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getMessages, markMessageAsRead, previewFile } from "../../api/mailbox";
import AccountSelectorModal from "../../components/Accounts/AccountSelectorModal";
import AppIcon from "../../components/AppIcon";
import { useAppTheme } from "../../contexts/ThemeContext";
import usePullToRefresh from "../../hooks/usePullToRefresh";
import { useAuthStore } from "../../store/authStore";
import { showErrorToast } from "../../utils/toast";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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

  try {
    Object.keys(email || {}).forEach((key) => {
      if (!/attachment/i.test(key)) return;
      push(email[key]);
    });
  } catch {
    // ignore
  }

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
    const date = new Date(value);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  } catch {
    return String(value);
  }
}

export default function Mailbox() {
  const { theme } = useAppTheme();
  const { refreshing, runRefresh } = usePullToRefresh();
  const selectedAccountId = useAuthStore((s) => s.selectedAccountId);
  const accounts = useAuthStore((s) => s.accounts);
  const sharedAccounts = useAuthStore((s) => s.sharedAccounts);
  const fullName = useAuthStore((s) => s.fullName);
  const setSelectedAccount = useAuthStore((s) => s.setSelectedAccount);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const [accountPickerOpen, setAccountPickerOpen] = useState(false);
  const [imagePreviewUri, setImagePreviewUri] = useState(null);
  const [videoPreviewUri, setVideoPreviewUri] = useState(null);
  const [androidDownloadDirUri, setAndroidDownloadDirUri] = useState(null);

  const selectedAccount = useMemo(() => {
    const sharedList = (sharedAccounts || []).flatMap((s) => s?.accounts || []);
    const list = [...(Array.isArray(accounts) ? accounts : []), ...sharedList];
    if (selectedAccountId == null) return null;
    return (
      list.find(
        (a) => String(a?.accountId ?? a?.id) === String(selectedAccountId),
      ) || null
    );
  }, [accounts, sharedAccounts, selectedAccountId]);

  const selectedAccountNumber =
    selectedAccount?.accountNumber ?? selectedAccountId ?? null;

  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((totalCount || 0) / pageSize)),
    [totalCount, pageSize],
  );

  const [showModal, setShowModal] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [showAttachments, setShowAttachments] = useState(false);
  const [attachmentPaths, setAttachmentPaths] = useState([]);
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
    setImagePreviewUri(null);
    setVideoPreviewUri(null);
    const paths = getAttachmentsFromEmail(email);
    setAttachmentPaths(paths);
    setShowAttachments(paths.length > 0);
    setPreviewUrls({});

    if (paths.length > 0) {
      const urls = {};
      for (let i = 0; i < paths.length; i += 1) {
        try {
          urls[i] = await previewFile(paths[i]);
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

      const isLocalFile = String(url).startsWith("file:");
      const filename = getFilename(attachmentPath);

      if (fileType === "image" && isLocalFile) {
        setImagePreviewUri(url);
        return;
      }

      if (fileType === "video" && isLocalFile) {
        setVideoPreviewUri(url);
        return;
      }

      if (isLocalFile) {
        if (Platform.OS === "android") {
          const contentUri = await FileSystem.getContentUriAsync(url);

          try {
            const IntentLauncher = await import("expo-intent-launcher");
            const mimeType = fileType === "pdf" ? "application/pdf" : "*/*";
            await IntentLauncher.startActivityAsync(
              "android.intent.action.VIEW",
              {
                data: contentUri,
                flags: IntentLauncher.Flags.GRANT_READ_URI_PERMISSION,
                type: mimeType,
              },
            );
            return;
          } catch (_intentErr) {
            // Fall back to Linking / SAF
          }

          try {
            await Linking.openURL(contentUri);
            return;
          } catch (_linkErr) {
            if (fileType === "pdf") {
              const requestDir = async () => {
                const perm =
                  await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
                if (!perm?.granted) return null;
                return perm.directoryUri;
              };

              const directoryUri =
                androidDownloadDirUri || (await requestDir());
              if (!directoryUri) {
                showErrorToast(
                  "Folder permission is required to save the PDF.",
                  "Mailbox",
                );
                return;
              }
              if (!androidDownloadDirUri)
                setAndroidDownloadDirUri(directoryUri);

              const safeName = filename.toLowerCase().endsWith(".pdf")
                ? filename
                : `${filename}.pdf`;

              const base64 = await FileSystem.readAsStringAsync(url, {
                encoding: FileSystem.EncodingType.Base64,
              });
              const destUri =
                await FileSystem.StorageAccessFramework.createFileAsync(
                  directoryUri,
                  safeName,
                  "application/pdf",
                );
              await FileSystem.writeAsStringAsync(destUri, base64, {
                encoding: FileSystem.EncodingType.Base64,
              });
              await Linking.openURL(destUri);
              return;
            }

            throw _linkErr;
          }
        }

        await Linking.openURL(url);
        return;
      }

      await WebBrowser.openBrowserAsync(url);
    } catch (_e) {
      const message =
        _e?.message ||
        _e?.response?.data?.message ||
        _e?.response?.data?.title ||
        "Failed to open attachment";
      showErrorToast(message, "Mailbox");
    }
  };

  const renderRow = (email) => {
    const isRead = Boolean(email?.isRead ?? email?.read);
    const stableKey =
      email?.id ??
      `${email?.subject || ""}_${email?.sentAt || email?.date || ""}_${email?.fromAddress || ""}`;

    return (
      <Animated.View
        key={String(stableKey)}
        style={[
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.row,
            {
              backgroundColor: isRead ? "transparent" : theme.card + "80",
              borderBottomColor: theme.border,
            },
          ]}
          onPress={() => handleView(email)}
          activeOpacity={0.7}
        >
          <View style={styles.rowLeft}>
            <View
              style={[
                styles.avatarContainer,
                { backgroundColor: theme.primary + "20" },
              ]}
            >
              <Text style={[styles.avatarText, { color: theme.primary }]}>
                {(email?.fromAddress || email?.from || "?")
                  .charAt(0)
                  .toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.subjectContainer}>
                <Text
                  style={[
                    styles.subject,
                    { color: theme.text },
                    !isRead && styles.unreadSubject,
                  ]}
                  numberOfLines={1}
                >
                  {email?.subject || "(No subject)"}
                </Text>
                {!isRead && (
                  <View
                    style={[
                      styles.unreadBadge,
                      { backgroundColor: theme.primary },
                    ]}
                  >
                    <Text style={styles.unreadBadgeText}>New</Text>
                  </View>
                )}
              </View>
              <Text
                style={[styles.from, { color: theme.secondary }]}
                numberOfLines={1}
              >
                {email?.fromAddress || email?.from || "-"}
              </Text>
            </View>
          </View>
          <View style={styles.timeContainer}>
            <Text
              style={[styles.time, { color: theme.secondary }]}
              numberOfLines={1}
            >
              {formatDateTime(email?.sentAt || email?.date)}
            </Text>
            <AppIcon name="chevron-right" size={16} color={theme.secondary} />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <StatusBar backgroundColor={theme.primary} barStyle="light-content" />

      <LinearGradient
        colors={[theme.primary, theme.primary + "00"]}
        style={styles.headerGradient}
      />

      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <AppIcon name="arrow-back" color="#fff" size={22} />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: "#fff", flex: 1 }]}>
            Mailbox
          </Text>
          <TouchableOpacity
            onPress={() => setAccountPickerOpen(true)}
            activeOpacity={0.85}
            style={[
              styles.accountBadge,
              { backgroundColor: "rgba(255,255,255,0.18)" },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Select account"
          >
            <AppIcon name="account-circle" size={16} color="#fff" />
            <Text
              style={[styles.headerSub, { color: "rgba(255,255,255,0.92)" }]}
            >
              {selectedAccountNumber
                ? `Account #${selectedAccountNumber}`
                : "Select an account"}
            </Text>
            <AppIcon name="expand-more" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <AccountSelectorModal
        visible={accountPickerOpen}
        onClose={() => setAccountPickerOpen(false)}
        accounts={accounts}
        sharedAccounts={sharedAccounts}
        fullName={fullName || ""}
        selectedAccountId={
          selectedAccount
            ? (selectedAccount.accountId ?? selectedAccount.id)
            : selectedAccountId
        }
        onSelectAccount={(a) => {
          setSelectedAccount?.(a);
          setAccountPickerOpen(false);
        }}
        onRefresh={async () => {
          try {
            await refreshProfile?.();
          } catch {}
        }}
      />

      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <AppIcon name="email" size={20} color={theme.primary} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              Messages
            </Text>
          </View>
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
                      pageSize === n ? theme.primary : "transparent",
                    borderColor: pageSize === n ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: pageSize === n ? "#fff" : theme.text,
                    fontWeight: pageSize === n ? "800" : "600",
                    fontSize: 12,
                  }}
                >
                  {n}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={{
            paddingBottom: 8,
            paddingHorizontal: 12,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() =>
                runRefresh(async () => {
                  await fetchRef.current?.();
                })
              }
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
        >
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text
                style={{
                  color: theme.secondary,
                  marginTop: 16,
                  fontWeight: "600",
                }}
              >
                Loading messages...
              </Text>
            </View>
          ) : emails.length === 0 ? (
            <View style={styles.emptyBox}>
              <View
                style={[
                  styles.emptyIconContainer,
                  { backgroundColor: theme.primary + "10" },
                ]}
              >
                <AppIcon name="inbox" size={48} color={theme.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                No messages
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.secondary }]}>
                Your inbox is clean and ready
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
              styles.footerBtnLeft,
              {
                opacity: pageNumber <= 1 ? 0.5 : 1,
                borderColor: theme.border,
                backgroundColor: theme.background,
              },
            ]}
          >
            <AppIcon name="chevron-left" size={18} color={theme.text} />
            <Text
              style={{ color: theme.text, fontWeight: "700", marginLeft: 4 }}
            >
              Prev
            </Text>
          </TouchableOpacity>

          <View
            style={[
              styles.pageIndicator,
              { backgroundColor: theme.primary + "10" },
            ]}
          >
            <Text style={{ color: theme.primary, fontWeight: "800" }}>
              {pageNumber}
            </Text>
            <Text style={{ color: theme.secondary, fontWeight: "600" }}>
              / {totalPages}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setPageNumber((p) => Math.min(totalPages, p + 1))}
            disabled={pageNumber >= totalPages}
            style={[
              styles.footerBtn,
              styles.footerBtnRight,
              {
                opacity: pageNumber >= totalPages ? 0.5 : 1,
                borderColor: theme.border,
                backgroundColor: theme.background,
              },
            ]}
          >
            <Text
              style={{ color: theme.text, fontWeight: "700", marginRight: 4 }}
            >
              Next
            </Text>
            <AppIcon name="chevron-right" size={18} color={theme.text} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Modal
        visible={showModal && !!selectedEmail}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill}>
          <View style={styles.modalOverlay}>
            <Animated.View
              style={[
                styles.modalCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
              <LinearGradient
                colors={[theme.primary + "20", "transparent"]}
                style={styles.modalGradient}
              />

              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderLeft}>
                  <View
                    style={[
                      styles.modalAvatar,
                      { backgroundColor: theme.primary + "20" },
                    ]}
                  >
                    <Text
                      style={[styles.modalAvatarText, { color: theme.primary }]}
                    >
                      {(
                        selectedEmail?.fromAddress ||
                        selectedEmail?.from ||
                        "?"
                      )
                        .charAt(0)
                        .toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.modalSubject, { color: theme.text }]}
                      numberOfLines={2}
                    >
                      {selectedEmail?.subject || "(No subject)"}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setShowModal(false)}
                  style={[
                    styles.closeBtn,
                    { backgroundColor: theme.background },
                  ]}
                >
                  <AppIcon name="close" size={18} color={theme.text} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator={false}
              >
                <View
                  style={[
                    styles.modalMeta,
                    { backgroundColor: theme.background },
                  ]}
                >
                  <View style={styles.metaRow}>
                    <AppIcon name="person" size={16} color={theme.secondary} />
                    <Text style={[styles.metaValue, { color: theme.text }]}>
                      {selectedEmail?.fromAddress || selectedEmail?.from || "-"}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <AppIcon
                      name="schedule"
                      size={16}
                      color={theme.secondary}
                    />
                    <Text style={[styles.metaValue, { color: theme.text }]}>
                      {formatDateTime(
                        selectedEmail?.sentAt || selectedEmail?.date,
                      )}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalBody}>
                  <Text style={[styles.bodyText, { color: theme.text }]}>
                    {selectedEmail?.body || selectedEmail?.message || ""}
                  </Text>

                  {attachmentPaths.length > 0 && (
                    <View style={styles.attachmentsSection}>
                      <TouchableOpacity
                        onPress={() => setShowAttachments((v) => !v)}
                        style={styles.attachToggleWrapper}
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={[theme.primary, theme.primary + "dd"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.attachToggle}
                        >
                          <AppIcon
                            name={
                              showAttachments ? "expand-less" : "expand-more"
                            }
                            size={20}
                            color="#fff"
                          />
                          <Text style={styles.attachToggleText}>
                            {showAttachments
                              ? "Hide Attachments"
                              : `View ${attachmentPaths.length} Attachment${attachmentPaths.length > 1 ? "s" : ""}`}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>

                      {showAttachments && (
                        <Animated.View style={styles.attachmentsList}>
                          {attachmentPaths.map((attachmentPath, index) => {
                            const filename = getFilename(attachmentPath);
                            const fileType = getFileType(filename);
                            const isImage = fileType === "image";
                            const isPdf = fileType === "pdf";
                            const isVideo = fileType === "video";

                            return (
                              <TouchableOpacity
                                key={`${index}_${filename}`}
                                onPress={() =>
                                  openAttachment(
                                    attachmentPath,
                                    index,
                                    fileType,
                                  )
                                }
                                style={[
                                  styles.attachmentCard,
                                  {
                                    borderColor: theme.border,
                                    backgroundColor: theme.background,
                                  },
                                ]}
                                activeOpacity={0.7}
                              >
                                <View
                                  style={[
                                    styles.attachmentIconContainer,
                                    {
                                      backgroundColor: isImage
                                        ? "#3b82f6" + "20"
                                        : isPdf
                                          ? "#ef4444" + "20"
                                          : isVideo
                                            ? "#8b5cf6" + "20"
                                            : theme.primary + "20",
                                    },
                                  ]}
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
                                              ? "play-circle"
                                              : "attach-file"
                                      }
                                      size={24}
                                      color={
                                        isImage
                                          ? "#3b82f6"
                                          : isPdf
                                            ? "#ef4444"
                                            : isVideo
                                              ? "#8b5cf6"
                                              : theme.primary
                                      }
                                    />
                                  )}
                                </View>

                                <View style={styles.attachmentInfo}>
                                  <Text
                                    style={styles.attachmentName}
                                    numberOfLines={1}
                                  >
                                    {filename}
                                  </Text>
                                  <Text
                                    style={[
                                      styles.attachmentType,
                                      { color: theme.secondary },
                                    ]}
                                  >
                                    {fileType.toUpperCase()} • Tap to open
                                  </Text>
                                </View>

                                <View
                                  style={[
                                    styles.attachmentAction,
                                    { backgroundColor: theme.primary + "10" },
                                  ]}
                                >
                                  <AppIcon
                                    name="open-in-new"
                                    size={18}
                                    color={theme.primary}
                                  />
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                        </Animated.View>
                      )}
                    </View>
                  )}
                </View>
              </ScrollView>
            </Animated.View>
          </View>
        </BlurView>
      </Modal>

      <Modal
        visible={!!imagePreviewUri}
        transparent
        animationType="fade"
        onRequestClose={() => setImagePreviewUri(null)}
      >
        <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill}>
          <View style={styles.imageModalOverlay}>
            <TouchableOpacity
              style={styles.imageModalClose}
              onPress={() => setImagePreviewUri(null)}
              activeOpacity={0.8}
            >
              <BlurView intensity={80} style={styles.closeButtonBlur}>
                <AppIcon name="close" size={22} color="#fff" />
              </BlurView>
            </TouchableOpacity>
            {imagePreviewUri ? (
              <Image
                source={{ uri: imagePreviewUri }}
                style={styles.imageModalImage}
                resizeMode="contain"
              />
            ) : null}
          </View>
        </BlurView>
      </Modal>

      <Modal
        visible={!!videoPreviewUri}
        transparent
        animationType="fade"
        onRequestClose={() => setVideoPreviewUri(null)}
      >
        <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill}>
          <View style={styles.imageModalOverlay}>
            <TouchableOpacity
              style={styles.imageModalClose}
              onPress={() => setVideoPreviewUri(null)}
              activeOpacity={0.8}
            >
              <BlurView intensity={80} style={styles.closeButtonBlur}>
                <AppIcon name="close" size={22} color="#fff" />
              </BlurView>
            </TouchableOpacity>
            {videoPreviewUri ? (
              <View style={styles.videoContainer}>
                <Video
                  source={{ uri: videoPreviewUri }}
                  style={styles.videoPlayer}
                  resizeMode={ResizeMode.CONTAIN}
                  useNativeControls
                  shouldPlay
                  isLooping={false}
                />
              </View>
            ) : null}
          </View>
        </BlurView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  accountBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  headerSub: {
    fontSize: 13,
    fontWeight: "700",
  },
  card: {
    flex: 1,
    margin: 16,
    borderWidth: 1,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  cardHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  pageSizePills: {
    flexDirection: "row",
    gap: 8,
  },
  pill: {
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 52,
    alignItems: "center",
  },
  list: {
    flex: 1,
  },
  row: {
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: 16,
    marginBottom: 4,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "800",
  },
  subjectContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  subject: {
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  unreadSubject: {
    fontWeight: "900",
  },
  unreadBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  unreadBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
  },
  from: {
    fontSize: 13,
    fontWeight: "600",
    opacity: 0.9,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  time: {
    fontSize: 13,
    fontWeight: "700",
  },
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    minHeight: 300,
  },
  emptyBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    minHeight: 300,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerBtn: {
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  footerBtnLeft: {
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  footerBtnRight: {
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
  pageIndicator: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: "center",
    gap: 4,
  },
  modalOverlay: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    alignItems: "stretch",
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: 28,
    height: "90%",
    maxHeight: "90%",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  modalHeader: {
    padding: 20,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  modalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  modalAvatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  modalAvatarText: {
    fontSize: 22,
    fontWeight: "800",
  },
  modalSubject: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.5,
    lineHeight: 26,
  },
  closeBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  modalMeta: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  metaValue: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  modalBody: {
    paddingHorizontal: 20,
  },
  bodyText: {
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 24,
  },
  attachmentsSection: {
    marginTop: 24,
    marginBottom: 8,
  },
  attachToggleWrapper: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  attachToggle: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  attachToggleText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  attachmentsList: {
    marginTop: 16,
    gap: 12,
  },
  attachmentCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  attachmentIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  attachmentThumb: {
    width: "100%",
    height: "100%",
  },
  attachmentInfo: {
    flex: 1,
    gap: 4,
  },
  attachmentName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1e293b",
  },
  attachmentType: {
    fontSize: 12,
    fontWeight: "700",
  },
  attachmentAction: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  imageModalOverlay: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  imageModalImage: {
    width: "100%",
    height: "80%",
    borderRadius: 20,
  },
  videoContainer: {
    width: "100%",
    height: "80%",
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  videoPlayer: {
    width: "100%",
    height: "100%",
  },
  imageModalClose: {
    position: "absolute",
    top: 20,
    right: 20,
    zIndex: 10,
  },
  closeButtonBlur: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
