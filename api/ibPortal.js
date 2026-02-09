import api from "./client";

const unwrap = (res) => {
  if (!res) return null;
  const root = res?.data;
  if (root && typeof root === "object" && "data" in root) return root.data;
  return root ?? res;
};

const safeGet = async (path, config) => {
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

const safePost = async (path, payload, config) => {
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

export const getIbOverviewDetails = async (userIdOrAccountId) => {
  const response = await safeGet(
    `ibaccounts/overview/details/${encodeURIComponent(String(userIdOrAccountId))}`,
  );
  return unwrap(response);
};

export const getIbOverviewFinance = async (userIdOrAccountId) => {
  const response = await safeGet(
    `ibaccounts/overview/finance/${encodeURIComponent(String(userIdOrAccountId))}`,
  );
  return unwrap(response);
};

export const getIbOverviewActivity = async (userIdOrAccountId) => {
  const response = await safeGet(
    `ibaccounts/overview/activity/${encodeURIComponent(String(userIdOrAccountId))}`,
  );
  return unwrap(response);
};

export const getIbOverviewActivityByDays = async (
  ibAccountId,
  daysCount = 30,
) => {
  const response = await safeGet(
    `ibaccounts/overview/activity/${encodeURIComponent(
      String(ibAccountId),
    )}/${encodeURIComponent(String(daysCount))}`,
  );
  return unwrap(response);
};

export const getIbCommissionHistory = async ({
  ibAccountId,
  startDate,
  endDate,
  page,
  pageSize,
} = {}) => {
  const params = {
    ...(ibAccountId != null ? { ibAccountId } : {}),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
    ...(page != null ? { page } : {}),
    ...(pageSize != null ? { pageSize } : {}),
  };
  const response = await safeGet(`ibaccounts/commissionhistory`, { params });
  return unwrap(response);
};

export const getIbReferredClients = async ({
  ibAccountId,
  page,
  pageSize,
} = {}) => {
  const params = {
    ...(ibAccountId != null ? { ibAccountId } : {}),
    ...(page != null ? { page } : {}),
    ...(pageSize != null ? { pageSize } : {}),
  };
  const response = await safeGet(`ibaccounts/referred-clients`, { params });
  return unwrap(response);
};

// Optional endpoints from the web portal; keep here for “full portal” parity.
export const getIbCommissionGraph = async ({
  ibAccountId,
  startDate,
  endDate,
} = {}) => {
  const params = {
    ...(ibAccountId != null ? { ibAccountId } : {}),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
  };
  const response = await safeGet(`ibaccounts/commissiongraph`, { params });
  return unwrap(response);
};

export const requestIbWithdrawal = async (payload) => {
  const response = await safePost(`ibaccounts/withdrawal`, payload);
  return unwrap(response);
};
