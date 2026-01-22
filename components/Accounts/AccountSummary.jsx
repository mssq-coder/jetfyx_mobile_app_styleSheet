import { Text, View } from "react-native";
import { useTheme } from "../../hooks/useTheme";

// Displays key account metrics in a tidy grid
const AccountSummary = ({ account }) => {
  const { themeName, theme } = useTheme();
  const isDark = themeName === "dark";

  if (!account) {
    return (
      <View
        className="w-full rounded-2xl p-4"
        style={{
          backgroundColor: isDark
            ? (theme?.card ?? "#0f172a")
            : (theme?.background ?? "#ffffff"),
        }}
      >
        <Text
          className="text-sm"
          style={{ color: isDark ? "#cbd5e1" : "#475569" }}
        >
          No account selected.
        </Text>
      </View>
    );
  }

  const rows = [
    { label: "Account ID", value: account.id },
    { label: "Type", value: account.type },
    { label: "Currency", value: account.currency },
    { label: "Balance", value: `$${account.balance.toFixed(2)}` },
    { label: "Equity", value: `$${account.equity.toFixed(2)}` },
    { label: "Margin", value: `$${account.margin.toFixed(2)}` },
    { label: "Free Margin", value: `$${account.freeMargin.toFixed(2)}` },
    { label: "Leverage", value: account.leverage + "x" },
  ];

  return (
    <View
      className="w-full rounded-2xl p-4"
      style={{
        backgroundColor: isDark
          ? (theme?.card ?? "#0b1220")
          : (theme?.background ?? "#ffffff"),
      }}
    >
      <Text
        className="text-lg font-bold mb-3"
        style={{ color: isDark ? "#ffffff" : "#0f172a" }}
      >
        Account Summary
      </Text>

      <View className="flex-row flex-wrap -mx-2">
        {rows.map((r) => (
          <View key={r.label} className="w-1/2 px-2 mb-4">
            <Text
              className="text-[11px] font-medium"
              style={{ color: isDark ? "#9ca3af" : "#6b7280" }}
            >
              {r.label}
            </Text>
            <Text
              className="text-sm font-semibold mt-1"
              style={{ color: isDark ? "#e5e7eb" : "#111827" }}
            >
              {r.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export default AccountSummary;
