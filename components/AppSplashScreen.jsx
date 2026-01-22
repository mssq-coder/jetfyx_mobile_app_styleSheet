import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAppTheme } from "../contexts/ThemeContext";
import LogoComp from "./LogoComp";

// Render a custom in-app splash without controlling the native splash

export default function AppSplashScreen({ onReady }) {
  const { theme } = useAppTheme();

  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load fonts, make any API calls you need to do here
        // For now, just wait 5 seconds
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (e) {
        console.warn(e);
      } finally {
        // Tell the application to render
        if (onReady) onReady();
      }
    }

    prepare();
  }, [onReady]);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme?.background ?? "#ffffff" },
      ]}
    >
      <LogoComp size={120} imageIndex={1} />
      <ActivityIndicator
        size="large"
        color={theme?.primary ?? "#0ea5e9"}
        style={{ marginTop: 40 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
