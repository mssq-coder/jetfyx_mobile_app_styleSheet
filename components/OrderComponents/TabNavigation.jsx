import { View, Text, TouchableOpacity } from "react-native";

const TABS = [
  { key: "market", label: "Ongoing" },
  { key: "pending", label: "Pending" },
];

const TabNavigation = ({ theme, tab, setTab, orders, pendingOrders }) => {
  return (
    <View
      style={{
        flexDirection: "row",
        paddingHorizontal: 16,
        marginTop: 18,
      }}
    >
      {TABS.map((t) => {
        const active = tab === t.key;
        const ongoingCount = orders.length;
        const pendingCount = pendingOrders.length;
        const displayCount =
          t.key === "market" ? ongoingCount : pendingCount;
        return (
          <TouchableOpacity
            key={t.key}
            onPress={() => setTab(t.key)}
            style={{ marginRight: 24 }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: active ? theme.primary : theme.secondary,
                }}
              >
                {t.label}
              </Text>
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 10,
                  backgroundColor: active
                    ? theme.primary
                    : theme.secondary + "20",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: active ? "#fff" : theme.secondary,
                  }}
                >
                  {displayCount}
                </Text>
              </View>
            </View>
            <View
              style={[
                {
                  height: 3,
                  marginTop: 8,
                  borderRadius: 999,
                  width: 32,
                },
                {
                  backgroundColor: active
                    ? theme.primary
                    : "transparent",
                },
              ]}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default TabNavigation;