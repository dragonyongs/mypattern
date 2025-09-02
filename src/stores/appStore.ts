// src/stores/appStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User, PackData, DayProgress, StudyMode } from "@/types";

interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  selectedPackId: string | null;
  selectedPackData: PackData | null;
  currentDay: number;
  studyStartDate: string | null;
  completedDays: number[];
  dayProgress: Record<number, DayProgress>;
}

interface AppActions {
  // 인증
  login: () => Promise<void>;
  logout: () => void;
  setLoading: (loading: boolean) => void;

  // 팩 관리
  selectPack: (packId: string, packData: PackData) => void;
  clearPack: () => void;

  // 학습 진행
  setCurrentDay: (day: number) => void;
  startStudy: () => void;

  // 학습 완료
  markDayCompleted: (day: number) => void;
  markModeCompleted: (day: number, mode: StudyMode) => void;
  isDayCompleted: (day: number) => boolean;

  // 유틸리티
  reset: () => void;
  getAvailableDay: () => number;
  getCompletionRate: () => number;
}

const initialState: AppState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  selectedPackId: null,
  selectedPackData: null,
  currentDay: 1,
  studyStartDate: null,
  completedDays: [],
  dayProgress: {},
};

export const useAppStore = create<AppState & AppActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // 인증
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

      // 팩 관리
      selectPack: (packId, packData) => {
        const today = new Date().toISOString().split("T")[0];
        set({
          selectedPackId: packId,
          selectedPackData: packData,
          studyStartDate: today,
          currentDay: 1, // Day 1부터 시작 (학습 방법 소개)
        });
      },

      clearPack: () => {
        set({
          selectedPackId: null,
          selectedPackData: null,
          currentDay: 1,
          studyStartDate: null,
          completedDays: [],
          dayProgress: {},
        });
      },

      // 학습 진행
      setCurrentDay: (day) => {
        const { selectedPackData } = get();
        if (!selectedPackData || day < 1 || day > selectedPackData.totalDays) {
          return;
        }
        set({ currentDay: day });
      },

      startStudy: () => {
        const today = new Date().toISOString().split("T")[0];
        set({ studyStartDate: today });
      },

      // 학습 완료
      markDayCompleted: (day) => {
        const { completedDays } = get();
        if (!completedDays.includes(day)) {
          const newCompletedDays = [...completedDays, day].sort(
            (a, b) => a - b
          );
          set({ completedDays: newCompletedDays });
        }
      },

      markModeCompleted: (day, mode) => {
        const { dayProgress } = get();
        const currentProgress = dayProgress[day] || {
          vocab: false,
          sentence: false,
          workbook: false,
          completed: false,
        };

        const newProgress = { ...currentProgress, [mode]: true };

        // Day 1 (소개)는 특별 처리
        if (day === 1) {
          newProgress.completed = true;
        } else {
          // 모든 모드 완료시 전체 완료 처리
          if (
            newProgress.vocab &&
            newProgress.sentence &&
            newProgress.workbook
          ) {
            newProgress.completed = true;
          }
        }

        set({
          dayProgress: { ...dayProgress, [day]: newProgress },
        });

        // 완료된 일수에 추가
        if (newProgress.completed) {
          get().markDayCompleted(day);
        }
      },

      isDayCompleted: (day) => {
        const { dayProgress } = get();
        return dayProgress[day]?.completed || false;
      },

      // 유틸리티
      reset: () => set(initialState),

      getAvailableDay: () => {
        const { studyStartDate, completedDays, dayProgress } = get();
        if (!studyStartDate) return 1; // Day 1부터 시작

        // Day 1이 완료되면 Day 2 해제
        if (dayProgress[1]?.completed) {
          return Math.min(completedDays.length + 2, 14); // 완료된 다음 날까지
        }

        return 1; // Day 1만 가능
      },

      getCompletionRate: () => {
        const { completedDays, selectedPackData } = get();
        if (!selectedPackData) return 0;
        return (completedDays.length / selectedPackData.totalDays) * 100;
      },
    }),
    {
      name: "real-voca-app-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        selectedPackId: state.selectedPackId,
        selectedPackData: state.selectedPackData,
        currentDay: state.currentDay,
        studyStartDate: state.studyStartDate,
        completedDays: state.completedDays,
        dayProgress: state.dayProgress,
      }),
    }
  )
);
