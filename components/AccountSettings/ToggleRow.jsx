import React from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import AppIcon from "../AppIcon";

export default function ToggleRow({
  label,
  value,
  onValueChange,
  theme,
  helperText,
  disabled = false,
  icon,
  isLast = false,
}) {
  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: theme.card,
          borderBottomColor: isLast ? "transparent" : theme.border,
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

      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: theme.border, true: theme.primary }}
        thumbColor="#FFFFFF"
      />
    </View>
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
});
