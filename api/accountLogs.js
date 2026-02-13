import api from "./client";

export const GET_LOGS_BY_ACCOUNT = "/AccountLogs/account";

// Params (best-effort, matches web portal usage):
// - accountId: number|string (required)
// - pageNumber: number (default 1)
// - pageSize: number (default 25)
// - date: string yyyy-mm-dd (optional)
export async function getAccountLogs({
  accountId,
  pageNumber = 1,
  pageSize = 25,
  date,
} = {}) {
  if (accountId == null || accountId === "") {
    throw new Error("accountId is required");
  }

  const params = {
    accountId,
    pageNumber,
    pageSize,
  };

  if (date) {
    params.date = date;
  }

  const response = await api.get(GET_LOGS_BY_ACCOUNT, { params });
  return response.data;
}
