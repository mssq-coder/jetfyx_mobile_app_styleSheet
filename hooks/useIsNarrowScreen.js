import { useMemo } from "react";
import { useWindowDimensions } from "react-native";

export const DEFAULT_NARROW_SCREEN_WIDTH = 360;

export default function useIsNarrowScreen(
  threshold = DEFAULT_NARROW_SCREEN_WIDTH,
) {
  const { width } = useWindowDimensions();

  return useMemo(() => {
    if (!Number.isFinite(width) || width <= 0) return false;
    return width < threshold;
  }, [threshold, width]);
}
