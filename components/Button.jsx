import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAppTheme } from "../contexts/ThemeContext";

const getButtonVariant = (variant, theme) => {
  switch (variant) {
    case "primary":
      return {
        backgroundColor: "transparent",
        color: theme.primary,
      };
    case "ghost":
    default:
      return {
        backgroundColor: theme.icon,
        color: theme.background === "white" ? "#fff" : theme.background,
      };
  }
};

export default function Button({
  children,
  title,
  variant = "primary",
  onPress,
  disabled,
  loading,
  style,
  textStyle,
  color, // optional text color override
}) {
  const { theme } = useAppTheme();
  const v = getButtonVariant(variant, theme);

  // allow caller to override text color
  const textColor = color ?? v.color;

  // allow caller to override background via style prop; otherwise use variant background
  const backgroundColor =
    style && style.backgroundColor ? style.backgroundColor : v.backgroundColor;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.button,
        { backgroundColor, opacity: disabled || loading ? 0.6 : 1 },
        style,
      ]}
    >
      {loading ? (
        <View style={styles.spinner}>
          <ActivityIndicator color={textColor} />
        </View>
      ) : null}
      <Text style={[styles.text, { color: textColor }, textStyle]}>
        {children ?? title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  spinner: {
    marginRight: 8,
  },
  text: {
    fontWeight: "600",
  },
});
