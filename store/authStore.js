  import { create } from 'zustand';
  import { persist, createJSONStorage } from 'zustand/middleware';
  import AsyncStorage from '@react-native-async-storage/async-storage';
  import { login as loginApi } from '../api/auth';

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

          const firstId = accounts.length
            ? (accounts[0].accountId ?? accounts[0].id)
            : null;

          set({
            token,
            accounts,
            sharedAccounts,
            fullName,
            selectedAccountId: get().selectedAccountId ?? firstId,
            loading: false,
          });

          return { success: true, data };
        } catch (err) {
          const message =
            err?.response?.data?.message ||
            err?.message ||
            'Login failed';

          set({ error: message, loading: false });
          return { success: false, error: message };
        }
      },

      setSelectedAccount: (accountOrId) => {
        const id =
          typeof accountOrId === 'object'
            ? (accountOrId.accountId ?? accountOrId.id)
            : accountOrId;

        set({ selectedAccountId: id });
      },

      logout: async () => {
        try {
          await AsyncStorage.removeItem('accessToken');
          await AsyncStorage.removeItem('refreshToken');
        } catch (_err) {}

        set({
          token: null,
          accounts: [],
          sharedAccounts: [],
          fullName: null,
          selectedAccountId: null,
          error: null,
        });
      },
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => AsyncStorage),

      partialize: (state) => ({
        token: state.token,
        accounts: state.accounts,
        sharedAccounts: state.sharedAccounts,
        fullName: state.fullName,
        selectedAccountId: state.selectedAccountId,
      }),

      onRehydrateStorage: () => (state) => {
        // Use the store action so subscribers re-render
        state?.setHasHydrated?.(true);
      },
    }
  )
);

