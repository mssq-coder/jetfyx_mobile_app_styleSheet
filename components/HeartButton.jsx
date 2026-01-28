import React, { useRef } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  Animated,
} from "react-native";
import Svg, { Path } from "react-native-svg";

export default function HeartButton() {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const heartAnim = useRef(new Animated.Value(1)).current;

  const startPressAnimation = () => {
    // Button scale
    Animated.spring(scaleAnim, {
      toValue: 1.05,
      useNativeDriver: true,
    }).start();

    // Heart beat loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(heartAnim, {
          toValue: 1.15,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(heartAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const resetAnimation = () => {
    scaleAnim.setValue(1);
    heartAnim.stopAnimation();
    heartAnim.setValue(1);
  };

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPressIn={startPressAnimation}
        onPressOut={resetAnimation}
      >
        <Animated.View
          style={[
            styles.button,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Animated.View
            style={{
              transform: [{ scale: heartAnim }],
            }}
          >
            <Svg width={32} height={32} viewBox="0 0 24 24">
              <Path
                d="M16.5 3C19.538 3 22 5.5 22 9c0 7-7.5 11-10 12.5C9.5 20 2 16 2 9c0-3.5 2.5-6 5.5-6C9.36 3 11 4 12 5c1-1 2.64-2 4.5-2z"
                fill="rgb(255,110,110)"
              />
            </Svg>
          </Animated.View>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
  },

  button: {
    paddingVertical: 20,
    paddingHorizontal: 22,
    backgroundColor: "#e8e8e8",
    borderWidth: 9,
    borderColor: "#ffe2e2",
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",

    // Shadow (iOS)
    shadowColor: "#0a2540",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,

    // Shadow (Android)
    elevation: 4,
  },
});
