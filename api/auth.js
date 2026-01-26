import * as SecureStore from "expo-secure-store";
import api from "./client";

export async function login({ email, password }) {
  const payload = { email, password };
  const response = await api.post("/Auth/login", payload);
  try {
    const data = response?.data || {};
    const userData = data?.data || data;
    const accessToken = userData?.accessToken || userData?.token;
    const refreshToken = userData?.refreshToken;
    if (accessToken) {
      await SecureStore.setItemAsync("accessToken", accessToken);
    }
    if (refreshToken) {
      await SecureStore.setItemAsync("refreshToken", refreshToken);
    }
  } catch (_e) {}
  return response.data;
}

// REGISTER
export async function registerUser({
  accountCreationType,
  accountTypeId,
  email,
  firstName,
  lastName,
  phone,
}) {
  const payload = {
    accountCreationType,
    accountTypeId,
    email,
    firstName,
    lastName,
    phone,
  };
  const response = await api.post("/Users/register", payload);
  return response.data;
}

// VERIFY OTP
export async function verifyOtp({ userId, accountTypeId, otp }) {
  const payload = {
    userId,
    accountTypeId,
    otp,
  };
  const response = await api.post(`/Users/${userId}/verify-otp`, payload);
  return response.data;
}

// GET FAVORITE WATCHLIST SYMBOLS
export async function getFavouriteWatchlistSymbols(accountId) {
  const response = await api.get("/favourite-watchlist-symbols", {
    params: { accountId },
  });

  return response.data;
}

export async function addUserToProfile(
  primaryUserId,
  secondaryUserEmail,
  secondaryUserPassword,
) {
  const payload = {
    primaryUserId,
    secondaryUserEmail,
    secondaryUserPassword,
  };
  const response = await api.post(`/Auth/add-user-to-profile`, payload);
  return response.data;
}

export async function addSymbolToFavouriteWatchlist(accountId, symbol) {
  const payload = {
    accountId: Number(accountId),
    symbol: String(symbol),
  };
  console.log("API addSymbolToFavouriteWatchlist - payload:", payload);
  try {
    const response = await api.post(`/favourite-watchlist-symbols`, payload);
    
    return response.data;
  } catch (err) {
    console.error(
      "API addSymbolToFavouriteWatchlist error:",
      err?.response?.status,
      err?.response?.data || err.message,
    );
    throw err;
  }
}

export async function removeSymbolFromFavouriteWatchlist(favouriteId) {
  const id = Number(favouriteId);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Invalid favouriteId");
  }

  const response = await api.delete(`/favourite-watchlist-symbols/${id}`);
  return response.data;
}

export default {
  login,
  registerUser,
  verifyOtp,
  getFavouriteWatchlistSymbols,
  addUserToProfile,
  addSymbolToFavouriteWatchlist,
  removeSymbolFromFavouriteWatchlist,
};
