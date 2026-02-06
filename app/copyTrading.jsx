import { Redirect } from "expo-router";

export default function CopyTradingRoute() {
  // Dashboard currently navigates to `/copyTrading`.
  // Keep that route stable and redirect to the actual screen.
  return <Redirect href="/(tabs2)/copyTrade" />;
}
