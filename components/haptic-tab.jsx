import * as Haptics from "expo-haptics";
import { useEffect, useRef } from "react";
import {
    Animated,
    Platform,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { useAppTheme } from "../contexts/ThemeContext";

export function HapticTab({ children, onPress, accessibilityState, style }) {
  const selected = accessibilityState?.selected === true;
  const { theme } = useAppTheme();
  const activeColor = theme?.tabActive || theme?.headerBlue || theme?.primary;

  const focusAnim = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(focusAnim, {
      toValue: selected ? 1 : 0,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
  }, [focusAnim, selected]);

  const translateY = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -16],
  });

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    if (onPress) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      style={[styles.root, style]}
    >
      <Animated.View style={{ transform: [{ translateY }] }}>
        {selected ? (
          <View
            style={{
              width: 58,
              height: 58,
              borderRadius: 29,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: activeColor,
              shadowColor: activeColor,
              shadowOpacity: 0.4,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
              elevation: 8,
            }}
          >
            {children}
          </View>
        ) : (
          <View style={styles.inactive}>{children}</View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  inactive: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
});
