import * as SecureStore from "expo-secure-store";
import api from "./client";

const joinUrl = (baseUrl, path) => {
  const base = String(baseUrl || "").replace(/\/+$/, "");
  const p = String(path || "").replace(/^\/+/, "");
  return `${base}/${p}`;
};

const parseFetchBody = async (res) => {
  const contentType = res?.headers?.get?.("content-type") || "";
  if (contentType.includes("application/json")) {
    return await res.json();
  }
  const text = await res.text();
  return text;
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
    // Do NOT set Content-Type here; fetch will set boundary automatically.
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    "X-Client-App": "JetFyXMobile",
    "X-Client-Origin": "react-native",
    // Backend checks Origin/Referer; mimic axios client defaults
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

export const confirmDeposit = async (payload) => {
  const isFileLike = (v) =>
    v && typeof v === "object" && typeof v.uri === "string";

  const shouldSendMultipart =
    payload &&
    typeof payload === "object" &&
    Object.values(payload).some(isFileLike);

  if (!shouldSendMultipart) {
    const response = await api.post(
      `account/ClientAccountTransactions/deposit`,
      payload,
    );
    return response.data;
  }

  const fd = new FormData();
  Object.entries(payload || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    if (key === "DetailsJson") {
      if (typeof value === "object") fd.append(key, JSON.stringify(value));
      else fd.append(key, String(value));
      return;
    }

    if (isFileLike(value)) {
      fd.append(key, {
        uri: value.uri,
        name: value.name || `upload_${Date.now()}`,
        type: value.mimeType || value.type || "application/octet-stream",
      });
      return;
    }

    fd.append(key, String(value));
  });

  // Use fetch for multipart uploads (more reliable than axios on RN)
  return await fetchPostFormData(
    `account/ClientAccountTransactions/deposit`,
    fd,
  );
};

export const confirmWithdrawal = async (payload) => {
  // Backend commonly expects multipart/form-data for this route (similar to deposit).
  // Use fetch so RN sets the boundary correctly.
  const fd = new FormData();
  Object.entries(payload || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    if (key === "DetailsJson") {
      if (typeof value === "object") fd.append(key, JSON.stringify(value));
      else fd.append(key, String(value));
      return;
    }

    fd.append(key, String(value));
  });

  return await fetchPostFormData(
    `account/ClientAccountTransactions/withdrawal`,
    fd,
  );
};

export const createInternalTransfer = async (payload) => {
  // Web portal uses JSON body for this route.
  // Keep JSON by default; if the backend changes to multipart later we can align.
  const response = await api.post(
    `account/ClientAccountTransactions/internal-transfer`,
    payload,
  );
  return response.data;
};

// =============================
// Stripe (Card) Payments
// =============================

const stripeGet = async (path, config) => {
  try {
    return await api.get(path, config);
  } catch (e) {
    if (e?.response?.status !== 404) throw e;

    // Fallback: toggle leading slash to avoid baseURL path override issues
    const fallbackPath = String(path || "").startsWith("/")
      ? String(path || "").slice(1)
      : `/${path}`;
    return await api.get(fallbackPath, config);
  }
};

const stripePost = async (path, payload, config) => {
  try {
    return await api.post(path, payload, config);
  } catch (e) {
    if (e?.response?.status !== 404) throw e;

    const fallbackPath = String(path || "").startsWith("/")
      ? String(path || "").slice(1)
      : `/${path}`;
    return await api.post(fallbackPath, payload, config);
  }
};

export const getStripeConfig = async () => {
  const response = await stripeGet(`/payment/stripe/config`);
  return response.data;
};

export const createStripePaymentIntent = async (payload) => {
  const response = await stripePost(
    `/payment/stripe/create-payment-intent`,
    payload,
  );
  return response.data;
};

export const processStripeDeposit = async (payload) => {
  const isFileLike = (v) =>
    v && typeof v === "object" && typeof v.uri === "string";

  const shouldSendMultipart =
    payload &&
    typeof payload === "object" &&
    Object.values(payload).some(isFileLike);

  if (!shouldSendMultipart) {
    const response = await stripePost(
      `/payment/stripe/process-deposit`,
      payload,
    );
    return response.data;
  }

  const fd = new FormData();
  Object.entries(payload || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    if (isFileLike(value)) {
      fd.append(key, {
        uri: value.uri,
        name: value.name || `upload_${Date.now()}`,
        type: value.mimeType || value.type || "application/octet-stream",
      });
      return;
    }

    if (typeof value === "object") {
      fd.append(key, JSON.stringify(value));
      return;
    }

    fd.append(key, String(value));
  });

  // Use fetch for multipart uploads (more reliable than axios on RN)
  return await fetchPostFormData(`payment/stripe/process-deposit`, fd);
};

export const getStripeTransactions = async () => {
  const response = await stripeGet(`/payment/stripe/transactions`);
  return response.data;
};

export const getStripeSessionDetails = async (sessionId) => {
  const sid = String(sessionId || "").trim();
  if (!sid) throw new Error("sessionId is required");

  // Try common patterns:
  // 1) GET /payment/stripe/session?sessionId=...
  // 2) GET /payment/stripe/session/{sessionId}
  // Also send alternate query keys some backends use.
  try {
    const response = await stripeGet(`/payment/stripe/session`, {
      params: {
        sessionId: sid,
        session_id: sid,
        id: sid,
      },
    });
    return response.data;
  } catch (e) {
    if (e?.response?.status !== 404) throw e;
    const response2 = await stripeGet(
      `/payment/stripe/session/${encodeURIComponent(sid)}`,
    );
    return response2.data;
  }
};

// =============================
// Coins (Crypto Gateway) Payments
// =============================

const coinsGet = async (path, config) => {
  try {
    return await api.get(path, config);
  } catch (e) {
    if (e?.response?.status !== 404) throw e;

    const fallbackPath = String(path || "").startsWith("/")
      ? String(path || "").slice(1)
      : `/${path}`;
    return await api.get(fallbackPath, config);
  }
};

const coinsPost = async (path, payload, config) => {
  try {
    return await api.post(path, payload, config);
  } catch (e) {
    if (e?.response?.status !== 404) throw e;

    const fallbackPath = String(path || "").startsWith("/")
      ? String(path || "").slice(1)
      : `/${path}`;
    return await api.post(fallbackPath, payload, config);
  }
};

export const getCoinsConfig = async () => {
  const response = await coinsGet(`/payment/coins/config`);
  return response.data;
};

export const getSupportedCoins = async () => {
  const response = await coinsGet(`/payment/coins/supported-coins`);
  return response.data;
};

export const getCoinsExchangeRates = async (coinType) => {
  const ct = String(coinType || "").trim();
  if (!ct) throw new Error("coinType is required");

  // Common patterns:
  // 1) GET /payment/coins/exchange-rates/{coinType}
  // 2) GET /payment/coins/exchange-rates?coinType=...
  try {
    const response = await coinsGet(
      `/payment/coins/exchange-rates/${encodeURIComponent(ct)}`,
    );
    return response.data;
  } catch (e) {
    if (e?.response?.status !== 404) throw e;
    const response2 = await coinsGet(`/payment/coins/exchange-rates`, {
      params: { coinType: ct, currency: ct, code: ct },
    });
    return response2.data;
  }
};

export const createCoinsPayment = async (payload) => {
  const response = await coinsPost(`/payment/coins/create-payment`, payload);
  return response.data;
};

export const verifyCoinsPayment = async (payload) => {
  const response = await coinsPost(`/payment/coins/verify-payment`, payload);
  return response.data;
};

export const processCoinsDeposit = async (payload) => {
  const response = await coinsPost(`/payment/coins/process-deposit`, payload);
  return response.data;
};
