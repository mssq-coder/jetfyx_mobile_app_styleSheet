import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuthStore } from "../../store/authStore";

import LogoComp from "../../components/LogoComp";

export default function Login() {
  const [accountType, setAccountType] = useState("live");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const login = useAuthStore((state) => state.login);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);

  const onSubmit = async () => {
    const result = await login({ email: username, password });
    console.log("Login result:", result);
    if (result.success) {
      // Replace to prevent navigating back to login
      router.replace("/(tabs)");
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* Top red curved gradient */}
      <LinearGradient
        colors={["#DC2626", "#E00055"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "40%",
          borderBottomLeftRadius: 120,
          borderBottomRightRadius: 120,
        }}
      />
      {/* Bottom red curved gradient */}
      <LinearGradient
        colors={["#E00055", "#DC2626"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "38%",
          borderTopLeftRadius: 140,
          borderTopRightRadius: 140,
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="flex-1 justify-center px-8">
          <View
            className="bg-white rounded-[28px] px-7 pt-10 pb-8"
            style={{
              shadowColor: "#000",
              shadowOpacity: 0.08,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            <View className="items-center mb-6">
              <View className="items-center mb-6">
                <LogoComp size={88} />
              </View>
            </View>

            {/* Account type segmented */}
            <View className="flex-row bg-[#f2f2f6] p-1 rounded-full mb-4">
              {["live", "demo"].map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setAccountType(t)}
                  className="flex-1 py-2 rounded-full items-center justify-center"
                  style={
                    accountType === t ? { backgroundColor: "#C40042" } : null
                  }
                >
                  <Text
                    className="text-[13px] font-semibold"
                    style={
                      accountType === t
                        ? { color: "#fff" }
                        : { color: "#9CA3AF" }
                    }
                  >
                    {t === "live" ? "Live" : "Demo"}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Username */}
            <View className="mb-3">
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder={
                  accountType === "live" ? "Username / Email" : "Demo Account"
                }
                placeholderTextColor="#9AA0A6"
                className="bg-[#E9EAEE] py-3.5 px-4 rounded-full text-sm text-[#222]"
                autoCapitalize="none"
              />
            </View>

            {/* Password */}
            <View className="mb-2">
              <View>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor="#9AA0A6"
                  secureTextEntry={!showPassword}
                  className="bg-[#E9EAEE] py-3.5 px-4 rounded-full text-sm text-[#222]"
                  autoCapitalize="none"
                />
                <Pressable
                  onPress={() => setShowPassword((s) => !s)}
                  accessibilityRole="button"
                  className="absolute right-4 top-1/2 -translate-y-2.5"
                >
                  <Text className="text-[#6B7280] text-[13px]">
                    {showPassword ? "Hide" : "Show"}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Remember me & forgot */}
            <View className="flex-row justify-between items-center mb-4">
              <Pressable
                onPress={() => setRemember(!remember)}
                className="flex-row items-center"
              >
                <View
                  className="w-4 h-4 rounded-[3px] mr-2 border"
                  style={{
                    backgroundColor: remember ? "#C40042" : "transparent",
                    borderColor: remember ? "#C40042" : "#bbb",
                  }}
                />
                <Text className="text-xs text-[#666]">REMEMBER ME</Text>
              </Pressable>
              <Pressable>
                <Text className="text-xs text-[#C40042] font-semibold">
                  Forgot password?
                </Text>
              </Pressable>
            </View>

            {/* Login button */}
            <View className="mb-4">
              <LinearGradient
                colors={["#C40042", "#E00055"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="rounded-full"
              >
                <Pressable
                  onPress={onSubmit}
                  disabled={loading}
                  className="bg-[#DC2626] py-2.5 rounded-full"
                  style={{ opacity: loading ? 0.7 : 1 }}
                  android_ripple={{ color: "#99002f" }}
                >
                  <Text className="text-white text-center text-base font-semibold">
                    {loading ? "Logging in..." : "Log In"}
                  </Text>
                </Pressable>
              </LinearGradient>
            </View>

            {/* Error message */}
            {error ? (
              <View className="items-center mb-2">
                <Text className="text-xs text-red-600">{String(error)}</Text>
              </View>
            ) : null}

            {/* Sign up link */}
            <View className="items-center mb-4">
              <Text className="text-xs text-[#666]">
                Don&apos;t Have An Account?{" "}
                <Text
                  className="text-[#C40042] font-semibold"
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
