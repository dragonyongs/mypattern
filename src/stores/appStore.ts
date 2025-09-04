// src/stores/appStore.ts

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User, PackData } from "@/types";

// 💡 AppState 인터페이스를 간소화합니다.
// 학습 진행률 관련 상태(completedDays, dayProgress 등)는 studyProgressStore에서 전담합니다.
interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  selectedPackId: string | null;
  selectedPackData: PackData | null;
  currentDay: number; // 현재 사용자가 보고 있는 Day (UI 상태)
}

interface AppActions {
  // 인증
  login: () => Promise<void>;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  // 팩 관리
  selectPack: (packId: string, packData: PackData) => void;
  clearPack: () => void;
  // 학습 UI 상태
  setCurrentDay: (day: number) => void;
  // 유틸리티
  reset: () => void;
}

const initialState: AppState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  selectedPackId: null,
  selectedPackData: null,
  currentDay: 1,
};

// ✅ appStore는 이제 인증, 선택된 팩, 현재 UI가 보고 있는 Day 정보 등 전역 UI 상태만 관리합니다.
export const useAppStore = create<AppState & AppActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // --- 인증 ---
      login: async () => {
        set({ loading: true });
        try {
          await new Promise((resolve) => setTimeout(resolve, 800));
          const dummyUser: User = {
            id: `user_${Date.now()}`,
            email: "demo@realvoca.com",
            name: "데모 사용자",
            createdAt: new Date().toISOString(),
          };
          set({
            user: dummyUser,
            isAuthenticated: true,
            loading: false,
          });
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },
      logout: () => {
        set(initialState);
      },
      setLoading: (loading) => set({ loading }),

      // --- 팩 관리 ---
      selectPack: (packId, packData) => {
        set({
          selectedPackId: packId,
          selectedPackData: packData,
          currentDay: 1, // 새로운 팩 선택 시 항상 Day 1로 초기화
        });
      },
      clearPack: () => {
        set({
          selectedPackId: null,
          selectedPackData: null,
          currentDay: 1,
        });
      },

      // --- 학습 UI 상태 ---
      setCurrentDay: (day) => {
        const { selectedPackData } = get();
        if (selectedPackData && (day < 1 || day > selectedPackData.totalDays)) {
          console.warn(`[appStore] 유효하지 않은 Day로 설정 시도: ${day}`);
          return;
        }
        set({ currentDay: day });
      },

      // --- 유틸리티 ---
      reset: () => set(initialState),

      // 💡 markDayCompleted, markModeCompleted, getCompletionRate 등
      // 진행률 관련 함수들은 모두 제거되었습니다.
      // 이 로직은 studyProgressStore와 이를 사용하는 커스텀 훅으로 완전히 이전되었습니다.
    }),
    {
      name: "real-voca-app-storage",
      storage: createJSONStorage(() => localStorage),
      // 💡 partialize를 통해 localStorage에 저장할 상태를 명확히 합니다.
      // 이제 학습 진행률 데이터는 이 스토어에 중복 저장되지 않습니다.
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        selectedPackId: state.selectedPackId,
        selectedPackData: state.selectedPackData,
        currentDay: state.currentDay,
      }),
    }
  )
);
