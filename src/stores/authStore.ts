import { create } from "zustand";
import { persist } from "zustand/middleware";
import { LevelAssessment } from "@/utils/levelAssessment";

export interface User {
  id: string;
  email: string;
  name: string;
  level?: "beginner" | "intermediate" | "advanced";
  interests?: string[];
  levelAssessment?: LevelAssessment; // 상세 평가 결과
  onboardingCompleted: boolean;
  createdAt: string;
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
  initializeAuth: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      isAuthenticated: false,
      loading: true,

      // Actions
      login: async () => {
        console.log("🔵 로그인 함수 시작");
        set({ loading: true });

        // 더미 Google OAuth 시뮬레이션 (2초 딜레이)
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const dummyUser: User = {
          id: `user_${Date.now()}`,
          email: "demo@mypattern.com",
          name: "데모 사용자",
          onboardingCompleted: false,
          createdAt: new Date().toISOString(),
        };

        console.log("🟢 로그인 성공:", dummyUser);

        set({
          user: dummyUser,
          isAuthenticated: true,
          loading: false,
        });

        console.log("🟢 상태 업데이트 완료");
      },

      logout: () => {
        console.log("🔴 로그아웃");
        set({
          user: null,
          isAuthenticated: false,
          loading: false,
        });
      },

      updateUser: (updates: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          const updatedUser = { ...currentUser, ...updates };
          console.log("🟡 사용자 정보 업데이트:", updatedUser);
          set({ user: updatedUser });
        }
      },

      initializeAuth: () => {
        console.log("🔵 인증 초기화");
        set({ loading: false });
      },

      setLoading: (loading: boolean) => {
        set({ loading });
      },
    }),
    {
      name: "mypattern-auth",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
