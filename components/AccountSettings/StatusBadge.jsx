import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function StatusBadge({ status, theme }) {
  const statusLower = String(status || "").toLowerCase();

  let backgroundColor = theme.secondary;
  let textColor = "#FFFFFF";

  if (statusLower === "approved") {
    backgroundColor = theme.positive;
  } else if (statusLower === "pending" || statusLower === "processing") {
    backgroundColor = "#FFA000";
  } else if (statusLower === "rejected" || statusLower === "failed") {
    backgroundColor = theme.negative;
  } else if (statusLower === "verified") {
    backgroundColor = theme.primary;
  }

  return (
    <View style={[styles.statusBadge, { backgroundColor }]}>
      <Text style={[styles.statusText, { color: textColor }]} numberOfLines={1}>
        {status || "Unknown"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
