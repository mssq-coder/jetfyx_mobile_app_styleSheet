import React from "react";
import { Platform, Pressable, Text, View } from "react-native";
import Toast, { BaseToast, ErrorToast } from "react-native-toast-message";

type ThemeLike = {
  isDark?: boolean;
  background?: string;
  card?: string;
  surface?: string;
  text?: string;
  secondary?: string;
  secondaryText?: string;
  border?: string;
  primary?: string;
  success?: string;
  error?: string;
  danger?: string;
  negative?: string;
  info?: string;
};

export function createToastConfig(theme: ThemeLike = {}) {
  const card = theme.card ?? "#111827";
  const surface = theme.surface ?? card;
  const background = theme.background ?? "#0b1220";
  const text = theme.text ?? "#fff";
  const secondaryText = theme.secondaryText ?? theme.secondary ?? "#cbd5e1";
  const border = theme.border ?? "rgba(255,255,255,0.12)";

  const success = theme.success ?? "#22c55e";
  const info = theme.info ?? "#3b82f6";
  const error = theme.error ?? theme.danger ?? theme.negative ?? "#ef4444";

  return {
    success: ({ text1, text2 }: any) => (
      <Pressable
        onPress={() => Toast.hide()}
        style={({ pressed }) => [
          {
            width: "92%",
            alignSelf: "center",
            borderRadius: 16,
            backgroundColor: card,
            borderWidth: 1,
            borderColor: success,
            overflow: "hidden",
            transform: [{ scale: pressed ? 0.99 : 1 }],
          },
          Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.2,
              shadowRadius: 16,
            },
            android: { elevation: 10 },
            default: {},
          }),
        ]}
      >
        <View style={{ height: 4, backgroundColor: success }} />

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingHorizontal: 12,
            paddingVertical: 12,
          }}
        >
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: success,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{ color: background, fontSize: 18, fontWeight: "900" }}
            >
              ✓
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            {text1 ? (
              <Text
                numberOfLines={1}
                style={{ color: text, fontSize: 14, fontWeight: "900" }}
              >
                {text1}
              </Text>
            ) : null}
            {text2 ? (
              <Text
                numberOfLines={2}
                style={{
                  color: secondaryText,
                  fontSize: 12,
                  marginTop: text1 ? 2 : 0,
                  lineHeight: 16,
                }}
              >
                {text2}
              </Text>
            ) : null}
          </View>

          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 6,
              borderRadius: 10,
              backgroundColor: surface,
              borderWidth: 1,
              borderColor: border,
            }}
          >
            <Text
              style={{ color: secondaryText, fontSize: 12, fontWeight: "800" }}
            >
              Tap
            </Text>
          </View>
        </View>
      </Pressable>
    ),
    error: (props: any) => (
      <ErrorToast
        {...props}
        style={{
          borderLeftColor: error,
          backgroundColor: card,
          borderColor: border,
        }}
        text1Style={{ fontSize: 14, fontWeight: "800", color: text }}
        text2Style={{ fontSize: 12, color: secondaryText }}
      />
    ),
    info: (props: any) => (
      <BaseToast
        {...props}
        style={{
          borderLeftColor: info,
          backgroundColor: card,
          borderColor: border,
        }}
        contentContainerStyle={{ paddingHorizontal: 15 }}
        text1Style={{ fontSize: 14, fontWeight: "800", color: text }}
        text2Style={{ fontSize: 12, color: secondaryText }}
      />
    ),
    confirm: ({ text1, text2, props }: any) => {
      const confirmText = props?.confirmText ?? "Confirm";
      const cancelText = props?.cancelText ?? "Cancel";
      const onConfirm = props?.onConfirm;
      const onCancel = props?.onCancel;

      return (
        <View
          style={{
            width: "92%",
            alignSelf: "center",
            backgroundColor: card,
            borderRadius: 14,
            padding: 12,
            borderWidth: 1,
            borderColor: border,
          }}
        >
          {text1 ? (
            <Text style={{ color: text, fontSize: 14, fontWeight: "900" }}>
              {text1}
            </Text>
          ) : null}
          {text2 ? (
            <Text
              style={{
                color: secondaryText,
                fontSize: 12,
                marginTop: 4,
                lineHeight: 16,
              }}
            >
              {text2}
            </Text>
          ) : null}

          <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
            <Pressable
              onPress={() => {
                Toast.hide();
                if (typeof onCancel === "function") onCancel();
              }}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: surface,
                borderWidth: 1,
                borderColor: border,
                alignItems: "center",
              }}
            >
              <Text style={{ color: text, fontWeight: "900" }}>
                {cancelText}
              </Text>
            </Pressable>

            <Pressable
              onPress={async () => {
                Toast.hide();
                if (typeof onConfirm === "function") {
                  await onConfirm();
                }
              }}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: error,
                alignItems: "center",
              }}
            >
              <Text style={{ color: background, fontWeight: "900" }}>
                {confirmText}
              </Text>
            </Pressable>
          </View>
        </View>
      );
    },
  };
}

// Backward-compatible export (uses default colors).
export const toastConfig = createToastConfig();
