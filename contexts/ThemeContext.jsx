import { createContext, useContext, useEffect, useState } from "react";
import { Appearance } from "react-native";
import { themes } from "../constants/theme";

const defaultCtx = {
  theme: themes.light || {},
  themeName: "light",
  toggleTheme: () => {},
  setAppTheme: () => {},
  tw: {},
};

const ThemeContext = createContext(defaultCtx);

export const ThemeProvider = ({ children }) => {
  const system = Appearance.getColorScheme() || "light";

  const [themeName, setThemeName] = useState(system);
  const [theme, setTheme] = useState(themes[system]);

  useEffect(() => {
    setTheme(themes[themeName] || themes.light);
  }, [themeName]);

  const buildTw = (name) => {
    // Map theme name to Tailwind utility classes for common slots
    switch (name) {
      case "dark":
        return {
          bg: "bg-[#0f172a]",
          text: "text-[#cbd5e1]",
          card: "bg-[#1E293B]",
          header: "bg-[#1E293B]",
          positiveBg: "bg-emerald-600",
          negativeBg: "bg-red-500",
          positiveText: "text-emerald-500",
          negativeText: "text-red-500",
          icon: "text-[#a9a9a9]",
          secondary: "text-[#94a3b8]",
          tabActive: "text-[#339CFD]",
          tabInactive: "text-[#94a3b8]",
          border: "border-[#334155]",
        };
      case "green":
        return {
          bg: "bg-[#062B1A]",
          text: "text-[#EAFBF3]",
          card: "bg-[#0B3A25]",
          header: "bg-[#16A34A]",
          positiveBg: "bg-green-600",
          negativeBg: "bg-red-500",
          positiveText: "text-green-400",
          negativeText: "text-red-400",
          icon: "text-[#86EFAC]",
          secondary: "text-[#BBF7D0]",
          tabActive: "text-[#22C55E]",
          tabInactive: "text-[#4ADE80]",
          border: "border-[#14532D]",
        };
      case "red":
        return {
          bg: "bg-[#2d0000]",
          text: "text-white",
          card: "bg-[#400000]",
          header: "bg-[#FF6B6B]",
          positiveBg: "bg-green-500",
          negativeBg: "bg-red-400",
          positiveText: "text-green-400",
          negativeText: "text-red-400",
          icon: "text-[#ff9999]",
          secondary: "text-[#FFAAAA]",
          tabActive: "text-[#FF6B6B]",
          tabInactive: "text-[#AA6666]",
          border: "border-[#660000]",
        };
      case "purple":
        return {
          bg: "bg-[#1a001a]",
          text: "text-white",
          card: "bg-[#330033]",
          header: "bg-[#9966FF]",
          positiveBg: "bg-green-500",
          negativeBg: "bg-red-400",
          positiveText: "text-green-400",
          negativeText: "text-red-400",
          icon: "text-[#e699ff]",
          secondary: "text-[#CCAACC]",
          tabActive: "text-[#9966FF]",
          tabInactive: "text-[#7744AA]",
          border: "border-[#660066]",
        };
      case "light":
      default:
        return {
          bg: "bg-white",
          text: "text-black",
          card: "bg-gray-100",
          header: "bg-blue-500",
          positiveBg: "bg-blue-600",
          negativeBg: "bg-red-500",
          positiveText: "text-blue-600",
          negativeText: "text-red-500",
          icon: "text-[#1c9fa5]",
          secondary: "text-[#6C757D]",
          tabActive: "text-[#4285F4]",
          tabInactive: "text-[#9E9E9E]",
          border: "border-[#E0E0E0]",
        };
    }
  };

  const toggleTheme = () => {
    setThemeName((p) => (p === "light" ? "dark" : "light"));
  };

  const setAppTheme = (t) => {
    if (themes[t]) setThemeName(t);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeName,
        toggleTheme,
        setAppTheme,
        tw: buildTw(themeName),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => useContext(ThemeContext);

// Backwards-compatible alias: some files import { useTheme } from '../contexts/ThemeContext'
export const useTheme = useAppTheme;
