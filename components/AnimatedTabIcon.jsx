import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import AppIcon from './AppIcon';

export default function AnimatedTabIcon({ name, color, focused, size = 26 }) {
  const scale = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: focused ? 1.15 : 1,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: focused ? -2 : 0,
        useNativeDriver: true,
      }),
      Animated.timing(rotate, {
        toValue: focused ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: focused ? 1 : 0.85,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused, opacity, rotate, scale, translateY]);

  return (
    <Animated.View
      style={{
        opacity,
        transform: [
          { scale },
          { translateY },
          {
            rotate: rotate.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '-6deg'],
            }),
          },
        ],
      }}
    >
      <AppIcon
        name={name}
        size={size}
        color={color}
      />
    </Animated.View>
  );
}
