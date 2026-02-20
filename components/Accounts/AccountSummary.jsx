import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../hooks/useTheme";

// Displays key account metrics in a tidy grid
const AccountSummary = ({ account }) => {
  const { themeName, theme } = useTheme();
  const isDark = Boolean(theme?.isDark) || themeName === "dark";

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
    // { label: "Leverage", value: account.leverage + "x" },
    { label: "Margin Level", value: account.marginLevel.toFixed(2) + "%" },
  ];

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
        style={[
          styles.titleText,
          { color: theme?.text ?? (isDark ? "#ffffff" : "#0f172a") },
        ]}
      >
        Account Summary
      </Text>

      <View style={styles.rowsContainer}>
        {rows.map((r, idx) => {
          const isLeft = idx % 2 === 0;
          return (
            <View key={r.label} style={styles.item}>
              <View
                style={[
                  styles.fieldRow,
                  {
                    borderColor:
                      theme?.border ?? (isDark ? "#334155" : "#d1d5db"),
                    borderRightWidth: isLeft ? StyleSheet.hairlineWidth : 0,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.labelText,
                    {
                      color:
                        theme?.secondary ?? (isDark ? "#94a3b8" : "#6b7280"),
                    },
                  ]}
                >
                  {r.label}
                </Text>

                <Text
                  style={[
                    styles.valueText,
                    { color: theme?.text ?? (isDark ? "#e5e7eb" : "#111827") },
                  ]}
                >
                  {r.value}
                </Text>
              </View>
            </View>
          );
        })}
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

  fieldRow: {
    paddingVertical: 10,
    paddingHorizontal: 6,
    minHeight: 56,
    justifyContent: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
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
