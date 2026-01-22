import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Drawer } from "expo-router/drawer";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-gesture-handler";
import "react-native-reanimated";

import { useColorScheme } from "@/components/useColorScheme";
import CustomDrawerContent from "../components/CustomDrawerContent";
import { ThemeProvider as AppThemeProvider } from "../contexts/ThemeContext";

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
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <AppThemeProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Drawer
          screenOptions={{ headerShown: false }}
          drawerContent={(props) => <CustomDrawerContent {...props} />}
        >
          <Drawer.Screen name="(tabs)" options={{ title: "Home" }} />
          <Drawer.Screen name="history" options={{ title: "History" }} />
          <Drawer.Screen name="(tabs2)/more" options={{ title: "More" }} />

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
      </ThemeProvider>
    </AppThemeProvider>
  );
}
