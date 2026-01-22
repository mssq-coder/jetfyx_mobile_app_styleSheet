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
    `/CurrencyPair/GetAllCurrencyListFromDB/${accountId}`
  );
  return response.data;
}

export async function getOrderHistory(accountId) {
  if (accountId == null) {
    throw new Error('accountId is required');
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
    throw new Error('accountId is required');
  }

  const response = await api.get('/account/ClientAccountTransactions/all', {
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


export default {
  getAccountType,
  getCountries,
  getAllCurrencyListFromDB,
  getOrderHistory,
  getClientAccountTransactions,
};