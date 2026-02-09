import api from "./client";
import { previewFile as previewImageFile } from "./getServices";

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

// For mailbox attachments we preview images inline and open other files via download URL.
export const previewFile = async (filePath) => {
  if (!filePath) throw new Error("filePath is required");

  const raw = normalizeInboxAttachmentPath(filePath);
  const ext = raw.split("?")[0].split("#")[0].split(".").pop()?.toLowerCase();
  const isImage = ["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(ext);

  if (!isImage) {
    return getFileDownloadUrl(raw);
  }

  // Uses the app's existing protected image preview download helper.
  return await previewImageFile(raw);
};
