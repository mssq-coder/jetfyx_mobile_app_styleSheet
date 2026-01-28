import * as FileSystem from "expo-file-system/legacy";
import * as SecureStore from "expo-secure-store";
import api from "./client";

export async function getAccountType() {
  const response = await api.get("/Accounts/AccountTypes");
  return response.data;
}

export async function getAllCurrencyListFromDB(accountId) {
  if (accountId == null) {
    throw new Error("accountId is required");
  }

  const response = await api.get(
    `/CurrencyPair/GetAllCurrencyListFromDB/${accountId}`,
  );
  return response.data;
}

export async function getOrderHistory(accountId) {
  if (accountId == null) {
    throw new Error("accountId is required");
  }

  const response = await api.get(`/Orders/history/${accountId}`);
  // API returns: { message, statusCode, data: [...] }
  return response.data;
}

export async function getClientAccountTransactions({
  accountId,
  transactionType,
  includePending = false,
} = {}) {
  if (accountId == null) {
    throw new Error("accountId is required");
  }

  const response = await api.get("/account/ClientAccountTransactions/all", {
    params: {
      accountId,
      ...(transactionType ? { transactionType } : {}),
      includePending,
    },
  });
  return response.data;
}

export async function getCountries() {
  const response = await api.get("/countries");
  return response.data;
}

export async function getFinanceOptions(mode) {
  if (!mode) {
    throw new Error("mode is required");
  }

  const response = await api.get("/FinanceOptions", {
    params: { mode },
  });
  return response.data;
}

export async function getUserDetails(userId) {
  const response = await api.get(`/Users/${userId}`);
  return response.data;
}

export async function updateUser(userId, payload) {
  if (userId == null) {
    throw new Error("userId is required");
  }

  const isFileLike = (v) =>
    v && typeof v === "object" && typeof v.uri === "string";

  const toFormData = (obj) => {
    const fd = new FormData();
    Object.entries(obj || {}).forEach(([key, value]) => {
      if (value === undefined || value === null) return;

      // Intrest: backend expects repeated key entries (like form-data multi)
      if (key === "Intrest" && Array.isArray(value)) {
        value.filter(Boolean).forEach((v) => fd.append(key, String(v)));
        return;
      }

      // Files: allow single file or array of files
      if (Array.isArray(value) && value.length > 0 && value.every(isFileLike)) {
        value.forEach((file) => {
          fd.append(key, {
            uri: file.uri,
            name: file.name || `upload_${Date.now()}`,
            type: file.mimeType || file.type || "application/octet-stream",
          });
        });
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

      // Arrays (non-file): append as repeated entries
      if (Array.isArray(value)) {
        value.filter(Boolean).forEach((v) => fd.append(key, String(v)));
        return;
      }

      fd.append(key, String(value));
    });
    return fd;
  };

  const shouldSendMultipart =
    payload &&
    Object.values(payload).some(
      (v) =>
        isFileLike(v) ||
        (Array.isArray(v) && v.length > 0 && v.some(isFileLike)),
    );

  const body = shouldSendMultipart ? toFormData(payload) : payload;
  const config = shouldSendMultipart
    ? {
        headers: {
          // Let axios set boundary; just override JSON default.
          "Content-Type": "multipart/form-data",
        },
      }
    : undefined;

  // Backend routes in this project are mostly under `/Users/...`.
  // Some environments/docs mention `/User/...` (singular). Try plural first,
  // then fall back to singular on 404.
  try {
    const response = await api.put(`/Users/${userId}`, body, config);
    return response.data;
  } catch (err) {
    const status = err?.response?.status;
    if (status === 404) {
      const response = await api.put(`/User/${userId}`, body, config);
      return response.data;
    }
    throw err;
  }
}

export async function getDetailsByAmountAndCategory(
  category,
  amount,
  mode,
  currencyCode,
) {
  if (!category) {
    throw new Error("category is required");
  }
  if (amount == null) {
    throw new Error("amount is required");
  }
  if (!mode) {
    throw new Error("mode is required");
  }
  if (!currencyCode) {
    throw new Error("currencyCode is required");
  }
  const response = await api.get(
    `/FinanceOptions/GetDetailsByAmountAndCategory`,
    {
      params: { category, amount, mode, currencyCode },
    },
  );
  return response.data;
}

// React Native: download protected files and return a local URI for preview
export async function previewFile(imagePath) {
  if (!imagePath) {
    throw new Error("imagePath is required");
  }

  let raw = String(imagePath);
  const isAbsoluteUrl = /^https?:\/\//i.test(raw);

  // If the server gives us an absolute URL (e.g., Azure Blob), download it directly.
  // If it gives us a relative storage path, use the protected preview endpoint.
  const baseURL = (api?.defaults?.baseURL || "").replace(/\/+$/, "");
  let useProtectedPreview = !isAbsoluteUrl;

  // Azure Blob storage is often private (409 PublicAccessNotPermitted) for direct access.
  // In that case we must call our backend preview endpoint so the server can fetch it.
  if (isAbsoluteUrl) {
    try {
      const u = new URL(raw);
      if (u.hostname.toLowerCase().endsWith(".blob.core.windows.net")) {
        // Blob path looks like: /<container>/<folder>/<file>
        // Backend preview expects: <folder>/<file> (WITHOUT container)
        const withoutLeadingSlash = decodeURIComponent(
          u.pathname.replace(/^\//, ""),
        );
        const parts = withoutLeadingSlash.split("/").filter(Boolean);
        raw =
          parts.length >= 2 ? parts.slice(1).join("/") : withoutLeadingSlash;
        useProtectedPreview = true;
      }
    } catch (_e) {
      // ignore; keep raw as-is
    }
  }

  // Also normalize direct paths that accidentally include the container.
  // Example: kycupdate/payment-categories/abc.png -> payment-categories/abc.png
  if (!/^https?:\/\//i.test(raw)) {
    const parts = raw.split("/").filter(Boolean);
    if (parts.length >= 2 && parts[0].toLowerCase() === "kycupdate") {
      raw = parts.slice(1).join("/");
    }
  }

  const url = useProtectedPreview
    ? `${baseURL}/shared/file-preview/preview/${encodeURIComponent(raw)}`
    : raw;

  const token = await SecureStore.getItemAsync("accessToken");
  const headers = {
    ...(useProtectedPreview
      ? token
        ? { Authorization: `Bearer ${token}` }
        : {}
      : {}),
    Accept: "*/*",
  };

  const hashString = (input) => {
    // djb2 (stable, small, no deps)
    let hash = 5381;
    for (let i = 0; i < input.length; i += 1) {
      hash = (hash * 33) ^ input.charCodeAt(i);
    }
    return (hash >>> 0).toString(36);
  };

  const getExtFromPath = (p) => {
    const raw = String(p).split("?")[0].split("#")[0];
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
    return "";
  };

  const extFromPath = getExtFromPath(raw);
  const key = hashString(raw);
  const fileUriBase = `${FileSystem.cacheDirectory}preview_${key}`;

  // If we already have a cached version (any extension), reuse it.
  const existingCandidates = [
    `${fileUriBase}${extFromPath || ""}`,
    `${fileUriBase}.jpg`,
    `${fileUriBase}.png`,
    `${fileUriBase}.webp`,
    `${fileUriBase}.pdf`,
  ].filter(Boolean);

  for (const candidate of existingCandidates) {
    const info = await FileSystem.getInfoAsync(candidate);
    if (info?.exists) {
      return candidate;
    }
  }

  // Download once (to a temp path) so we can inspect headers/status.
  const tmpUri = `${fileUriBase}.tmp`;
  try {
    // Ensure no stale temp file exists
    await FileSystem.deleteAsync(tmpUri, { idempotent: true });
  } catch (_e) {}

  const result = await FileSystem.downloadAsync(url, tmpUri, { headers });
  const status = result?.status;
  const contentType =
    result?.headers?.["content-type"] || result?.headers?.["Content-Type"];

  if (status && status !== 200) {
    await FileSystem.deleteAsync(tmpUri, { idempotent: true });
    throw new Error(`Preview download failed (HTTP ${status}).`);
  }

  const ext = extFromPath || getExtFromContentType(contentType) || ".bin";
  if (contentType && !String(contentType).toLowerCase().startsWith("image/")) {
    // If backend sometimes returns PDFs for proofs, you can handle it separately.
    await FileSystem.deleteAsync(tmpUri, { idempotent: true });
    throw new Error(
      `Preview is not an image (content-type: ${String(contentType)}).`,
    );
  }

  const finalUri = `${fileUriBase}${ext}`;
  // Move temp -> final
  try {
    await FileSystem.deleteAsync(finalUri, { idempotent: true });
  } catch (_e) {}

  await FileSystem.moveAsync({ from: tmpUri, to: finalUri });
  return finalUri;
}

export default {
  getAccountType,
  getCountries,
  getFinanceOptions,
  getAllCurrencyListFromDB,
  getOrderHistory,
  getClientAccountTransactions,
  getUserDetails,
  updateUser,
  previewFile,
};
