import { StyleSheet, Text, TextInput, View } from "react-native";
import useIsNarrowScreen from "../../hooks/useIsNarrowScreen";
import AppIcon from "../AppIcon";

export default function InputRow({
  label,
  value,
  onChangeText,
  theme,
  placeholder,
  editable = true,
  keyboardType,
  helperText,
  multiline = false,
  icon,
  isLast = false,
}) {
  const isNarrow = useIsNarrowScreen();

  return (
    <View
      style={[
        styles.row,
        isNarrow
          ? {
              flexDirection: "column",
              alignItems: "stretch",
              justifyContent: "flex-start",
            }
          : null,
        {
          backgroundColor: theme.card,
          borderBottomColor: isLast ? "transparent" : theme.border,
        },
      ]}
    >
      <View style={[styles.rowLeft, isNarrow ? { marginBottom: 10 } : null]}>
        {icon ? (
          <View
            style={[styles.rowIcon, { backgroundColor: `${theme.primary}15` }]}
          >
            <AppIcon name={icon} color={theme.primary} size={16} />
          </View>
        ) : null}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text>
          {helperText ? (
            <Text style={[styles.rowHelper, { color: theme.secondary }]}>
              {helperText}
            </Text>
          ) : null}
        </View>
      </View>

      <View
        style={[
          styles.inputContainer,
          isNarrow
            ? {
                minWidth: 0,
                width: "100%",
                alignSelf: "stretch",
              }
            : null,
          {
            backgroundColor: editable ? `${theme.background}80` : "transparent",
            borderWidth: editable ? 1 : 0,
            borderColor: theme.border,
          },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.secondary}
          editable={editable}
          keyboardType={keyboardType}
          multiline={multiline}
          style={[
            styles.input,
            isNarrow
              ? {
                  minWidth: 0,
                  textAlign: "left",
                }
              : null,
            {
              color: theme.text,
              opacity: editable ? 1 : 0.7,
            },
            multiline ? { height: 70, textAlignVertical: "top" } : null,
          ]}
        />
      </View>
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
  inputContainer: {
    minWidth: 160,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  input: {
    padding: 0,
    fontSize: 15,
    fontWeight: "600",
    minWidth: 120,
    textAlign: "right",
  },
});
