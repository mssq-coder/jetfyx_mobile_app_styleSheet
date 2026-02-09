import { Text, TouchableOpacity, View } from "react-native";

import AppIcon from "../AppIcon";

const ProfitCard = ({
  theme,
  floatingProfit,
  bulkMode,
  quickExpanded,
  onToggleQuickActions,
}) => {
  return (
    <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
      <View
        style={{
          borderRadius: 16,
          padding: 18,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: theme.card,
          borderWidth: 1,
          borderColor: theme.border,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 14,
              backgroundColor: theme.background,
              borderWidth: 1,
              borderColor: theme.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AppIcon name="show-chart" color={theme.icon} size={20} />
          </View>

          <View>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "500",
                color: theme.secondary,
              }}
            >
              Net Profit
            </Text>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: floatingProfit >= 0 ? theme.positive : theme.negative,
              }}
            >
              ${floatingProfit.toFixed(2)}
            </Text>
          </View>
        </View>

        {!bulkMode ? (
          <TouchableOpacity
            onPress={onToggleQuickActions}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            style={{
              width: 44,
              height: 44,
              borderRadius: 16,
              backgroundColor: theme.background,
              borderWidth: 1,
              borderColor: theme.border,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 6,
            }}
            accessibilityRole="button"
            accessibilityLabel={
              quickExpanded ? "Hide quick actions" : "Show quick actions"
            }
          >
            <AppIcon name="tune" color={theme.icon} size={20} />
            <AppIcon
              name={quickExpanded ? "expand-less" : "expand-more"}
              color={theme.icon}
              size={18}
            />
          </TouchableOpacity>
        ) : (
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 16,
              backgroundColor: theme.background,
              borderWidth: 1,
              borderColor: theme.border,
              alignItems: "center",
              justifyContent: "center",
              opacity: 0.7,
            }}
          >
            <AppIcon name="checklist" color={theme.icon} size={18} />
          </View>
        )}
      </View>
    </View>
  );
};

export default ProfitCard;
