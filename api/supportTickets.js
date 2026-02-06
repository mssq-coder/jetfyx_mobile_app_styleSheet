import * as SecureStore from "expo-secure-store";
import api from "./client";

const joinUrl = (baseUrl, path) => {
  const base = String(baseUrl || "").replace(/\/+$/, "");
  const p = String(path || "").replace(/^\/+/, "");
  return `${base}/${p}`;
};

const parseFetchBody = async (res) => {
  const contentType = res?.headers?.get?.("content-type") || "";
  if (contentType.includes("application/json")) return await res.json();
  return await res.text();
};

const fetchPostFormData = async (relativePath, formData) => {
  const baseUrl = api?.defaults?.baseURL;
  const url = joinUrl(baseUrl, relativePath);

  let origin = "react-native";
  try {
    const u = new URL(String(baseUrl || url));
    if (u?.origin) origin = u.origin;
  } catch (_e) {
    // ignore
  }

  const token = await SecureStore.getItemAsync("accessToken");

  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    "X-Client-App": "JetFyXMobile",
    "X-Client-Origin": "react-native",
    Origin: origin,
    Referer: origin === "react-native" ? "react-native" : `${origin}/`,
    "User-Agent": "JetFyXMobile",
  };

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: formData,
  });

  const body = await parseFetchBody(res);
  if (!res.ok) {
    const message =
      (body && typeof body === "object" && (body.message || body.title)) ||
      (typeof body === "string" && body) ||
      `Request failed with status ${res.status}`;
    const err = new Error(message);
    err.response = { status: res.status, data: body };
    throw err;
  }

  return body;
};

const BASE = "/support-tickets";

export async function getSupportTicketStatistics() {
  const response = await api.get(`${BASE}/statistics`);
  return response.data;
}

export async function getUserTickets(params = {}) {
  const response = await api.get(`${BASE}`, { params });
  return response.data;
}

export async function getTicketById(ticketId) {
  if (ticketId == null) throw new Error("ticketId is required");
  const response = await api.get(`${BASE}/${ticketId}`);
  return response.data;
}

export async function createTicket(ticketData, attachments = []) {
  const subject = String(ticketData?.subject || "").trim();
  const category = String(ticketData?.category || "").trim();
  const description = String(ticketData?.description || "").trim();
  const priority = String(ticketData?.priority || "Medium");

  if (!subject) throw new Error("subject is required");
  if (!category) throw new Error("category is required");
  if (!description) throw new Error("description is required");

  const fd = new FormData();
  fd.append("subject", subject);
  fd.append("category", category);
  fd.append("description", description);
  fd.append("priority", priority);

  (attachments || []).forEach((file) => {
    if (!file?.uri) return;
    fd.append("attachments", {
      uri: file.uri,
      name: file.name || `upload_${Date.now()}`,
      type: file.mimeType || file.type || "application/octet-stream",
    });
  });

  return await fetchPostFormData(`${BASE}`, fd);
}

export async function addTicketMessage(
  ticketId,
  message,
  attachments = [],
  { isInternal = false } = {},
) {
  if (ticketId == null) throw new Error("ticketId is required");

  const msg = String(message || "");
  if (!msg.trim() && !(attachments || []).length) {
    throw new Error("message or attachment is required");
  }

  const fd = new FormData();
  fd.append("message", msg);
  fd.append("isInternal", String(Boolean(isInternal)));

  (attachments || []).forEach((file) => {
    if (!file?.uri) return;
    fd.append("attachments", {
      uri: file.uri,
      name: file.name || `upload_${Date.now()}`,
      type: file.mimeType || file.type || "application/octet-stream",
    });
  });

  return await fetchPostFormData(`${BASE}/${ticketId}/messages`, fd);
}

export async function markTicketMessageAsRead(messageId) {
  if (messageId == null) throw new Error("messageId is required");
  const response = await api.put(`${BASE}/messages/${messageId}/mark-read`);
  return response.data;
}
