import * as FileSystem from "expo-file-system";
import * as SecureStore from "expo-secure-store";
import api from "./client";
import { previewFile as previewImageFile } from "./allServices";

const isAbsoluteUrl = (value) => /^https?:\/\//i.test(String(value || ""));

const encodePathPreservingSlashes = (p) =>
  String(p)
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");

const stripLeadingSlash = (p) => String(p || "").replace(/^\/+/, "");

const normalizeInboxAttachmentPath = (value) => {
  if (!value) return "";
  let raw = String(value);

  // Web portal sometimes returns absolute URLs that contain a virtual folder.
  // Convert those into the relative storage path the preview/download endpoints expect.
  if (isAbsoluteUrl(raw)) {
    try {
      const match = raw.match(/\/userinboxattachment\/.*$/i);
      if (match?.[0]) {
        raw = match[0].replace(/^\//, "");
      }
    } catch (_e) {}
  }

  return raw;
};

export const getMessages = async (
  accountId,
  { pageNumber = 1, pageSize = 25 } = {},
) => {
  if (accountId == null) {
    throw new Error("accountId is required");
  }

  const response = await api.get(`/client/Messages/account/${accountId}`, {
    params: {
      pageNumber,
      pageSize,
    },
  });

  return response.data;
};

export const markMessageAsRead = async (accountId, messageId) => {
  if (accountId == null) throw new Error("accountId is required");
  if (messageId == null) throw new Error("messageId is required");

  const response = await api.put(
    `/client/Messages/${messageId}/account/${accountId}/mark-read`,
  );

  return response.data;
};

export const getFileDownloadUrl = (filePath) => {
  if (!filePath) return "";

  const raw = normalizeInboxAttachmentPath(filePath);
  if (isAbsoluteUrl(raw)) return raw;

  const baseURL = String(api?.defaults?.baseURL || "").replace(/\/+$/, "");
  const rel = stripLeadingSlash(raw);

  // Mirrors the existing preview endpoint shape used in `api/getServices.js`
  return `${baseURL}/shared/file-preview/download/${encodePathPreservingSlashes(rel)}`;
};

const hashString = (input) => {
  // djb2 (stable, small, no deps)
  let hash = 5381;
  const text = String(input || "");
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 33) ^ text.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
};

const getExtFromPath = (p) => {
  const raw = String(p || "")
    .split("?")[0]
    .split("#")[0];
  const dot = raw.lastIndexOf(".");
  if (dot === -1) return "";
  const ext = raw.slice(dot).toLowerCase();
  if (!/^\.[a-z0-9]{2,6}$/.test(ext)) return "";
  return ext;
};

const getExtFromContentType = (contentType) => {
  const ct = String(contentType || "")
    .toLowerCase()
    .split(";")[0]
    .trim();
  if (ct === "image/jpeg") return ".jpg";
  if (ct === "image/png") return ".png";
  if (ct === "image/webp") return ".webp";
  if (ct === "image/gif") return ".gif";
  if (ct === "application/pdf") return ".pdf";
  if (ct === "video/mp4") return ".mp4";
  if (ct === "video/quicktime") return ".mov";
  if (ct === "video/webm") return ".webm";
  return "";
};

const downloadProtectedToCache = async ({
  url,
  cacheKeyBase,
  preferredExt,
}) => {
  const token = await SecureStore.getItemAsync("accessToken");
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    Accept: "*/*",
  };

  const fileUriBase = `${FileSystem.cacheDirectory}mailbox_${cacheKeyBase}`;
  const tmpUri = `${fileUriBase}.tmp`;

  try {
    await FileSystem.deleteAsync(tmpUri, { idempotent: true });
  } catch (_e) {}

  const result = await FileSystem.downloadAsync(url, tmpUri, { headers });
  const status = result?.status;
  const contentType =
    result?.headers?.["content-type"] || result?.headers?.["Content-Type"];

  if (status && status !== 200) {
    await FileSystem.deleteAsync(tmpUri, { idempotent: true });
    throw new Error(`Download failed (HTTP ${status})`);
  }

  const ext = preferredExt || getExtFromContentType(contentType) || ".bin";
  const finalUri = `${fileUriBase}${ext}`;

  try {
    await FileSystem.deleteAsync(finalUri, { idempotent: true });
  } catch (_e) {}

  await FileSystem.moveAsync({ from: tmpUri, to: finalUri });
  return finalUri;
};

// For mailbox attachments we preview images inline, and download other files (PDF, etc.)
// with auth to a local URI before opening.
export const previewFile = async (filePath) => {
  if (!filePath) throw new Error("filePath is required");

  const raw = normalizeInboxAttachmentPath(filePath);
  const ext = raw.split("?")[0].split("#")[0].split(".").pop()?.toLowerCase();
  const isImage = ["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(ext);

  if (!isImage) {
    const normalized = raw;
    const rel = stripLeadingSlash(normalized);
    const baseURL = String(api?.defaults?.baseURL || "").replace(/\/+$/, "");
    const encodedRelPreserveSlashes = encodePathPreservingSlashes(rel);
    const encodedRelAll = encodeURIComponent(rel);
    const cacheKey = hashString(normalized);
    const extFromPath = getExtFromPath(normalized);

    // Reuse cached version if present.
    const candidates = [
      `${FileSystem.cacheDirectory}mailbox_${cacheKey}${extFromPath || ""}`,
      `${FileSystem.cacheDirectory}mailbox_${cacheKey}.pdf`,
      `${FileSystem.cacheDirectory}mailbox_${cacheKey}.jpg`,
      `${FileSystem.cacheDirectory}mailbox_${cacheKey}.png`,
      `${FileSystem.cacheDirectory}mailbox_${cacheKey}.webp`,
      `${FileSystem.cacheDirectory}mailbox_${cacheKey}.bin`,
    ].filter(Boolean);

    for (const candidate of candidates) {
      try {
        const info = await FileSystem.getInfoAsync(candidate);
        if (info?.exists) return candidate;
      } catch (_e) {}
    }

    // Try both endpoints (some environments only support one).
    const urlCandidates = [
      // Variant A: keep slashes (most common)
      `${baseURL}/shared/file-preview/download/${encodedRelPreserveSlashes}`,
      `${baseURL}/shared/file-preview/preview/${encodedRelPreserveSlashes}`,
      // Variant B: encode entire path (matches URLs like .../preview/userinboxattachment%2F...)
      `${baseURL}/shared/file-preview/download/${encodedRelAll}`,
      `${baseURL}/shared/file-preview/preview/${encodedRelAll}`,
    ];

    let lastErr = null;
    for (const url of urlCandidates) {
      try {
        return await downloadProtectedToCache({
          url,
          cacheKeyBase: cacheKey,
          preferredExt: extFromPath || "",
        });
      } catch (e) {
        lastErr = e;
      }
    }

    // Final fallback: return URL (may still fail if auth is required).
    if (lastErr) {
      return getFileDownloadUrl(normalized);
    }
    return getFileDownloadUrl(normalized);
  }

  // Uses the app's existing protected image preview download helper.
  return await previewImageFile(raw);
};
