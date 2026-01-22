import api from './client';
import * as SecureStore from 'expo-secure-store';

export async function login({ email, password }) {
  const payload = { email, password };
  const response = await api.post('/Auth/login', payload);
  try {
    const data = response?.data || {};
    const userData = data?.data || data;
    const accessToken = userData?.accessToken || userData?.token;
    const refreshToken = userData?.refreshToken;
    if (accessToken) {
      await SecureStore.setItemAsync('accessToken', accessToken);
    }
    if (refreshToken) {
      await SecureStore.setItemAsync('refreshToken', refreshToken);
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
  const response = await api.post('/Users/register', payload);
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
  const response = await api.get('/favourite-watchlist-symbols', {
    params: { accountId },
  });

  return response.data;
}

export default {
  login,
  registerUser,
  verifyOtp,
  getFavouriteWatchlistSymbols,
};