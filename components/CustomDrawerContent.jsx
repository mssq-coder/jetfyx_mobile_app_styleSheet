import React from "react";
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  StyleSheet, 
  StatusBar,
  Platform 
} from "react-native";
import {
  DrawerContentScrollView,
  DrawerItemList,
} from "@react-navigation/drawer";
import { LinearGradient } from "expo-linear-gradient";
import { useAppTheme } from "../contexts/ThemeContext";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "expo-router";
import AppIcon from "./AppIcon";

export default function CustomDrawerContent(props) {
  const { theme } = useAppTheme();
  const logout = useAuthStore((s) => s.logout);
  const fullName = useAuthStore((s) => s.fullName);
  const email = useAuthStore((s) => s.email);
  const router = useRouter();

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar 
        barStyle={theme.isDark ? "light-content" : "dark-content"} 
        backgroundColor="transparent" 
        translucent 
      />
      
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ================= USER PROFILE SECTION ================= */}
        <LinearGradient
          colors={theme.isDark 
            ? [theme.primary, theme.primary + 'CC']
            : [theme.primary + '20', theme.primary + '10']
          }
          style={styles.profileContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.profileContent}>
            {/* Avatar with fallback to initials */}
            <View style={[styles.avatarContainer, { backgroundColor: theme.primary + '30' }]}>
              {fullName ? (
                <View style={[styles.avatarFallback, { backgroundColor: theme.primary }]}>
                  <Text style={styles.avatarText}>{getInitials(fullName)}</Text>
                </View>
              ) : (
                <AppIcon name="person" size={32} color={theme.primary} />
              )}
            </View>

            <View style={styles.userInfo}>
              <Text 
                style={[styles.name, { color: theme.isDark ? '#fff' : theme.text }]} 
                numberOfLines={1}
              >
                {fullName || "Welcome Back"}
              </Text>
              
              <Text
                style={[styles.email, { color: theme.isDark ? 'rgba(255,255,255,0.8)' : theme.secondary }]}
                numberOfLines={1}
              >
                {email || "User"}
              </Text>
            </View>

            {/* Edit Profile Button */}
            <TouchableOpacity 
              style={[styles.editButton, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.3)' }]}
              activeOpacity={0.7}
            >
              <AppIcon name="edit" size={16} color={theme.isDark ? '#fff' : theme.primary} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* ================= DRAWER MENU ================= */}
        <View style={styles.menuContainer}>
          <View style={[styles.menuHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.menuTitle, { color: theme.secondary }]}>
              NAVIGATION
            </Text>
          </View>
          
          <View style={styles.menu}>
            <DrawerItemList 
              {...props}
              activeBackgroundColor={theme.primary + '15'}
              activeTintColor={theme.primary}
              inactiveTintColor={theme.text + '90'}
              labelStyle={styles.drawerLabel}
              itemStyle={styles.drawerItem}
            />
          </View>
        </View>

        {/* ================= QUICK ACTIONS ================= */}
        <View style={[styles.actionsContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.actionsTitle, { color: theme.secondary }]}>
            QUICK ACTIONS
          </Text>
          
          <View style={styles.actionsRow}>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: theme.primary + '10' }]}
              activeOpacity={0.7}
            >
              <AppIcon name="settings" size={20} color={theme.primary} />
              <Text style={[styles.actionText, { color: theme.text }]}>Settings</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: theme.primary + '10' }]}
              activeOpacity={0.7}
            >
              <AppIcon name="help" size={20} color={theme.primary} />
              <Text style={[styles.actionText, { color: theme.text }]}>Help</Text>
            </TouchableOpacity>
          </View>
        </View>
      </DrawerContentScrollView>

      {/* ================= LOGOUT SECTION ================= */}
      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <TouchableOpacity
          onPress={async () => {
            try {
              await logout();
            } catch (_e) {}
            router.replace("/(auth)/login");
          }}
          style={[styles.logoutButton, { backgroundColor: theme.negative }]}
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          <View style={styles.logoutContent}>
            <AppIcon name="logout" size={18} color="#fff" />
            <Text style={styles.logoutText}>Logout</Text>
          </View>
        </TouchableOpacity>
        
        <Text style={[styles.versionText, { color: theme.secondary }]}>
          Version 1.0.0
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  profileContainer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 20,
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarFallback: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 1,
  },
  userInfo: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  email: {
    fontSize: 13,
    fontWeight: "500",
    opacity: 0.9,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  menuContainer: {
    marginBottom: 24,
  },
  menuHeader: {
    paddingHorizontal: 24,
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  menuTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  menu: {
    paddingHorizontal: 12,
  },
  drawerLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: -16,
  },
  drawerItem: {
    borderRadius: 12,
    marginVertical: 4,
    paddingHorizontal: 12,
  },
  actionsContainer: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  actionsTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    gap: 12,
  },
  logoutButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  logoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoutText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  versionText: {
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '500',
  },
});