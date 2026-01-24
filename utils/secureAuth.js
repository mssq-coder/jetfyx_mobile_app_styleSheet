import * as SecureStore from "expo-secure-store";

const KEYS = {
  email: "biometricEmail",
  password: "biometricPassword",
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
