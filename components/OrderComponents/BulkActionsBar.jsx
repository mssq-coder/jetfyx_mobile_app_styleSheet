import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

import AppIcon from "../AppIcon";

const ActionButton = ({
  theme,
  label,
  icon,
  variant = "neutral", // neutral | danger
  disabled,
  onPress,
  rightText,
  loading,
}) => {
  const isDanger = variant === "danger";
  const backgroundColor = isDanger ? theme.negative : theme.background;
  const borderWidth = isDanger ? 0 : 1;
  const borderColor = isDanger ? "transparent" : theme.border;
  const textColor = isDanger ? "#fff" : theme.text;
  const iconColor = isDanger ? "#fff" : theme.icon;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={{
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 14,
        backgroundColor,
        borderWidth,
        borderColor,
        opacity: disabled ? 0.6 : 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator color={isDanger ? "#fff" : theme.icon} />
      ) : null}
      {!loading && icon ? (
        <AppIcon name={icon} color={iconColor} size={18} />
      ) : null}
      <Text
        style={{
          color: textColor,
          fontSize: 12,
          fontWeight: "900",
        }}
        numberOfLines={1}
      >
        {label}
        {rightText ? ` ${rightText}` : ""}
      </Text>
    </TouchableOpacity>
  );
};

const BulkActionsBar = ({
  theme,
  bulkMode,
  bulkDeleting,
  selectedCount,
  quickExpanded,
  onToggleQuickExpanded,
  onPressCloseAll,
  onPressBulkEdit,
  onPressFilters,
  onPressCancel,
  onPressSubmitClose,
}) => {
  const showExpanded = bulkMode ? true : Boolean(quickExpanded);

  if (!bulkMode && !showExpanded) {
    return null;
  }

  return (
    <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
      <View
        style={{
          borderRadius: 16,
          padding: 16,
          backgroundColor: theme.card,
          borderWidth: 1,
          borderColor: theme.border,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <TouchableOpacity
            onPress={() => {
              if (!bulkMode) onToggleQuickExpanded?.();
            }}
            disabled={bulkMode}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              opacity: bulkMode ? 1 : 1,
            }}
            accessibilityRole={bulkMode ? undefined : "button"}
            accessibilityLabel={bulkMode ? undefined : "Collapse quick actions"}
          >
            <AppIcon
              name={bulkMode ? "checklist" : "tune"}
              color={theme.icon}
              size={18}
            />
            <Text
              style={{ color: theme.text, fontSize: 13, fontWeight: "900" }}
            >
              {bulkMode ? "Bulk Actions" : "Quick Actions"}
            </Text>
            {!bulkMode ? (
              <AppIcon
                name={showExpanded ? "expand-less" : "expand-more"}
                color={theme.icon}
                size={18}
              />
            ) : null}
          </TouchableOpacity>

          {bulkMode ? (
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: theme.background,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text
                style={{
                  color: theme.secondary,
                  fontSize: 11,
                  fontWeight: "900",
                }}
              >
                Selected: {selectedCount}
              </Text>
            </View>
          ) : null}
        </View>

        {!bulkMode ? (
          <View style={{ flexDirection: "row", gap: 10 }}>
            <ActionButton
              theme={theme}
              label="Close All"
              icon="close"
              variant="danger"
              disabled={bulkDeleting}
              onPress={onPressCloseAll}
            />
            <ActionButton
              theme={theme}
              label="Bulk SL/TP"
              icon="tune"
              disabled={bulkDeleting}
              onPress={onPressBulkEdit}
            />
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <ActionButton
                theme={theme}
                label="Filters"
                icon="filter-list"
                disabled={bulkDeleting}
                onPress={onPressFilters}
              />
              <ActionButton
                theme={theme}
                label="SL/TP"
                icon="tune"
                disabled={bulkDeleting}
                onPress={onPressBulkEdit}
              />
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <ActionButton
                theme={theme}
                label="Cancel"
                icon="cancel"
                disabled={bulkDeleting}
                onPress={onPressCancel}
              />
              <ActionButton
                theme={theme}
                label="Close"
                rightText={`(${selectedCount})`}
                icon="done-all"
                variant="danger"
                disabled={bulkDeleting}
                loading={bulkDeleting}
                onPress={onPressSubmitClose}
              />
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

export default BulkActionsBar;
