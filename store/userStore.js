import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const useUserStore = create(
  persist(
    (set) => ({
      userData: null,
      setUserData: (data) => set({ userData: data }),
      clearUserData: () => set({ userData: null }),
    }),
    {
      name: "user-data",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ userData: state.userData }),
    },
  ),
);

export default useUserStore;
