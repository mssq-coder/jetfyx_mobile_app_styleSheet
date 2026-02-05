import React from "react";
import { Platform, Pressable, Text, View } from "react-native";
import Toast, { BaseToast, ErrorToast } from "react-native-toast-message";

export const toastConfig = {
  success: ({ text1, text2 }: any) => (
    <Pressable
      onPress={() => Toast.hide()}
      style={({ pressed }) => [
        {
          width: "92%",
          alignSelf: "center",
          borderRadius: 16,
          backgroundColor: "#000d24",
          borderWidth: 1,
          borderColor: "#14532d",
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
      <View style={{ height: 4, backgroundColor: "#22c55e" }} />

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
            backgroundColor: "#22c55e",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#052e16", fontSize: 18, fontWeight: "900" }}>
            ✓
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          {text1 ? (
            <Text
              numberOfLines={1}
              style={{ color: "#fff", fontSize: 14, fontWeight: "900" }}
            >
              {text1}
            </Text>
          ) : null}
          {text2 ? (
            <Text
              numberOfLines={2}
              style={{
                color: "#cbd5e1",
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
            backgroundColor: "#111827",
            borderWidth: 1,
            borderColor: "#1f2937",
          }}
        >
          <Text style={{ color: "#9ca3af", fontSize: 12, fontWeight: "800" }}>
            Tap
          </Text>
        </View>
      </View>
    </Pressable>
  ),
  error: (props: any) => (
    <ErrorToast
      {...props}
      text1Style={{ fontSize: 14, fontWeight: "800" }}
      text2Style={{ fontSize: 12 }}
    />
  ),
  info: (props: any) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: "#3b82f6" }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 14, fontWeight: "800" }}
      text2Style={{ fontSize: 12, color: "#4b5563" }}
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
          backgroundColor: "#111827",
          borderRadius: 14,
          padding: 12,
        }}
      >
        {text1 ? (
          <Text style={{ color: "#fff", fontSize: 14, fontWeight: "900" }}>
            {text1}
          </Text>
        ) : null}
        {text2 ? (
          <Text
            style={{
              color: "#d1d5db",
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
              backgroundColor: "#374151",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "900" }}>
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
              backgroundColor: "#ef4444",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "900" }}>
              {confirmText}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  },
};
