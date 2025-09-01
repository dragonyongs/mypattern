// src/stores/authStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface User {
  id: string;
  email: string;
  name: string;
  level?: "beginner" | "intermediate" | "advanced";
  interests?: string[];
  onboardingCompleted: boolean;
  createdAt: string;
  selectedPackId?: string;
  selectedPackTitle?: string;
  startDate?: string;
  dailyGoal?: number;
  timezone?: string;
  preferredStudyTime?: string;
  notifications?: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
}

interface AuthActions {
  login: () => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      loading: false, // 초기값을 false로 설정

      login: async () => {
        set({ loading: true });
        await new Promise((r) => setTimeout(r, 800));
        const dummyUser: User = {
          id: `user_${Date.now()}`,
          email: "demo@mypattern.com",
          name: "데모 사용자",
          onboardingCompleted: false,
          createdAt: new Date().toISOString(),
        };
        set({
          user: dummyUser,
          isAuthenticated: true,
          loading: false,
        });
      },

      logout: () => set({ user: null, isAuthenticated: false, loading: false }),

      updateUser: (updates: Partial<User>) => {
        const current = get().user;
        if (!current) return;
        set({ user: { ...current, ...updates } });
      },

      setLoading: (loading: boolean) => set({ loading }),
    }),
    {
      name: "mypattern-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
