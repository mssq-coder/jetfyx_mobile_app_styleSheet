import * as SecureStore from "expo-secure-store";

const KEYS = {
  email: "biometricEmail",
  password: "biometricPassword",
  lastEmail: "lastLoginEmail",
  lastPassword: "lastLoginPassword",
};

export async function saveBiometricCredentials({ email, password }) {
  if (!email || !password) return;
  await SecureStore.setItemAsync(KEYS.email, String(email));
  await SecureStore.setItemAsync(KEYS.password, String(password));
}

export async function getBiometricCredentials() {
  const email = await SecureStore.getItemAsync(KEYS.email);
  const password = await SecureStore.getItemAsync(KEYS.password);
  if (!email || !password) return null;
  return { email, password };
}

export async function clearBiometricCredentials() {
  try {
    await SecureStore.deleteItemAsync(KEYS.email);
  } catch (_e) {}
  try {
    await SecureStore.deleteItemAsync(KEYS.password);
  } catch (_e) {}
}

export async function saveLastLoginCredentials({ email, password }) {
  if (!email) return;
  await SecureStore.setItemAsync(KEYS.lastEmail, String(email));
  await SecureStore.setItemAsync(KEYS.lastPassword, String(password ?? ""));
}

export async function getLastLoginCredentials() {
  const email = await SecureStore.getItemAsync(KEYS.lastEmail);
  const password = await SecureStore.getItemAsync(KEYS.lastPassword);

  if (!email && !password) return null;
  return { email: email || "", password: password || "" };
}

export async function clearLastLoginCredentials() {
  try {
    await SecureStore.deleteItemAsync(KEYS.lastEmail);
  } catch (_e) {}
  try {
    await SecureStore.deleteItemAsync(KEYS.lastPassword);
  } catch (_e) {}
}
