import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../hooks/useTheme";

// Displays key account metrics in a tidy grid
const AccountSummary = ({ account }) => {
  const { themeName, theme } = useTheme();
  const isDark = themeName === "dark";

  if (!account) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: isDark
              ? (theme?.card ?? "#0f172a")
              : (theme?.background ?? "#ffffff"),
          },
        ]}
      >
        <Text
          style={[
            styles.noAccountText,
            { color: isDark ? "#cbd5e1" : "#475569" },
          ]}
        >
          No account selected.
        </Text>
      </View>
    );
  }

  const rows = [
    { label: "Balance", value: `$${account.balance.toFixed(2)}` },
    { label: "Equity", value: `$${account.equity.toFixed(2)}` },
    { label: "Free Margin", value: `$${account.freeMargin.toFixed(2)}` },
    { label: "Leverage", value: account.leverage + "x" },
  ];

  const fieldBackground = isDark
    ? (theme?.surface ?? "#0f172a")
    : (theme?.card ?? "#f8fafc");

  const fieldBorder = isDark ? "#1f2933" : "#e5e7eb";

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark
            ? (theme?.card ?? "#0b1220")
            : (theme?.background ?? "#ffffff"),
        },
      ]}
    >
      <Text
        style={[styles.titleText, { color: isDark ? "#ffffff" : "#0f172a" }]}
      >
        Account Summary
      </Text>

      <View style={styles.rowsContainer}>
        {rows.map((r) => (
          <View key={r.label} style={styles.item}>
            <View
              style={[
                styles.fieldCard,
                {
                  backgroundColor: fieldBackground,
                  borderColor: fieldBorder,
                },
              ]}
            >
              <Text
                style={[
                  styles.labelText,
                  { color: isDark ? "#9ca3af" : "#6b7280" },
                ]}
              >
                {r.label}
              </Text>

              <Text
                style={[
                  styles.valueText,
                  { color: isDark ? "#e5e7eb" : "#111827" },
                ]}
              >
                {r.value}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: 16,
    padding: 16,
  },

  noAccountText: {
    fontSize: 14,
  },

  titleText: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },

  rowsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
  },

  item: {
    width: "50%",
    paddingHorizontal: 6,
    marginBottom: 12,
  },

  /** ✅ Individual field card */
  fieldCard: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    minHeight: 64,
    justifyContent: "center",
  },

  labelText: {
    fontSize: 11,
    fontWeight: "500",
  },

  valueText: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 4,
  },
});

export default AccountSummary;
