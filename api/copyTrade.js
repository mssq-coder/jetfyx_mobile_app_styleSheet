import api from "./client";

const normalizePaged = (resp) => {
  // Support shapes:
  // 1) axios: { data: { message, statusCode, data: { items, ... } } }
  // 2) direct: { message, statusCode, data: { items, ... } }
  // 3) direct array: { data: [...] }
  const root = resp?.data ?? resp ?? {};
  const payload = root?.data ?? root;

  if (Array.isArray(payload)) {
    return {
      items: payload,
      pageNumber: 1,
      pageSize: payload.length,
      totalCount: payload.length,
      totalPages: 1,
    };
  }

  const data = payload?.data ?? payload;
  const items =
    data?.items ??
    data?.Items ??
    data?.rows ??
    data?.Rows ??
    (Array.isArray(data) ? data : []);

  return {
    items: Array.isArray(items) ? items : [],
    pageNumber: data?.pageNumber ?? data?.PageNumber ?? 1,
    pageSize: data?.pageSize ?? data?.PageSize ?? 25,
    totalCount:
      data?.totalCount ??
      data?.TotalCount ??
      (Array.isArray(items) ? items.length : 0),
    totalPages: data?.totalPages ?? data?.TotalPages ?? 1,
    hasNextPage: data?.hasNextPage ?? data?.HasNextPage,
    hasPreviousPage: data?.hasPreviousPage ?? data?.HasPreviousPage,
  };
};

export async function getCopyTradingStrategies(params = {}) {
  // Backend commonly expects PageNumber/PageSize/SearchTerm (web uses PascalCase).
  const response = await api.get("/copy-trading/strategies", {
    params,
  });
  return response.data;
}

export async function followCopyTrade(payload = {}) {
  const response = await api.post("/copy-trading/follow", payload);
  return response.data;
}

export async function unfollowCopyTrade(payload = {}) {
  const response = await api.post("/copy-trading/unfollow", payload);
  return response.data;
}

export async function updateCopyTradeSettings(strategyId, payload = {}) {
  if (strategyId == null) throw new Error("strategyId is required");
  const response = await api.put(
    `/copy-trading/settings/${strategyId}`,
    payload,
  );
  return response.data;
}

export async function updateCopyTradeAccount(payload = {}) {
  const response = await api.patch("/copy-trading/update-account", payload);
  return response.data;
}

export async function getFollowing({ accountId, isActive } = {}) {
  if (accountId == null) throw new Error("accountId is required");

  const response = await api.get("/copy-trading/following", {
    params: {
      accountId,
      ...(typeof isActive === "boolean" ? { isActive } : {}),
    },
  });
  return response.data;
}

export async function getMasterStatus() {
  const response = await api.get("/copy-trading/master-status");
  return response.data;
}

export function normalizeStrategyList(resp) {
  return normalizePaged(resp);
}
