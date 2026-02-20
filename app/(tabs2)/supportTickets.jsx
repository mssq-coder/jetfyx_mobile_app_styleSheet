import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { previewFile } from "../../api/allServices";
import {
  addTicketMessage,
  createTicket,
  getSupportTicketStatistics,
  getTicketById,
  getUserTickets,
  markTicketMessageAsRead,
} from "../../api/supportTickets";
import AppIcon from "../../components/AppIcon";
import { useAppTheme } from "../../contexts/ThemeContext";
import usePullToRefresh from "../../hooks/usePullToRefresh";
import {
  showErrorToast,
  showInfoToast,
  showSuccessToast,
} from "../../utils/toast";

const STATUSES = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "in-process", label: "In Process" },
  { key: "resolved", label: "Resolved" },
  { key: "rejected", label: "Rejected" },
];

const PRIORITIES = ["Low", "Medium", "High", "Urgent"];

const isImageName = (name) => {
  const n = String(name || "").toLowerCase();
  return [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"].some((e) =>
    n.endsWith(e),
  );
};

const formatShortTime = (timestamp) => {
  if (!timestamp) return "";
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    if (diffInDays === 0)
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7)
      return date.toLocaleDateString([], { weekday: "short" });
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return String(timestamp);
  }
};

const normalizeTicketList = (res) => {
  if (!res) return { items: [], meta: {} };
  if (Array.isArray(res)) return { items: res, meta: {} };
  const root = res?.data && typeof res.data === "object" ? res.data : res;
  const items = Array.isArray(root?.items)
    ? root.items
    : Array.isArray(root?.tickets)
      ? root.tickets
      : Array.isArray(root)
        ? root
        : [];
  const meta = {
    page: root?.page ?? root?.pageNumber ?? 1,
    pageSize: root?.pageSize ?? 10,
    totalCount: root?.totalCount ?? items.length,
    totalPages: root?.totalPages ?? 1,
  };
  return { items, meta };
};

const normalizeTicket = (res) => {
  if (!res) return null;
  const root = res?.data && typeof res.data === "object" ? res.data : res;
  return root;
};

const pickAttachments = async () => {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      "image/*",
      "application/pdf",
      "text/plain",
      "application/zip",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    multiple: true,
    copyToCacheDirectory: true,
  });

  if (result.canceled) return [];
  return (result.assets || []).map((a) => ({
    uri: a.uri,
    name: a.name,
    mimeType: a.mimeType,
    size: a.size,
  }));
};

function StatusChip({ label, active, onPress, theme }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? `${theme.primary}18` : theme.card,
          borderColor: active ? theme.primary : theme.border,
        },
      ]}
    >
      <Text
        style={{
          color: active ? theme.primary : theme.text,
          fontWeight: "800",
          fontSize: 12,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function TicketRow({ ticket, active, onPress, theme }) {
  const status = String(ticket?.status || "");
  const subject = String(ticket?.subject || "(No subject)");
  const createdAt =
    ticket?.createdAt || ticket?.timestamp || ticket?.createdDate;
  const messageCount = Array.isArray(ticket?.messages)
    ? ticket.messages.length
    : (ticket?.messageCount ?? 0);
  const userName =
    ticket?.userName || ticket?.creator || ticket?.userEmail || "You";

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.ticketRow,
        {
          backgroundColor: active ? `${theme.primary}10` : theme.background,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={{ flex: 1 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <Text
            numberOfLines={1}
            style={{ color: theme.text, fontWeight: "800", flex: 1 }}
          >
            {subject}
          </Text>
          <Text style={{ color: theme.secondary, fontSize: 12 }}>
            {formatShortTime(createdAt)}
          </Text>
        </View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 6,
            gap: 10,
          }}
        >
          <Text
            numberOfLines={1}
            style={{ color: theme.secondary, fontSize: 12, flex: 1 }}
          >
            {userName}
          </Text>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: `${theme.primary}15`,
                borderColor: theme.border,
              },
            ]}
          >
            <Text
              style={{ color: theme.primary, fontWeight: "800", fontSize: 11 }}
            >
              {status || "—"}
            </Text>
          </View>
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginTop: 8,
            gap: 6,
          }}
        >
          <AppIcon name="chat" color={theme.secondary} size={16} />
          <Text style={{ color: theme.secondary, fontSize: 12 }}>
            {messageCount} message{messageCount === 1 ? "" : "s"}
          </Text>
        </View>
      </View>
      <AppIcon name="chevron-right" color={theme.secondary} size={22} />
    </TouchableOpacity>
  );
}

function AttachmentChip({ label, onRemove, theme }) {
  return (
    <View
      style={[
        styles.attachmentChip,
        { backgroundColor: `${theme.primary}10`, borderColor: theme.border },
      ]}
    >
      <Text
        numberOfLines={1}
        style={{ color: theme.text, fontWeight: "700", flex: 1, fontSize: 12 }}
      >
        {label}
      </Text>
      <TouchableOpacity onPress={onRemove}>
        <AppIcon name="close" color={theme.secondary} size={18} />
      </TouchableOpacity>
    </View>
  );
}

function ImagePreviewModal({ open, title, localUri, onClose, theme }) {
  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.previewOverlay}>
        <View
          style={[
            styles.previewCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={styles.previewHeader}>
            <Text
              numberOfLines={1}
              style={{ color: theme.text, fontWeight: "900", flex: 1 }}
            >
              {title}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <AppIcon name="close" color={theme.secondary} size={22} />
            </TouchableOpacity>
          </View>
          {localUri ? (
            <Image
              source={{ uri: localUri }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.previewLoading}>
              <ActivityIndicator color={theme.primary} />
              <Text style={{ color: theme.secondary, marginTop: 10 }}>
                Loading...
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

export default function SupportTicketsScreen() {
  const { theme } = useAppTheme();

  const { refreshing, runRefresh } = usePullToRefresh();

  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({
    subject: "",
    category: "",
    description: "",
    priority: "Medium",
    attachments: [],
  });
  const [formErrors, setFormErrors] = useState({});

  const [messageText, setMessageText] = useState("");
  const [messageAttachments, setMessageAttachments] = useState([]);
  const [sending, setSending] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewLocalUri, setPreviewLocalUri] = useState(null);

  const scrollRef = useRef(null);

  const counts = useMemo(() => {
    // Fallback if API stats not available
    const base = {
      Open: 0,
      Pending: 0,
      "In Process": 0,
      Resolved: 0,
      Rejected: 0,
      Closed: 0,
      total: tickets.length,
    };

    (tickets || []).forEach((t) => {
      const s = String(t?.status || "").toLowerCase();
      if (s.includes("pending")) base.Pending += 1;
      else if (s.includes("process") || s.includes("progress"))
        base["In Process"] += 1;
      else if (s.includes("resolve")) base.Resolved += 1;
      else if (s.includes("reject")) base.Rejected += 1;
      else if (s.includes("close")) base.Closed += 1;
      else if (s.includes("open")) base.Open += 1;
    });

    return base;
  }, [tickets]);

  const loadStats = async () => {
    try {
      setStatsLoading(true);
      const res = await getSupportTicketStatistics();
      setStats(res);
    } catch (_e) {
      // Non-blocking
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  };

  const loadTickets = async ({ nextPage = 1, replace = true } = {}) => {
    try {
      setLoading(true);
      setError("");

      const params = {
        status: filterStatus !== "all" ? filterStatus : undefined,
        searchTerm: searchQuery ? searchQuery : undefined,
        sortBy: "CreatedAt",
        sortOrder: "desc",
        page: nextPage,
        pageSize,
      };

      const res = await getUserTickets(params);
      const { items, meta } = normalizeTicketList(res);

      setPage(meta.page || nextPage);
      setTotalPages(meta.totalPages || 1);

      setTickets((prev) => {
        if (replace) return items;
        // append unique by id
        const map = new Map();
        [...(prev || []), ...(items || [])].forEach((t) => {
          const id = t?.id ?? t?.ticketId ?? `${t?.subject}_${t?.createdAt}`;
          map.set(String(id), t);
        });
        return Array.from(map.values());
      });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load tickets";
      setError(msg);
      showErrorToast(msg, "Error");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () =>
    runRefresh(async () => {
      await Promise.all([
        loadStats(),
        loadTickets({ nextPage: 1, replace: true }),
      ]);

      if (selectedTicket?.id != null) {
        await onSelectTicket({ id: selectedTicket.id });
      }
    });

  useEffect(() => {
    loadStats();
    loadTickets({ nextPage: 1, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      loadTickets({ nextPage: 1, replace: true });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, searchQuery]);

  const openCreate = () => {
    setFormErrors({});
    setNewTicket({
      subject: "",
      category: "",
      description: "",
      priority: "Medium",
      attachments: [],
    });
    setCreateOpen(true);
  };

  const closeCreate = () => {
    setCreateOpen(false);
  };

  const validateCreate = () => {
    const e = {};
    if (!newTicket.subject?.trim()) e.subject = "Subject is required";
    if (!newTicket.category?.trim()) e.category = "Category is required";
    if (!newTicket.description?.trim())
      e.description = "Description is required";
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const onCreate = async () => {
    if (!validateCreate()) {
      showInfoToast("Please fill required fields", "Invalid");
      return;
    }

    try {
      setLoading(true);
      const created = await createTicket(
        {
          subject: newTicket.subject,
          category: newTicket.category,
          description: newTicket.description,
          priority: newTicket.priority,
        },
        newTicket.attachments,
      );

      showSuccessToast("Ticket created successfully", "Success");
      closeCreate();
      await loadTickets({ nextPage: 1, replace: true });

      const t = normalizeTicket(created);
      if (t?.id != null) {
        await onSelectTicket({ id: t.id });
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to create ticket";
      showErrorToast(msg, "Error");
    } finally {
      setLoading(false);
    }
  };

  const onSelectTicket = async (ticket) => {
    const ticketId = ticket?.id ?? ticket?.ticketId;
    if (ticketId == null) return;

    try {
      setLoading(true);
      const res = await getTicketById(ticketId);
      const t = normalizeTicket(res);
      setSelectedTicket(t);

      // Mark unread admin/support messages as read (best-effort)
      const messages = Array.isArray(t?.messages) ? t.messages : [];
      for (const msg of messages) {
        const senderType = String(msg?.senderType || "");
        const isUnread = msg?.isRead === false || msg?.isRead == null;
        if (
          isUnread &&
          (senderType.toLowerCase().includes("admin") ||
            senderType.toLowerCase().includes("support"))
        ) {
          const messageId = msg?.id ?? msg?.messageId;
          if (messageId != null) {
            markTicketMessageAsRead(messageId).catch(() => {});
          }
        }
      }

      setTimeout(
        () => scrollRef.current?.scrollToEnd?.({ animated: true }),
        250,
      );
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "Failed to load ticket";
      showErrorToast(msg, "Error");
    } finally {
      setLoading(false);
    }
  };

  const onSendMessage = async () => {
    if (!selectedTicket?.id) return;
    if (!messageText.trim() && messageAttachments.length === 0) return;

    try {
      setSending(true);
      const res = await addTicketMessage(
        selectedTicket.id,
        messageText,
        messageAttachments,
      );
      const newMsg = normalizeTicket(res);

      setMessageText("");
      setMessageAttachments([]);

      // If API returns message only, append. If it returns full ticket, replace.
      if (newMsg?.messages) {
        setSelectedTicket(newMsg);
      } else {
        setSelectedTicket((prev) => ({
          ...prev,
          messages: [...(prev?.messages || []), newMsg],
        }));
      }

      setTimeout(
        () => scrollRef.current?.scrollToEnd?.({ animated: true }),
        250,
      );
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to send message";
      showErrorToast(msg, "Error");
    } finally {
      setSending(false);
    }
  };

  const onPreviewAttachment = async (attachment) => {
    const path =
      attachment?.filePath ||
      attachment?.path ||
      attachment?.objectKey ||
      attachment?.url;
    const name = attachment?.fileName || attachment?.name || "Attachment";

    if (!path) {
      showErrorToast("Attachment path missing", "Error");
      return;
    }

    setPreviewTitle(String(name));
    setPreviewLocalUri(null);

    // Images: download and show inside modal
    if (isImageName(name)) {
      setPreviewOpen(true);
      try {
        const localUri = await previewFile(path);
        setPreviewLocalUri(localUri);
      } catch (err) {
        const msg = err?.message || "Failed to preview";
        showErrorToast(msg, "Error");
      }
      return;
    }

    // Other files: open in browser
    try {
      const localUri = await previewFile(path);
      await WebBrowser.openBrowserAsync(localUri);
    } catch (_e) {
      try {
        // fall back: try opening raw path if it is a URL
        if (String(path).startsWith("http")) {
          await WebBrowser.openBrowserAsync(String(path));
        } else {
          showErrorToast("Preview not available for this file.", "Error");
        }
      } catch (err2) {
        showErrorToast(err2?.message || "Failed to open attachment", "Error");
      }
    }
  };

  const renderList = () => (
    <>
      <View
        style={[
          styles.card,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <View style={styles.cardHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Support Tickets
            </Text>
            <Text style={{ color: theme.secondary, marginTop: 4 }}>
              Create a ticket and chat with support.
            </Text>
          </View>
          <TouchableOpacity
            onPress={openCreate}
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}
          >
            <AppIcon name="add" color="#fff" size={18} />
            <Text style={styles.primaryButtonText}>New</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View
            style={[
              styles.statBox,
              {
                backgroundColor: `${theme.primary}10`,
                borderColor: theme.border,
              },
            ]}
          >
            <Text
              style={{
                color: theme.secondary,
                fontSize: 12,
                fontWeight: "700",
              }}
            >
              Total
            </Text>
            <Text
              style={{ color: theme.text, fontSize: 18, fontWeight: "900" }}
            >
              {stats?.total ?? counts.total}
            </Text>
          </View>
          <View
            style={[
              styles.statBox,
              {
                backgroundColor: `${theme.primary}10`,
                borderColor: theme.border,
              },
            ]}
          >
            <Text
              style={{
                color: theme.secondary,
                fontSize: 12,
                fontWeight: "700",
              }}
            >
              Open
            </Text>
            <Text
              style={{ color: theme.text, fontSize: 18, fontWeight: "900" }}
            >
              {stats?.open ?? counts.Open}
            </Text>
          </View>
          <View
            style={[
              styles.statBox,
              {
                backgroundColor: `${theme.primary}10`,
                borderColor: theme.border,
              },
            ]}
          >
            <Text
              style={{
                color: theme.secondary,
                fontSize: 12,
                fontWeight: "700",
              }}
            >
              Resolved
            </Text>
            <Text
              style={{ color: theme.text, fontSize: 18, fontWeight: "900" }}
            >
              {stats?.resolved ?? counts.Resolved}
            </Text>
          </View>
          <View
            style={[
              styles.statBox,
              {
                backgroundColor: `${theme.primary}10`,
                borderColor: theme.border,
              },
            ]}
          >
            <Text
              style={{
                color: theme.secondary,
                fontSize: 12,
                fontWeight: "700",
              }}
            >
              Closed
            </Text>
            <Text
              style={{ color: theme.text, fontSize: 18, fontWeight: "900" }}
            >
              {stats?.closed ?? counts.Closed}
            </Text>
          </View>
        </View>

        {statsLoading ? (
          <View
            style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}
          >
            <ActivityIndicator color={theme.primary} />
            <Text style={{ color: theme.secondary, marginLeft: 10 }}>
              Loading stats...
            </Text>
          </View>
        ) : null}
      </View>

      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            marginTop: 14,
          },
        ]}
      >
        <Text
          style={[styles.sectionTitle, { color: theme.text, marginBottom: 10 }]}
        >
          Filters
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {STATUSES.map((s) => (
            <StatusChip
              key={s.key}
              label={s.label}
              active={filterStatus === s.key}
              onPress={() => setFilterStatus(s.key)}
              theme={theme}
            />
          ))}
        </ScrollView>

        <View
          style={[
            styles.searchRow,
            { borderColor: theme.border, backgroundColor: theme.background },
          ]}
        >
          <AppIcon name="search" color={theme.secondary} size={18} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search tickets..."
            placeholderTextColor={theme.secondary}
            style={[styles.searchInput, { color: theme.text }]}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <AppIcon name="close" color={theme.secondary} size={18} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            marginTop: 14,
          },
        ]}
      >
        <View style={styles.cardHeaderRow}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Your Tickets
          </Text>
          <TouchableOpacity
            onPress={() => loadTickets({ nextPage: 1, replace: true })}
            disabled={loading}
            style={[
              styles.smallButton,
              {
                borderColor: theme.border,
                backgroundColor: `${theme.primary}10`,
                opacity: loading ? 0.6 : 1,
              },
            ]}
          >
            <AppIcon name="refresh" color={theme.primary} size={18} />
            <Text style={{ color: theme.primary, fontWeight: "800" }}>
              Refresh
            </Text>
          </TouchableOpacity>
        </View>

        {error ? (
          <View
            style={[
              styles.notice,
              {
                borderColor: theme.border,
                backgroundColor: `${theme.danger ?? "#ef4444"}10`,
              },
            ]}
          >
            <Text
              style={{ color: theme.danger ?? "#ef4444", fontWeight: "700" }}
            >
              {error}
            </Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={theme.primary} />
            <Text style={{ color: theme.secondary, marginLeft: 10 }}>
              Loading tickets...
            </Text>
          </View>
        ) : !tickets.length ? (
          <View
            style={[
              styles.emptyBox,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <Text style={{ color: theme.secondary }}>No tickets found.</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {tickets.map((t) => {
              const id = t?.id ?? t?.ticketId;
              return (
                <TicketRow
                  key={String(id)}
                  ticket={t}
                  active={false}
                  onPress={() => onSelectTicket(t)}
                  theme={theme}
                />
              );
            })}
          </View>
        )}

        {!loading && page < totalPages ? (
          <TouchableOpacity
            onPress={() => loadTickets({ nextPage: page + 1, replace: false })}
            style={[
              styles.loadMoreBtn,
              { borderColor: theme.border, backgroundColor: theme.background },
            ]}
          >
            <Text style={{ color: theme.primary, fontWeight: "900" }}>
              Load more
            </Text>
            <AppIcon name="expand-more" color={theme.primary} size={20} />
          </TouchableOpacity>
        ) : null}
      </View>
    </>
  );

  const renderChat = () => {
    const messages = Array.isArray(selectedTicket?.messages)
      ? selectedTicket.messages
      : [];
    const status = String(selectedTicket?.status || "").toLowerCase();
    const canReply = status !== "closed" && status !== "rejected";

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <TouchableOpacity
              onPress={() => setSelectedTicket(null)}
              style={[
                styles.smallButton,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                },
              ]}
            >
              <AppIcon name="arrow-back" color={theme.primary} size={18} />
              <Text style={{ color: theme.primary, fontWeight: "800" }}>
                Back
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onSelectTicket({ id: selectedTicket?.id })}
              disabled={loading}
              style={[
                styles.smallButton,
                {
                  borderColor: theme.border,
                  backgroundColor: `${theme.primary}10`,
                  opacity: loading ? 0.6 : 1,
                },
              ]}
            >
              <AppIcon name="refresh" color={theme.primary} size={18} />
              <Text style={{ color: theme.primary, fontWeight: "800" }}>
                Refresh
              </Text>
            </TouchableOpacity>
          </View>

          <Text
            style={{
              color: theme.text,
              fontSize: 16,
              fontWeight: "900",
              marginTop: 12,
            }}
            numberOfLines={2}
          >
            {selectedTicket?.subject || "Ticket"}
          </Text>
          <Text style={{ color: theme.secondary, marginTop: 6 }}>
            Status: {selectedTicket?.status || "—"}
          </Text>

          {selectedTicket?.description ? (
            <View
              style={[
                styles.notice,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                  marginTop: 12,
                },
              ]}
            >
              <Text
                style={{
                  color: theme.secondary,
                  fontSize: 12,
                  fontWeight: "800",
                }}
              >
                Description
              </Text>
              <Text style={{ color: theme.text, marginTop: 6 }}>
                {selectedTicket.description}
              </Text>
            </View>
          ) : null}
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              marginTop: 14,
              flex: 1,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Messages
          </Text>

          <ScrollView
            ref={scrollRef}
            style={{ marginTop: 10 }}
            contentContainerStyle={{ paddingBottom: 16 }}
            onContentSizeChange={() =>
              scrollRef.current?.scrollToEnd?.({ animated: true })
            }
          >
            {!messages.length ? (
              <View
                style={[
                  styles.emptyBox,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text style={{ color: theme.secondary }}>No messages yet.</Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {messages.map((m, idx) => {
                  const senderType = String(m?.senderType || "");
                  const isMine =
                    senderType.toLowerCase().includes("user") ||
                    senderType.toLowerCase().includes("client") ||
                    senderType.toLowerCase().includes("customer");

                  const createdAt =
                    m?.createdAt || m?.timestamp || m?.createdDate;
                  const text = m?.message || m?.content || "";
                  const attachments = Array.isArray(m?.attachments)
                    ? m.attachments
                    : [];
                  const id = m?.id ?? m?.messageId ?? idx;

                  return (
                    <View
                      key={String(id)}
                      style={{ alignItems: isMine ? "flex-end" : "flex-start" }}
                    >
                      <View
                        style={[
                          styles.bubble,
                          {
                            backgroundColor: isMine
                              ? theme.primary
                              : theme.background,
                            borderColor: theme.border,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: isMine ? "#fff" : theme.text,
                            fontWeight: "800",
                            fontSize: 12,
                            marginBottom: 4,
                          }}
                        >
                          {m?.senderName || (isMine ? "You" : "Support")}
                        </Text>
                        {text ? (
                          <Text
                            style={{
                              color: isMine ? "#fff" : theme.text,
                              lineHeight: 18,
                            }}
                          >
                            {text}
                          </Text>
                        ) : null}
                        <Text
                          style={{
                            color: isMine ? "#ffffffcc" : theme.secondary,
                            fontSize: 11,
                            marginTop: 6,
                          }}
                        >
                          {formatShortTime(createdAt)}
                        </Text>

                        {attachments.length ? (
                          <View style={{ marginTop: 10, gap: 8 }}>
                            {attachments.map((a) => (
                              <TouchableOpacity
                                key={String(
                                  a?.id ?? a?.filePath ?? a?.fileName,
                                )}
                                onPress={() => onPreviewAttachment(a)}
                                style={[
                                  styles.attachmentBtn,
                                  {
                                    borderColor: theme.border,
                                    backgroundColor: isMine
                                      ? "#ffffff20"
                                      : `${theme.primary}10`,
                                  },
                                ]}
                              >
                                <AppIcon
                                  name="attach-file"
                                  color={isMine ? "#fff" : theme.primary}
                                  size={18}
                                />
                                <Text
                                  numberOfLines={1}
                                  style={{
                                    color: isMine ? "#fff" : theme.text,
                                    fontWeight: "800",
                                    flex: 1,
                                  }}
                                >
                                  {a?.fileName || a?.name || "Attachment"}
                                </Text>
                                <AppIcon
                                  name="open-in-new"
                                  color={isMine ? "#fff" : theme.secondary}
                                  size={18}
                                />
                              </TouchableOpacity>
                            ))}
                          </View>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>

          {canReply ? (
            <View
              style={[
                styles.replyBox,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                },
              ]}
            >
              <TouchableOpacity
                onPress={async () => {
                  const files = await pickAttachments();
                  if (!files.length) return;
                  setMessageAttachments((prev) => [...prev, ...files]);
                }}
                style={[
                  styles.attachBtn,
                  {
                    backgroundColor: `${theme.primary}12`,
                    borderColor: theme.border,
                  },
                ]}
              >
                <AppIcon name="attach-file" color={theme.primary} size={20} />
              </TouchableOpacity>

              <View style={{ flex: 1 }}>
                <TextInput
                  value={messageText}
                  onChangeText={setMessageText}
                  placeholder="Type your message..."
                  placeholderTextColor={theme.secondary}
                  style={[styles.messageInput, { color: theme.text }]}
                  multiline
                />
                {messageAttachments.length ? (
                  <View style={{ marginTop: 10, gap: 8 }}>
                    {messageAttachments.map((f, idx) => (
                      <AttachmentChip
                        key={`${f.uri}_${idx}`}
                        label={f.name || `Attachment ${idx + 1}`}
                        theme={theme}
                        onRemove={() =>
                          setMessageAttachments((prev) =>
                            prev.filter((_, i) => i !== idx),
                          )
                        }
                      />
                    ))}
                  </View>
                ) : null}
              </View>

              <TouchableOpacity
                onPress={onSendMessage}
                disabled={
                  sending ||
                  (!messageText.trim() && messageAttachments.length === 0)
                }
                style={[
                  styles.sendBtn,
                  {
                    backgroundColor:
                      sending ||
                      (!messageText.trim() && messageAttachments.length === 0)
                        ? theme.border
                        : theme.primary,
                  },
                ]}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <AppIcon name="send" color="#fff" size={20} />
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View
              style={[
                styles.notice,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                  marginTop: 12,
                },
              ]}
            >
              <Text style={{ color: theme.secondary, fontWeight: "700" }}>
                This ticket is closed/rejected. You can’t reply.
              </Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
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
        <Text style={styles.headerTitle}>Support Tickets</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {selectedTicket ? renderChat() : renderList()}
      </ScrollView>

      {/* Create Ticket Modal */}
      <Modal
        visible={createOpen}
        transparent
        animationType="fade"
        onRequestClose={closeCreate}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Create Ticket
              </Text>
              <TouchableOpacity onPress={closeCreate}>
                <AppIcon name="close" color={theme.secondary} size={22} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ maxHeight: 520 }}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={[styles.inputLabel, { color: theme.secondary }]}>
                Subject *
              </Text>
              <TextInput
                value={newTicket.subject}
                onChangeText={(v) =>
                  setNewTicket((p) => ({ ...p, subject: v }))
                }
                placeholder="Brief summary"
                placeholderTextColor={theme.secondary}
                style={[
                  styles.input,
                  {
                    borderColor: formErrors.subject
                      ? (theme.danger ?? "#ef4444")
                      : theme.border,
                    color: theme.text,
                    backgroundColor: theme.background,
                  },
                ]}
              />
              {formErrors.subject ? (
                <Text
                  style={{
                    color: theme.danger ?? "#ef4444",
                    marginTop: 6,
                    fontWeight: "700",
                  }}
                >
                  {formErrors.subject}
                </Text>
              ) : null}

              <Text
                style={[
                  styles.inputLabel,
                  { color: theme.secondary, marginTop: 14 },
                ]}
              >
                Category *
              </Text>
              <TextInput
                value={newTicket.category}
                onChangeText={(v) =>
                  setNewTicket((p) => ({ ...p, category: v }))
                }
                placeholder="e.g. Billing / Technical"
                placeholderTextColor={theme.secondary}
                style={[
                  styles.input,
                  {
                    borderColor: formErrors.category
                      ? (theme.danger ?? "#ef4444")
                      : theme.border,
                    color: theme.text,
                    backgroundColor: theme.background,
                  },
                ]}
              />
              {formErrors.category ? (
                <Text
                  style={{
                    color: theme.danger ?? "#ef4444",
                    marginTop: 6,
                    fontWeight: "700",
                  }}
                >
                  {formErrors.category}
                </Text>
              ) : null}

              <Text
                style={[
                  styles.inputLabel,
                  { color: theme.secondary, marginTop: 14 },
                ]}
              >
                Priority
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {PRIORITIES.map((p) => (
                  <StatusChip
                    key={p}
                    label={p}
                    active={
                      String(newTicket.priority).toLowerCase() ===
                      p.toLowerCase()
                    }
                    onPress={() =>
                      setNewTicket((prev) => ({ ...prev, priority: p }))
                    }
                    theme={theme}
                  />
                ))}
              </ScrollView>

              <Text
                style={[
                  styles.inputLabel,
                  { color: theme.secondary, marginTop: 14 },
                ]}
              >
                Description *
              </Text>
              <TextInput
                value={newTicket.description}
                onChangeText={(v) =>
                  setNewTicket((p) => ({ ...p, description: v }))
                }
                placeholder="Describe the issue"
                placeholderTextColor={theme.secondary}
                multiline
                style={[
                  styles.input,
                  {
                    borderColor: formErrors.description
                      ? (theme.danger ?? "#ef4444")
                      : theme.border,
                    color: theme.text,
                    backgroundColor: theme.background,
                    height: 110,
                    textAlignVertical: "top",
                  },
                ]}
              />
              {formErrors.description ? (
                <Text
                  style={{
                    color: theme.danger ?? "#ef4444",
                    marginTop: 6,
                    fontWeight: "700",
                  }}
                >
                  {formErrors.description}
                </Text>
              ) : null}

              <Text
                style={[
                  styles.inputLabel,
                  { color: theme.secondary, marginTop: 14 },
                ]}
              >
                Attachments
              </Text>
              <TouchableOpacity
                onPress={async () => {
                  const files = await pickAttachments();
                  if (!files.length) return;
                  setNewTicket((prev) => ({
                    ...prev,
                    attachments: [...(prev.attachments || []), ...files],
                  }));
                }}
                style={[
                  styles.attachPickRow,
                  {
                    borderColor: theme.border,
                    backgroundColor: theme.background,
                  },
                ]}
              >
                <AppIcon name="upload" color={theme.primary} size={20} />
                <Text style={{ color: theme.text, fontWeight: "800" }}>
                  Add files
                </Text>
                <Text style={{ color: theme.secondary, marginLeft: "auto" }}>
                  {(newTicket.attachments || []).length} selected
                </Text>
              </TouchableOpacity>

              {(newTicket.attachments || []).length ? (
                <View style={{ marginTop: 10, gap: 8 }}>
                  {newTicket.attachments.map((f, idx) => (
                    <AttachmentChip
                      key={`${f.uri}_${idx}`}
                      label={f.name || `Attachment ${idx + 1}`}
                      theme={theme}
                      onRemove={() =>
                        setNewTicket((prev) => ({
                          ...prev,
                          attachments: (prev.attachments || []).filter(
                            (_, i) => i !== idx,
                          ),
                        }))
                      }
                    />
                  ))}
                </View>
              ) : null}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={closeCreate}
                style={[
                  styles.secondaryButton,
                  {
                    borderColor: theme.border,
                    backgroundColor: theme.background,
                  },
                ]}
              >
                <Text style={{ color: theme.text, fontWeight: "800" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onCreate}
                disabled={loading}
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: loading ? theme.border : theme.primary,
                    flex: 1,
                  },
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <AppIcon name="check" color="#fff" size={18} />
                )}
                <Text style={styles.primaryButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ImagePreviewModal
        open={previewOpen}
        title={previewTitle}
        localUri={previewLocalUri}
        onClose={() => {
          setPreviewOpen(false);
          setPreviewTitle("");
          setPreviewLocalUri(null);
        }}
        theme={theme}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: { marginRight: 16 },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "700" },
  scrollContent: { padding: 16, paddingBottom: 28 },

  card: { borderWidth: 1, borderRadius: 16, padding: 14 },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "900" },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 },
  statBox: {
    flex: 1,
    minWidth: 120,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },

  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchRow: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },
  searchInput: { flex: 1, fontWeight: "700" },

  smallButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  primaryButton: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryButtonText: { color: "#fff", fontWeight: "900" },
  secondaryButton: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  notice: { borderWidth: 1, borderRadius: 12, padding: 10, marginTop: 12 },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    marginTop: 10,
  },
  emptyBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    marginTop: 12,
  },

  ticketRow: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  loadMoreBtn: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  bubble: { maxWidth: "92%", borderWidth: 1, borderRadius: 16, padding: 12 },
  attachmentBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  replyBox: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 10,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-end",
  },
  attachBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  messageInput: {
    minHeight: 40,
    maxHeight: 140,
    fontWeight: "700",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 18,
  },
  modalCard: { borderRadius: 18, borderWidth: 1, padding: 14 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  modalTitle: { fontSize: 16, fontWeight: "900" },
  modalFooter: { marginTop: 12, flexDirection: "row", gap: 10 },
  inputLabel: { fontSize: 12, fontWeight: "900" },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontWeight: "700",
    marginTop: 8,
  },
  attachPickRow: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  attachmentChip: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 18,
  },
  previewCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    overflow: "hidden",
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },
  previewImage: {
    width: "100%",
    height: 420,
    borderRadius: 14,
    backgroundColor: "#000",
  },
  previewLoading: {
    height: 320,
    alignItems: "center",
    justifyContent: "center",
  },
});
