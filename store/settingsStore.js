import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const useSettingsStore = create(
  persist(
    (set) => ({
      biometricEnabled: false,
      setBiometricEnabled: (enabled) =>
        set({ biometricEnabled: Boolean(enabled) }),
    }),
    {
      name: "app-settings",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ biometricEnabled: state.biometricEnabled }),
    },
  ),
);

export default useSettingsStore;
