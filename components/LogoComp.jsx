import { Image, StyleSheet, Text, View } from "react-native";

/**
 * LogoComp
 * Props:
 * - size: number (default 36)
 * - imageIndex: 1 | 2 (choose which logo image to use)
 */
const LogoComp = ({ size = 36, imageIndex = 1 }) => {
  try {
    const img =
      imageIndex === 2
        ? require("../assets/images/icon.png")
        : require("../assets/images/icon.png");
    return (
      <Image
        source={img}
        style={{
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.18),
        }}
        resizeMode="contain"
      />
    );
  } catch (_e) {
    return (
      <View
        style={[
          styles.fallback,
          {
            width: size,
            height: size,
            borderRadius: Math.round(size * 0.18),
          },
        ]}
      >
        <Text style={[styles.fallbackText, { fontSize: Math.round(size / 2) }]}>
          J
        </Text>
      </View>
    );
  }
};

const styles = StyleSheet.create({
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0ea5e9",
  },
  fallbackText: {
    color: "#ffffff",
    fontWeight: "800",
  },
});

export default LogoComp;
