import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import {
  DrawerContentScrollView,
  DrawerItemList,
} from "@react-navigation/drawer";
import { useAppTheme } from "../contexts/ThemeContext";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "expo-router";

export default function CustomDrawerContent(props) {
  const { theme } = useAppTheme();
  const logout = useAuthStore((s) => s.logout);
  const fullName = useAuthStore((s) => s.fullName);
  const router = useRouter();

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={styles.contentContainer}
      style={{ backgroundColor: theme.background }}
    >
      <View style={styles.body}>
        {/* ================= USER PROFILE SECTION ================= */}
        <View
          style={[
            styles.profile,
            {
              backgroundColor: theme.card,
              borderBottomColor: theme.border,
            },
          ]}
        >
          <Image
            source={{ uri: "https://i.pravatar.cc/170" }}
            style={styles.avatar}
          />

          <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
            {fullName || "User"}
          </Text>

          <Text
            style={[styles.email, { color: theme.secondary }]}
            numberOfLines={1}
          >
            Welcome back
          </Text>
        </View>

        {/* ================= DRAWER MENU ================= */}
        <View style={styles.menu}>
          <DrawerItemList {...props} />
        </View>

        {/* ================= LOGOUT ================= */}
        <View style={styles.footer}>
          <TouchableOpacity
            onPress={async () => {
              try {
                await logout();
              } catch (_e) {}
              router.replace("/(auth)/login");
            }}
            style={[styles.logoutButton, { backgroundColor: theme.negative }]}
            accessibilityRole="button"
          >
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    flexGrow: 1,
  },
  body: {
    flex: 1,
  },
  profile: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
  },
  email: {
    fontSize: 12,
    marginTop: 4,
  },
  menu: {
    flex: 1,
    paddingTop: 12,
    paddingHorizontal: 8,
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  logoutButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: {
    color: "#fff",
    fontWeight: "800",
  },
});
