import React from "react";
import {
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AppIcon from "../AppIcon";

export default function AccountSettingsHeader({
  theme,
  title = "Account Settings",
  subtitle = "Manage your profile & security",
  onBack,
  onSave,
  canSave,
  saving,
}) {
  return (
    <>
      <StatusBar backgroundColor={theme.primary} barStyle="light-content" />

      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.primary,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 8,
          },
        ]}
      >
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <AppIcon name="arrow-back" color="#fff" size={24} />
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerSubtitle}>{subtitle}</Text>
        </View>

        <TouchableOpacity
          onPress={onSave}
          disabled={!canSave || saving}
          style={[
            styles.saveButton,
            {
              backgroundColor: canSave
                ? "rgba(255,255,255,0.25)"
                : "rgba(255,255,255,0.1)",
              opacity: !canSave || saving ? 0.6 : 1,
            },
          ]}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <AppIcon name="check" color="#fff" size={16} />
              <Text style={styles.saveButtonText}>Save</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});
