import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { useRouter, useSegments } from "expo-router";
import { Drawer } from "expo-router/drawer";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import "react-native-gesture-handler";
import "react-native-reanimated";
import Toast from "react-native-toast-message";

import AppIcon from "@/components/AppIcon";
import AppSplashScreen from "@/components/AppSplashScreen";
import { useColorScheme } from "@/components/useColorScheme";
import CustomDrawerContent from "../components/CustomDrawerContent";
import { createToastConfig } from "../components/ToastConfig";
import {
  ThemeProvider as AppThemeProvider,
  useAppTheme,
} from "../contexts/ThemeContext";
import { useAuthStore } from "../store/authStore";
import { setOnAuthFailure } from "../utils/authSession";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary
} from "expo-router";

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: "(tabs)",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  const [appReady, setAppReady] = useState(false);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    setOnAuthFailure(() => {
      try {
        useAuthStore.getState()?.logout?.();
      } catch (_e) {}
      router.replace("/(auth)/login");
    });

    return () => {
      setOnAuthFailure(null);
    };
  }, [router]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AppThemeProvider>
      {appReady ? (
        <RootLayoutNav />
      ) : (
        <AppSplashScreen onReady={() => setAppReady(true)} />
      )}
    </AppThemeProvider>
  );
}

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  const token = useAuthStore((s) => s.token);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const colorScheme = useColorScheme();
  const { theme } = useAppTheme();

  useEffect(() => {
    if (!hasHydrated) return;

    const inAuthGroup = segments?.[0] === "(auth)";

    if (!token && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (token && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [hasHydrated, token, segments, router]);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Drawer
        screenOptions={{ headerShown: false }}
        drawerContent={(props) => <CustomDrawerContent {...props} />}
      >
        <Drawer.Screen
          name="(tabs)"
          options={{
            title: "Home",
            drawerIcon: () => (
              <AppIcon name="home" size={16} color={theme.positive} />
            ),
          }}
        />
        <Drawer.Screen
          name="history"
          options={{
            title: "History",
            drawerIcon: () => (
              <AppIcon name="history" size={16} color={theme.positive} />
            ),
          }}
        />

        {/* (tabs2) is a nested Stack group; hide it and link to its screens from CustomDrawerContent */}
        <Drawer.Screen
          name="(tabs2)"
          options={{ drawerItemStyle: { display: "none" } }}
        />

        {/* Hide auth + internal routes from the drawer list */}
        <Drawer.Screen
          name="(auth)"
          options={{
            drawerItemStyle: { display: "none" },
            swipeEnabled: false,
          }}
        />
        <Drawer.Screen
          name="+not-found"
          options={{ drawerItemStyle: { display: "none" } }}
        />
      </Drawer>
      <Toast config={createToastConfig(theme)} />
    </ThemeProvider>
  );
}
