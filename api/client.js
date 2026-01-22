import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

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

export default api;
