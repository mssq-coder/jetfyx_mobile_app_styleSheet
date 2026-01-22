import { Text, View } from "@/components/Themed";
import { Link, Stack } from "expo-router";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: "700" }}>
          This screen doesn't exist.
        </Text>

        <Link href="/" style={{ marginTop: 16, paddingVertical: 16 }}>
          <Text style={{ fontSize: 14, color: "#2e78b7" }}>
            Go to home screen!
          </Text>
        </Link>
      </View>
    </>
  );
}
