import { TouchableOpacity, View } from "react-native";
import AppIcon from "../../components/AppIcon";

const FloatingHistoryButton = ({ router, theme }) => {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => router.push("/history")}
      style={{ position: "absolute", right: 20, bottom: 30 }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 9999,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.primary,
        }}
      >
        <AppIcon name="history" color="white" size={28} />
      </View>
    </TouchableOpacity>
  );
};

export default FloatingHistoryButton;