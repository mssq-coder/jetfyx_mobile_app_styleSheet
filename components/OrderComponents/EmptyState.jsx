import { View, Text } from "react-native";
import AppIcon from "../../components/AppIcon";

const EmptyState = ({ theme }) => {
  return (
    <View style={{ paddingHorizontal: 16, marginTop: 40 }}>
      <View style={{ alignItems: "center", marginTop: 48 }}>
        <View
          style={{
            width: 112,
            height: 112,
            borderRadius: 16,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.card,
          }}
        >
          <AppIcon name="inbox" size={36} color={theme.secondary} />
        </View>

        <Text
          style={{
            marginTop: 20,
            fontSize: 16,
            fontWeight: "600",
            color: theme.text,
          }}
        >
          No open orders
        </Text>

        <Text
          style={{
            marginTop: 4,
            fontSize: 12,
            textAlign: "center",
            color: theme.secondary,
          }}
        >
          Your active trades will appear here.
        </Text>
      </View>
    </View>
  );
};

export default EmptyState;