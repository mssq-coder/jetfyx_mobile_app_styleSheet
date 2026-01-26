import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View, Text, Animated, Pressable, Platform } from "react-native";
import Header from "../../components/Header";
import { useAppTheme } from "../../contexts/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import { useClientOnlyValue } from "../../components/useClientOnlyValue";

const styles = StyleSheet.create({
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    height: "100%",
  },
  pulseBackground: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 20,
    top: "50%",
    left: "50%",
    marginLeft: -30,
    marginTop: -30,
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  labelContainer: {
    position: "absolute",
    top: -16,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  tabBar: {
    flexDirection: 'row',
    height: Platform.OS === 'ios' ? 88 : 74,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 30 : 8,
    borderTopWidth: 1,
    position: 'relative',
    overflow: 'visible',
  },
  indicatorLine: {
    position: 'absolute',
    top: 0,
    height: 3,
    borderRadius: 1.5,
    transition: 'left 0.3s ease',
  },
});

// Custom Tab Bar Icon with enhanced animations
function TabBarIcon({ name, color, focused, theme, label, onPress, isChangingTab }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const labelAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (focused) {
      // Main icon animations
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.25,
          tension: 180,
          friction: 12,
          useNativeDriver: true,
        }),
        Animated.spring(bounceAnim, {
          toValue: 1,
          tension: 200,
          friction: 3,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Fade in label briefly when changing tabs
      if (isChangingTab) {
        Animated.sequence([
          Animated.timing(labelAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.delay(800), // Show label for 800ms
          Animated.timing(labelAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        Animated.timing(labelAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }).start();
      }
    } else {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 180,
        friction: 12,
        useNativeDriver: true,
      }).start();
      
      Animated.spring(bounceAnim, {
        toValue: 0,
        tension: 200,
        friction: 3,
        useNativeDriver: true,
      }).start();
      
      Animated.timing(labelAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [focused, isChangingTab]);

  // Animated background pulse for active tab
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (focused) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: false,
          }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(0);
    }
  }, [focused]);

  const pulseColor = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      `${theme.tabActive || theme.primary}20`,
      `${theme.tabActive || theme.primary}40`,
    ],
  });

  const translateY = bounceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -4],
  });

  const iconShadow = focused
    ? {
        shadowColor: theme.tabActive || theme.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
      }
    : {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      };

  return (
    <Pressable onPress={onPress} style={styles.tabButton}>
      <Animated.View style={[styles.pulseBackground, { backgroundColor: pulseColor }]} />
      
      <Animated.View
        style={[
          styles.iconContainer,
          {
            transform: [
              { scale: scaleAnim },
              { translateY: translateY }
            ],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.iconWrap,
            focused
              ? {
                  backgroundColor: theme.tabActive || theme.primary,
                  ...iconShadow,
                }
              : {
                  backgroundColor: theme.card,
                  borderWidth: 1.5,
                  borderColor: theme.border,
                  ...iconShadow,
                },
          ]}
        >
          <FontAwesome 
            name={name} 
            size={20} 
            color={focused ? "#FFFFFF" : color} 
          />
        </Animated.View>
        
        {/* Label that only shows during tab change */}
        <Animated.View
          style={[
            styles.labelContainer,
            {
              opacity: labelAnim,
              transform: [
                { translateY: Animated.multiply(labelAnim, -2) },
                { scale: labelAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.8, 1.1, 1]
                })}
              ],
              backgroundColor: theme.tabActive || theme.primary,
            },
          ]}
        >
          <Text
            style={[
              styles.label,
              {
                color: "#FFFFFF",
                fontWeight: "700",
              },
            ]}
          >
            {label}
          </Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

export default function TabLayout() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const [changingTab, setChangingTab] = useState(false);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  
  useEffect(() => {
    if (!hasHydrated) return;
    if (!token) {
      router.replace("/(auth)/login");
    }
  }, [hasHydrated, token, router]);

  // Map route names to better icons
  const getIconName = (routeName) => {
    switch (routeName) {
      case 'index':
        return 'line-chart';
      case 'chart':
        return 'area-chart';
      case 'orderList':
        return 'exchange';
      case 'dashboard':
        return 'sliders';
      default:
        return 'circle';
    }
  };

  // Custom tab bar component
  function CustomTabBar({ state, descriptors, navigation }) {
    const handleTabPress = (index, route) => {
      const isFocused = state.index === index;
      
      if (!isFocused) {
        setChangingTab(true);
        setActiveTabIndex(index);
        
        // Reset changing state after animation completes
        setTimeout(() => {
          setChangingTab(false);
        }, 1200); // Slightly longer than animation duration
      }

      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    return (
      <View style={[styles.tabBar, {
        backgroundColor: theme.background,
        borderTopColor: theme.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 10,
      }]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel || options.title || route.name;
          const isFocused = state.index === index;

          return (
            <TabBarIcon
              key={route.key}
              name={getIconName(route.name)}
              color={theme.tabInactive || theme.secondary}
              focused={isFocused}
              theme={theme}
              label={label}
              onPress={() => handleTabPress(index, route)}
              isChangingTab={changingTab && isFocused && index === activeTabIndex}
            />
          );
        })}
        
        {/* Animated indicator line */}
        <Animated.View style={[styles.indicatorLine, {
          backgroundColor: theme.tabActive || theme.primary,
          left: `${(100 / state.routes.length) * state.index + 12.5}%`,
          width: `${100 / state.routes.length - 25}%`,
        }]} />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.tabActive || theme.primary,
        tabBarInactiveTintColor: theme.tabInactive || theme.secondary,
        headerShown: useClientOnlyValue(false, true),
        header: () => <Header />,
        tabBarShowLabel: false,
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Market",
        }}
      />
      <Tabs.Screen
        name="chart"
        options={{
          title: "Charts",
        }}
      />
      <Tabs.Screen
        name="orderList"
        options={{
          title: "Orders",
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
        }}
      />
    </Tabs>
  );
}