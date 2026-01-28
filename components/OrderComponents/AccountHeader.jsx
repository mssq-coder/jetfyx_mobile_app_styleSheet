import { Pressable, Text, View, Animated } from "react-native";
import { useEffect, useMemo, useRef } from "react";
import AppIcon from "../../components/AppIcon";
import { Easing } from "react-native";

const AccountHeader = ({ 
  theme, 
  account, 
  summaryLoading, 
  selectedAccount, 
  setSummaryOpen, 
  summaryOpen 
}) => {
  const arrowRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(arrowRotate, {
      toValue: summaryOpen ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [arrowRotate, summaryOpen]);

  const arrowRotation = useMemo(
    () =>
      arrowRotate.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "180deg"],
      }),
    [arrowRotate]
  );

  return (
    <Pressable
      style={{
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 16,
        padding: 16,
        backgroundColor: theme.card,
      }}
      onPress={() => setSummaryOpen(true)}
      accessibilityRole="button"
      accessibilityLabel="Open account summary"
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "500",
              color: theme.secondary,
            }}
          >
            Balance
          </Text>
          <Text
            style={{
              fontSize: 30,
              fontWeight: "700",
              color: theme.text,
            }}
          >
            ${account.balance.toFixed(2)}
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 8,
            }}
          >
            <Text style={{ fontSize: 12, color: theme.secondary }}>
              Margin: ${account.margin.toFixed(2)}
            </Text>
            {summaryLoading ? (
              <Text
                style={{
                  fontSize: 12,
                  marginLeft: 8,
                  color: theme.secondary,
                }}
              >
                Updating…
              </Text>
            ) : null}
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 8,
            }}
          >
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 9999,
                marginRight: 8,
                backgroundColor: theme.primary + "20",
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  color: theme.primary,
                }}
              >
                {String(
                  selectedAccount?.accountTypeName ??
                    account.type ??
                    ""
                )}
              </Text>
            </View>
            <Text style={{ fontSize: 12, color: theme.secondary }}>
              {String(selectedAccount?.accountNumber ?? "—")}
            </Text>
          </View>
        </View>

        <Pressable
          onPressIn={() => setSummaryOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Open account summary"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Animated.View
            style={{ transform: [{ rotate: arrowRotation }] }}
          >
            <AppIcon
              name="keyboard-arrow-down"
              size={40}
              color={theme.secondary}
            />
          </Animated.View>
        </Pressable>
      </View>
    </Pressable>
  );
};

export default AccountHeader;