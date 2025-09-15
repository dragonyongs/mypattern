// src/stores/studyProgressStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  PackProgress,
  DayProgress,
  PackData,
  StudySettings,
} from "@/types";

const STORAGE_KEY = "study-progress-v7";

type ItemProgress = { isCompleted: boolean; lastStudied: string | null };
interface StudyProgressState {
  progress: Record<string, PackProgress>;
  _hasHydrated: boolean;
}

interface StudyProgressActions {
  setModeCompleted: (
    packId: string,
    day: number,
    modeType: string,
    packData: PackData
  ) => void;

  setItemCompleted: (
    packId: string,
    day: number,
    itemId: string,
    completed: boolean
  ) => void;
  clearItemProgress: (packId: string, day: number, itemId: string) => void; // 🔥 추가
  getItemProgress: (
    packId: string,
    day: number,
    itemId: string
  ) => ItemProgress | null; // 🔥 반환 타입 변경

  getPackProgress: (packId: string) => PackProgress | null;
  getDayProgress: (packId: string, day: number) => DayProgress | null;
  updateSettings: (packId: string, newSettings: Partial<StudySettings>) => void;
  getSettings: (packId: string) => StudySettings;
  completeDay1Introduction: (packId: string) => void;
  setHasHydrated: (state: boolean) => void;

  // 🔥 하이드레이션 대기 메서드 추가
  waitForHydration: () => Promise<void>;

  // 간단한 유틸리티 메서드
  clearPackProgress: (packId: string) => void;
  validateProgressForContent: (packId: string, contentIds: string[]) => void;

  // 학습 위치 메서드
  getCurrentItemIndex: (packId: string, day: number, mode: string) => number;
  setCurrentItemIndex: (
    packId: string,
    day: number,
    mode: string,
    index: number
  ) => void;
  getNextUncompletedIndex: (
    packId: string,
    day: number,
    mode: string,
    contentIds: string[]
  ) => number;
  autoMoveToNextMode: (
    packId: string,
    day: number,
    currentMode: string,
    packData: PackData
  ) => string | null;
}

// 기본값 생성 함수들
const createDefaultStudySettings = (): StudySettings => ({
  showMeaningEnabled: false,
  autoProgressEnabled: false, // 🔥 몰입 모드 기본값이므로 자동 진행 꺼둠
  studyMode: "immersive",
  autoPlayOnSelect: false,
});

const createEmptyDayProgress = (day: number): DayProgress => ({
  day,
  completedModes: {},
  completedItems: {},
  isCompleted: false,
  lastStudiedAt: null as any,
  currentItemIndexByMode: {},
});

const createEmptyPackProgress = (packId: string): PackProgress => ({
  packId,
  lastStudiedDay: 1,
  completedDaysCount: 0,
  progressByDay: {},
  settings: createDefaultStudySettings(),
  lastStudiedAt: null,
});

export const useStudyProgressStore = create<
  StudyProgressState & StudyProgressActions
>()(
  persist(
    (set, get) => {
      let resolveHydration: (() => void) | null = null;
      const hydrationPromise = new Promise<void>((resolve) => {
        resolveHydration = resolve;
      });

      return {
        progress: {},
        _hasHydrated: false,
        setHasHydrated: (state) => {
          set({ _hasHydrated: state });
          if (state && resolveHydration) {
            resolveHydration();
            resolveHydration = null;
          }
        },
        waitForHydration: () => hydrationPromise,
        getPackProgress: (packId) => get().progress[packId] || null,
        getDayProgress: (packId, day) =>
          get().progress[packId]?.progressByDay?.[day] || null,

        // --- 핵심 수정 영역 ---

        // 🔥 1. 아이템 상태 저장 (생성 또는 업데이트)
        setItemCompleted: (packId, day, itemId, completed) => {
          if (!packId || packId === "undefined") return;
          set((state) => {
            const progress = { ...state.progress };
            const pack = progress[packId] || createEmptyPackProgress(packId);
            const dayPg =
              pack.progressByDay[day] || createEmptyDayProgress(day);

            dayPg.completedItems = {
              ...dayPg.completedItems,
              [itemId]: {
                isCompleted: completed,
                lastStudied: new Date().toISOString(),
              },
            };
            dayPg.lastStudiedAt = new Date().toISOString() as any;
            pack.progressByDay[day] = dayPg;
            progress[packId] = pack;
            return { progress };
          });
        },

        // 🔥 2. 아이템 상태 완전 삭제 (다시 풀기용)
        clearItemProgress: (packId, day, itemId) => {
          if (!packId || packId === "undefined") return;
          set((state) => {
            const progress = { ...state.progress };
            const pack = progress[packId];
            if (!pack?.progressByDay[day]?.completedItems) return state;

            const dayItems = { ...pack.progressByDay[day].completedItems };
            delete dayItems[itemId]; // 해당 아이템 기록을 삭제

            pack.progressByDay[day].completedItems = dayItems;
            progress[packId] = { ...pack };
            return { progress };
          });
        },

        // 🔥 3. 아이템 상태 조회 (기록 없으면 null 반환)
        getItemProgress: (packId, day, itemId) => {
          if (!packId || packId === "undefined") return null;
          const item =
            get().progress[packId]?.progressByDay?.[day]?.completedItems?.[
              itemId
            ];
          if (item === undefined) {
            return null; // "기록 없음" 상태
          }
          if (typeof item === "boolean") {
            return { isCompleted: item, lastStudied: null }; // 호환성
          }
          return item as ItemProgress;
        },

        // --- 이하 로직은 대부분 동일 ---
        setModeCompleted: (packId, day, modeType, packData) => {
          if (!packId || packId === "undefined") return;
          set((state) => {
            const newProgress = { ...state.progress };
            const pack = newProgress[packId] || createEmptyPackProgress(packId);
            const dayPg =
              pack.progressByDay[day] || createEmptyDayProgress(day);
            dayPg.completedModes = {
              ...dayPg.completedModes,
              [modeType]: true,
            };

            const dayPlan = packData?.learningPlan?.days.find(
              (d) => d.day === day
            );
            if (dayPlan) {
              const allDone = (dayPlan.modes || []).every(
                (m) => dayPg.completedModes[m.type]
              );
              if (allDone && !dayPg.isCompleted) {
                dayPg.isCompleted = true;
                dayPg.lastStudiedAt = new Date().toISOString() as any;
                pack.completedDaysCount = Object.values(
                  pack.progressByDay
                ).filter((d: any) => d.isCompleted).length;
                pack.lastStudiedDay = day;
                pack.lastStudiedAt = new Date().toISOString() as any;
              }
            }
            pack.progressByDay[day] = dayPg;
            newProgress[packId] = pack;
            return { progress: newProgress };
          });
        },
        updateSettings: (packId, newSettings) => {
          if (!packId || packId === "undefined") return;
          set((state) => {
            const pack =
              state.progress[packId] || createEmptyPackProgress(packId);
            const updatedPack = {
              ...pack,
              settings: {
                ...createDefaultStudySettings(),
                ...pack.settings,
                ...newSettings,
              },
            };
            return { progress: { ...state.progress, [packId]: updatedPack } };
          });
        },
        getSettings: (packId) => {
          return (
            get().progress[packId]?.settings || createDefaultStudySettings()
          );
        },
        clearPackProgress: (packId) => {
          if (!packId || packId === "undefined") return;
          set((state) => {
            const newProgress = { ...state.progress };
            delete newProgress[packId];
            return { progress: newProgress };
          });
        },
        setCurrentItemIndex: (packId, day, mode, index) => {
          if (!packId || packId === "undefined") return;
          set((state) => {
            const newProgress = { ...state.progress };
            const pack = newProgress[packId] || createEmptyPackProgress(packId);
            const dayPg =
              pack.progressByDay[day] || createEmptyDayProgress(day);
            dayPg.currentItemIndexByMode = {
              ...(dayPg as any).currentItemIndexByMode,
              [mode]: index,
            };
            pack.progressByDay[day] = dayPg;
            newProgress[packId] = pack;
            return { progress: newProgress };
          });
        },
        getCurrentItemIndex: (packId, day, mode) => {
          if (!packId || packId === "undefined") return 0;
          const dp = get().progress[packId]?.progressByDay?.[day] as any;
          return dp?.currentItemIndexByMode?.[mode] ?? 0;
        },
        getNextUncompletedIndex: (packId, day, mode, contentIds) => {
          if (!packId || !contentIds.length) return 0;
          const dayProgress = get().getDayProgress(packId, day);
          if (!dayProgress) return 0;

          for (let i = 0; i < contentIds.length; i++) {
            const itemProgress = dayProgress.completedItems?.[contentIds[i]];
            if (!itemProgress?.isCompleted) {
              return i;
            }
          }
          return Math.max(0, contentIds.length - 1);
        },
        completeDay1Introduction: () => {},
        validateProgressForContent: () => {},
        autoMoveToNextMode: () => null,
      };
    },
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ progress: state.progress }),
      onRehydrateStorage: () => (state, error) => {
        if (state) state.setHasHydrated(true);
        if (error)
          console.error("Hydration failed for studyProgressStore:", error);
      },
    }
  )
);
