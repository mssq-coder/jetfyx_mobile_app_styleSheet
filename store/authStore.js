import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { login as loginApi } from "../api/auth";
import { getUserDetails } from "../api/getServices";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      accounts: [],
      selectedAccountId: null,
      sharedAccounts: [],
      fullName: null,
      loading: false,
      error: null,
      hasHydrated: false,
      userId: null,
      userEmail: null,

      // Mark that persisted state has finished hydrating
      setHasHydrated: (value) => set({ hasHydrated: Boolean(value) }),

      login: async ({ email, password }) => {
        set({ loading: true, error: null });
        try {
          const data = await loginApi({ email, password });
          // API responses may include token under different keys/shapes.
          // Support: { data: { accessToken } }, { data: { token } }, { accessToken }, { token }
          const token =
            data?.data?.accessToken ||
            data?.data?.token ||
            data?.accessToken ||
            data?.token ||
            null;
          const accounts = data?.data?.accounts || [];
          const sharedAccounts = data?.data?.sharedAccounts || [];
          const fullName = data?.data?.fullName || null;
          const userId = data?.data?.userId || null;
          const userEmail = data?.data?.email || email || null;

          const firstId = accounts.length
            ? (accounts[0].accountId ?? accounts[0].id)
            : null;

          set({
            token,
            accounts,
            sharedAccounts,
            fullName,
            selectedAccountId: get().selectedAccountId ?? firstId,
            userId,
            userEmail,
            loading: false,
          });

          return { success: true, data };
        } catch (err) {
          const message =
            err?.response?.data?.message || err?.message || "Login failed";

          set({ error: message, loading: false });
          return { success: false, error: message };
        }
      },

      setSelectedAccount: (accountOrId) => {
        const id =
          typeof accountOrId === "object"
            ? (accountOrId.accountId ?? accountOrId.id)
            : accountOrId;

        set({ selectedAccountId: id });
      },

      logout: async () => {
        // Tokens are stored in SecureStore by `api/auth.js`.
        try {
          await SecureStore.deleteItemAsync("accessToken");
        } catch (_err) {}
        try {
          await SecureStore.deleteItemAsync("refreshToken");
        } catch (_err) {}

        // Also remove any legacy AsyncStorage tokens if present
        try {
          await AsyncStorage.removeItem("accessToken");
          await AsyncStorage.removeItem("refreshToken");
        } catch (_err) {}

        set({
          token: null,
          accounts: [],
          sharedAccounts: [],
          fullName: null,
          selectedAccountId: null,
          userId: null,
          userEmail: null,
          error: null,
        });
      },

      refreshProfile: async () => {
        const currentUserId = get().userId;
        if (!currentUserId) return { success: false, error: "Missing userId" };

        set({ loading: true, error: null });
        try {
          const resp = await getUserDetails(currentUserId);
          // Support multiple shapes: {data:{...}}, {...}, {data:{data:{...}}}
          const payload = resp?.data ?? resp ?? {};
          const root = payload?.data ?? payload;

          // IMPORTANT: `/Users/{id}` may not return accounts/sharedAccounts in some environments.
          // Never clobber existing store values with empty arrays unless the server explicitly
          // returned those fields.
          const nextAccounts = Array.isArray(root?.accounts)
            ? root.accounts
            : get().accounts;
          const nextSharedAccounts = Array.isArray(root?.sharedAccounts)
            ? root.sharedAccounts
            : get().sharedAccounts;
          const fullName = root?.fullName ?? root?.name ?? get().fullName;
          const userId = root?.userId ?? root?.id ?? get().userId;
          const userEmail = root?.email ?? get().userEmail ?? null;
          const firstId = nextAccounts.length
            ? (nextAccounts[0].accountId ?? nextAccounts[0].id)
            : null;

          const prevSelected = get().selectedAccountId;
          const selectedStillExists =
            prevSelected != null &&
            nextAccounts.some((a) => (a.accountId ?? a.id) === prevSelected);

          set({
            accounts: nextAccounts,
            sharedAccounts: nextSharedAccounts,
            fullName,
            userId,
            selectedAccountId: selectedStillExists ? prevSelected : firstId,
            userEmail,
            loading: false,
          });

          return { success: true, data: root };
        } catch (err) {
          const message =
            err?.response?.data?.message || err?.message || "Refresh failed";
          set({ error: message, loading: false });
          return { success: false, error: message };
        }
      },
    }),
    {
      name: "auth-store",
      storage: createJSONStorage(() => AsyncStorage),

      partialize: (state) => ({
        token: state.token,
        accounts: state.accounts,
        sharedAccounts: state.sharedAccounts,
        fullName: state.fullName,
        selectedAccountId: state.selectedAccountId,
        userId: state.userId,
        userEmail: state.userEmail,
      }),

      onRehydrateStorage: () => (state) => {
        // Use the store action so subscribers re-render
        state?.setHasHydrated?.(true);
      },
    },
  ),
);
