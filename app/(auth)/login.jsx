import { LinearGradient } from "expo-linear-gradient";
import * as LocalAuthentication from "expo-local-authentication";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuthStore } from "../../store/authStore";
import { useSettingsStore } from "../../store/settingsStore";
import {
  getBiometricCredentials,
  saveBiometricCredentials,
} from "../../utils/secureAuth";

import LogoComp from "../../components/LogoComp";

export default function Login() {
  const [accountType, setAccountType] = useState("live");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);

  const biometricEnabled = useSettingsStore((s) => s.biometricEnabled);
  const token = useAuthStore((s) => s.token);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  const [hasBiometricCreds, setHasBiometricCreds] = useState(false);

  const login = useAuthStore((state) => state.login);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);

  const promptedRef = useRef(false);

  const onSubmit = async () => {
    const result = await login({ email: username, password });
    console.log("Login result:", result);
    if (result.success) {
      // If user enabled biometrics OR opted to remember, store creds securely
      // so biometric login can re-auth even after logout/fresh install.
      if (biometricEnabled || remember) {
        try {
          await saveBiometricCredentials({ email: username, password });
          setHasBiometricCreds(true);
        } catch (_e) {}
      }
      // Replace to prevent navigating back to login
      router.replace("/(tabs)");
    }
  };

  const loginWithBiometrics = async () => {
    if (biometricBusy) return;
    if (!biometricEnabled) {
      Alert.alert(
        "Biometric login is off",
        "Enable it in Account settings first.",
      );
      return;
    }
    // Prefer existing session if present.
    // If logged out (no token), we'll re-login using credentials stored in SecureStore.

    try {
      setBiometricBusy(true);

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        Alert.alert(
          "Biometrics not available",
          "This device does not support biometric authentication.",
        );
        return;
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        Alert.alert(
          "No biometrics enrolled",
          "Please enroll Face ID / Touch ID / Fingerprint in device settings first.",
        );
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Login",
        cancelLabel: "Cancel",
        disableDeviceFallback: false,
      });

      if (!result?.success) return;

      if (token) {
        router.replace("/(tabs)");
        return;
      }

      const creds = await getBiometricCredentials();
      if (!creds?.email || !creds?.password) {
        Alert.alert(
          "Biometric login not set up",
          "Login once with username/password and enable biometrics (or Remember me) to use biometric login.",
        );
        return;
      }

      const relogin = await login({
        email: creds.email,
        password: creds.password,
      });
      if (relogin?.success) {
        router.replace("/(tabs)");
      } else {
        Alert.alert(
          "Login failed",
          relogin?.error || "Unable to login with saved credentials.",
        );
      }
    } catch (e) {
      Alert.alert("Biometric error", e?.message || "Biometric login failed.");
    } finally {
      setBiometricBusy(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const creds = await getBiometricCredentials();
        if (mounted)
          setHasBiometricCreds(Boolean(creds?.email && creds?.password));
      } catch (_e) {
        if (mounted) setHasBiometricCreds(false);
      }
    };
    check();
    return () => {
      mounted = false;
    };
  }, []);

  // Optional: auto-prompt biometric on app open if enabled + token exists
  useEffect(() => {
    if (!hasHydrated) return;
    if (promptedRef.current) return;
    if (!biometricEnabled) return;
    if (!token) return;
    promptedRef.current = true;
    loginWithBiometrics();
  }, [hasHydrated, biometricEnabled, token]);

  return (
    <View style={styles.container}>
      {/* Top red curved gradient */}
      <LinearGradient
        colors={["#DC2626", "#E00055"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.topGradient}
      />
      {/* Bottom red curved gradient */}
      <LinearGradient
        colors={["#E00055", "#DC2626"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.bottomGradient}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardAvoid}
      >
        <View style={styles.centerContent}>
          <View style={styles.card}>
            <View style={styles.logoContainer}>
              <View style={styles.logoInner}>
                <LogoComp size={88} />
              </View>
            </View>

            {/* Account type segmented */}
            <View style={styles.segmentedControl}>
              {["live", "demo"].map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setAccountType(t)}
                  style={[
                    styles.segmentButton,
                    accountType === t && styles.segmentButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      accountType === t && styles.segmentTextActive,
                    ]}
                  >
                    {t === "live" ? "Live" : "Demo"}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Username */}
            <View style={styles.inputContainer}>
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder={
                  accountType === "live" ? "Username / Email" : "Demo Account"
                }
                placeholderTextColor="#9AA0A6"
                style={styles.textInput}
                autoCapitalize="none"
              />
            </View>

            {/* Password */}
            <View style={styles.passwordContainer}>
              <View>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor="#9AA0A6"
                  secureTextEntry={!showPassword}
                  style={styles.textInput}
                  autoCapitalize="none"
                />
                <Pressable
                  onPress={() => setShowPassword((s) => !s)}
                  accessibilityRole="button"
                  style={styles.showPasswordButton}
                >
                  <Text style={styles.showPasswordText}>
                    {showPassword ? "Hide" : "Show"}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Remember me & forgot */}
            <View style={styles.rememberForgotRow}>
              <Pressable
                onPress={() => setRemember(!remember)}
                style={styles.rememberContainer}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: remember ? "#C40042" : "transparent",
                      borderColor: remember ? "#C40042" : "#bbb",
                    },
                  ]}
                />
                <Text style={styles.rememberText}>REMEMBER ME</Text>
              </Pressable>
              <Pressable>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </Pressable>
            </View>

            {/* Login button */}
            <View style={styles.buttonContainer}>
              <LinearGradient
                colors={["#C40042", "#E00055"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
              >
                <Pressable
                  onPress={onSubmit}
                  disabled={loading}
                  style={[styles.loginButton, { opacity: loading ? 0.7 : 1 }]}
                  android_ripple={{ color: "#99002f" }}
                >
                  <Text style={styles.loginButtonText}>
                    {loading ? "Logging in..." : "Log In"}
                  </Text>
                </Pressable>
              </LinearGradient>
            </View>

            {/* Biometric login */}
            {biometricEnabled && (token || hasBiometricCreds) ? (
              <Pressable
                onPress={loginWithBiometrics}
                disabled={biometricBusy || loading}
                style={[
                  styles.biometricButton,
                  { opacity: biometricBusy || loading ? 0.7 : 1 },
                ]}
              >
                <Text style={styles.biometricButtonText}>
                  {biometricBusy
                    ? "Authenticating..."
                    : "Login with Biometrics"}
                </Text>
              </Pressable>
            ) : null}

            {/* Error message */}
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{String(error)}</Text>
              </View>
            ) : null}

            {/* Sign up link */}
            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>
                Don&apos;t Have An Account?{" "}
                <Text
                  style={styles.signupLink}
                  onPress={() => router.push("/(auth)/register")}
                >
                  Sign Up
                </Text>
              </Text>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  topGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "40%",
    borderBottomLeftRadius: 120,
    borderBottomRightRadius: 120,
  },
  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "38%",
    borderTopLeftRadius: 140,
    borderTopRightRadius: 140,
  },
  keyboardAvoid: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 40,
    paddingBottom: 32,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  logoInner: {
    alignItems: "center",
    marginBottom: 24,
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: "#f2f2f6",
    padding: 4,
    borderRadius: 999,
    marginBottom: 16,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentButtonActive: {
    backgroundColor: "#C40042",
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  segmentTextActive: {
    color: "#fff",
  },
  inputContainer: {
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: "#E9EAEE",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 999,
    fontSize: 14,
    color: "#222",
  },
  passwordContainer: {
    marginBottom: 8,
  },
  showPasswordButton: {
    position: "absolute",
    right: 16,
    top: "50%",
    marginTop: -10,
  },
  showPasswordText: {
    color: "#6B7280",
    fontSize: 13,
  },
  rememberForgotRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  rememberContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 3,
    marginRight: 8,
    borderWidth: 1,
  },
  rememberText: {
    fontSize: 12,
    color: "#666",
  },
  forgotText: {
    fontSize: 12,
    color: "#C40042",
    fontWeight: "600",
  },
  buttonContainer: {
    marginBottom: 16,
  },
  gradient: {
    borderRadius: 999,
  },
  loginButton: {
    backgroundColor: "#DC2626",
    paddingVertical: 10,
    borderRadius: 999,
  },
  loginButtonText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
  },
  biometricButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#C40042",
    paddingVertical: 10,
    marginBottom: 10,
  },
  biometricButtonText: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "700",
    color: "#C40042",
  },
  errorContainer: {
    alignItems: "center",
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: "#dc2626",
  },
  signupContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  signupText: {
    fontSize: 12,
    color: "#666",
  },
  signupLink: {
    color: "#C40042",
    fontWeight: "600",
  },
});
