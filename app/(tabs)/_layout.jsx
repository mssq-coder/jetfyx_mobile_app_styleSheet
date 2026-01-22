import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs, useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Header from "../../components/Header";
import { useAppTheme } from "../../contexts/ThemeContext";
import { useAuthStore } from "../../store/authStore";

import { useClientOnlyValue } from "../../components/useClientOnlyValue";

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon({ name, color, focused, theme }) {
  return (
    <View
      style={[
        styles.iconWrap,
        focused
          ? {
              backgroundColor:
                (theme?.tabActive || theme?.headerBlue || theme?.primary) +
                "20",
              borderWidth: 2,
              borderColor:
                theme?.tabActive || theme?.headerBlue || theme?.primary,
            }
          : null,
      ]}
    >
      <FontAwesome name={name} size={20} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default function TabLayout() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  useEffect(() => {
    // wait for persisted store to hydrate, then ensure token exists
    if (!hasHydrated) return;
    if (!token) {
      router.replace("/(auth)/login");
    }
  }, [hasHydrated, token, router]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor:
          theme.tabActive || theme.headerBlue || theme.primary,
        tabBarInactiveTintColor: theme.tabInactive || theme.secondary,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
        },
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: useClientOnlyValue(false, true),
        header: () => <Header />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Market",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name="map-marker"
              color={color}
              focused={focused}
              theme={theme}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="chart"
        options={{
          title: "Chart",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name="bar-chart"
              color={color}
              focused={focused}
              theme={theme}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="orderList"
        options={{
          title: "Order List",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name="list"
              color={color}
              focused={focused}
              theme={theme}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name="cogs"
              color={color}
              focused={focused}
              theme={theme}
            />
          ),
        }}
      />
    </Tabs>
  );
}
