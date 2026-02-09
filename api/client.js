import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { notifyAuthFailure } from "../utils/authSession";

// Shared axios client used by API services
const isReactNative =
  typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
const isWeb = typeof window !== 'undefined';
const clientOrigin =
  isWeb && window?.location?.origin ? window.location.origin : 'react-native';

const defaultHeaders = {
  'Content-Type': 'application/json',
  'X-Client-App': 'JetFyXMobile',
  'X-Client-Origin': clientOrigin,
};

if (isReactNative) {
  defaultHeaders['User-Agent'] = 'JetFyXMobile';
  defaultHeaders['Origin'] = clientOrigin;
}

const API_BASE =
  'https://jetwebapp-api-dev-e4bpepgaeaaxgecr.centralindia-01.azurewebsites.net/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: defaultHeaders,
  timeout: 20000,
});

let refreshInFlight = null;

const extractTokenPair = (raw) => {
  const payload = raw?.data ?? raw ?? {};
  const root = payload?.data ?? payload;
  const accessToken = root?.accessToken || root?.token || null;
  const refreshToken = root?.refreshToken || null;
  return { accessToken, refreshToken };
};

const refreshTokens = async () => {
  const refreshToken = await SecureStore.getItemAsync("refreshToken");
  if (!refreshToken) throw new Error("Missing refreshToken");

  const resp = await axios.post(
    `${API_BASE}/Auth/refresh`,
    { refreshToken },
    {
      headers: {
        ...(defaultHeaders || {}),
        "Content-Type": "application/json",
      },
      timeout: 20000,
    },
  );

  const { accessToken, refreshToken: nextRefresh } = extractTokenPair(resp);

  if (accessToken) {
    await SecureStore.setItemAsync("accessToken", accessToken);
  }
  if (nextRefresh) {
    await SecureStore.setItemAsync("refreshToken", nextRefresh);
  }

  return accessToken;
};

// Attach token automatically
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (token) {
        config.headers = {
          ...(config.headers || {}),
          Authorization: `Bearer ${token}`,
        };
      }
    } catch (_) {}
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error?.config;

    const url = String(originalRequest?.url || "");
    const isAuthEndpoint = /\/Auth\/(login|refresh)/i.test(url);

    if (status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        if (!refreshInFlight) {
          refreshInFlight = refreshTokens().finally(() => {
            refreshInFlight = null;
          });
        }

        const newAccessToken = await refreshInFlight;
        if (newAccessToken) {
          originalRequest.headers = {
            ...(originalRequest.headers || {}),
            Authorization: `Bearer ${newAccessToken}`,
          };
        }

        return api(originalRequest);
      } catch (_refreshErr) {
        try {
          await SecureStore.deleteItemAsync("accessToken");
        } catch (_e) {}
        try {
          await SecureStore.deleteItemAsync("refreshToken");
        } catch (_e) {}

        notifyAuthFailure("refresh_failed");
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
