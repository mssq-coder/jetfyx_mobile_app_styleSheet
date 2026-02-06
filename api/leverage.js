import api from "./client";

const normalizeList = (res) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  return res?.data ?? [];
};

export async function getAccountLeverages(userId) {
  if (userId == null) throw new Error("userId is required");
  const response = await api.get("/AllowedLeverages/user-accounts-leverage", {
    params: { userId },
  });
  return response.data;
}

export async function getEligibleLeverages(accountId) {
  if (accountId == null) throw new Error("accountId is required");
  const response = await api.get(
    "/AllowedLeverages/account-eligible-leverages",
    {
      params: { accountId },
    },
  );
  return response.data;
}

export async function updateAccountLeverage(accountId, leverage) {
  if (accountId == null) throw new Error("accountId is required");
  if (!leverage) throw new Error("leverage is required");

  // Some backends expect query params for PUTs like this.
  try {
    const response = await api.put("/AllowedLeverages/account-leverage", null, {
      params: { accountId, leverage },
    });
    return response.data;
  } catch (err) {
    // Fallback: send JSON body.
    const response = await api.put("/AllowedLeverages/account-leverage", {
      accountId,
      leverage,
    });
    return response.data;
  }
}

export async function getLeverageLogs(options = {}) {
  const params = { ...options };
  if (params.userId == null) throw new Error("userId is required");

  const response = await api.get("/AllowedLeverages/leverage-logs", {
    params,
  });

  const data = response.data;
  if (data && typeof data === "object" && !Array.isArray(data)) return data;

  return {
    items: normalizeList({ data }),
  };
}
