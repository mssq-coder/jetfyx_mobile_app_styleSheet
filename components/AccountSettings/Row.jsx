import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AppIcon from "../AppIcon";

export default function Row({
  label,
  value,
  right,
  onPress,
  disabled,
  theme,
  showChevron = true,
  locked = false,
  helperText,
  icon,
  isLast = false,
}) {
  const canPress = Boolean(onPress) && !disabled && !locked;

  return (
    <TouchableOpacity
      activeOpacity={canPress ? 0.7 : 1}
      onPress={canPress ? onPress : undefined}
      style={[
        styles.row,
        {
          borderBottomColor: isLast ? "transparent" : theme.border,
          backgroundColor: theme.card,
        },
      ]}
    >
      <View style={styles.rowLeft}>
        {icon ? (
          <View
            style={[styles.rowIcon, { backgroundColor: `${theme.primary}15` }]}
          >
            <AppIcon name={icon} color={theme.primary} size={16} />
          </View>
        ) : null}

        <View style={{ flex: 1 }}>
          <Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text>
          {helperText ? (
            <Text style={[styles.rowHelper, { color: theme.secondary }]}>
              {helperText}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.rowRight}>
        {value != null ? (
          <Text
            style={[
              styles.rowValue,
              {
                color: locked ? theme.secondary : theme.text,
                fontWeight: locked ? "500" : "600",
              },
            ]}
            numberOfLines={1}
          >
            {String(value)}
          </Text>
        ) : null}

        {right ? right : null}

        {locked ? (
          <View
            style={[
              styles.lockIcon,
              { backgroundColor: `${theme.secondary}15` },
            ]}
          >
            <AppIcon name="lock" color={theme.secondary} size={14} />
          </View>
        ) : showChevron && canPress ? (
          <AppIcon name="chevron-right" color={theme.secondary} size={20} />
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  rowLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  rowHelper: {
    marginTop: 4,
    fontSize: 12,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowValue: {
    fontSize: 15,
    maxWidth: 180,
    textAlign: "right",
  },
  lockIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
