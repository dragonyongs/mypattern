// src/stores/studyProgressStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  PackProgress,
  DayProgress,
  PackData,
  StudySettings,
} from "@/types";

const STORAGE_KEY = "study-progress-v6";

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

  getItemProgress: (
    packId: string,
    day: number,
    itemId: string
  ) => { isCompleted: boolean; lastStudied: string | null };

  getPackProgress: (packId: string) => PackProgress | null;
  getDayProgress: (packId: string, day: number) => DayProgress | null;
  updateSettings: (packId: string, newSettings: Partial<StudySettings>) => void;
  getSettings: (packId: string) => StudySettings;
  completeDay1Introduction: (packId: string) => void;
  setHasHydrated: (state: boolean) => void;

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
  showMeaningEnabled: true,
  autoProgressEnabled: true,
  studyMode: "immersive",
});

const createEmptyDayProgress = (day: number): DayProgress => ({
  day,
  completedModes: {},
  completedItems: {},
  isCompleted: false,
  lastStudiedAt: null,
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
    (set, get) => ({
      // --- 상태 ---
      progress: {},
      _hasHydrated: false,

      // --- 액션 ---
      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
      },

      // 특정 팩의 진행 상황 초기화
      clearPackProgress: (packId) => {
        if (!packId || packId === "undefined") return;

        set((state) => {
          const newProgress = { ...state.progress };
          delete newProgress[packId];
          console.log(`🔄 Cleared progress for pack: ${packId}`);
          return { progress: newProgress };
        });
      },

      // 유효하지 않은 콘텐츠 ID 진행 상황 정리
      validateProgressForContent: (packId, contentIds) => {
        if (!packId || packId === "undefined" || !contentIds.length) return;

        set((state) => {
          const packProgress = state.progress[packId];
          if (!packProgress) return state;

          const newProgress = { ...state.progress };
          const updatedPack = { ...packProgress };
          let hasChanges = false;

          // 각 날짜별 진행 상황 검증
          Object.keys(updatedPack.progressByDay).forEach((dayKey) => {
            const dayProgress = { ...updatedPack.progressByDay[dayKey] };
            const validItems = {};

            // 유효한 콘텐츠 ID만 유지
            Object.keys(dayProgress.completedItems || {}).forEach((itemId) => {
              if (contentIds.includes(itemId)) {
                validItems[itemId] = dayProgress.completedItems[itemId];
              } else {
                hasChanges = true;
                console.log(`🔄 Removing invalid item progress: ${itemId}`);
              }
            });

            dayProgress.completedItems = validItems;
            updatedPack.progressByDay[dayKey] = dayProgress;
          });

          if (hasChanges) {
            newProgress[packId] = updatedPack;
            return { progress: newProgress };
          }

          return state;
        });
      },

      getPackProgress: (packId) => {
        if (!packId || packId === "undefined") {
          console.warn(
            "⚠️ Invalid packId provided to getPackProgress:",
            packId
          );
          return null;
        }
        return get().progress[packId] || null;
      },

      getDayProgress: (packId, day) => {
        if (!packId || packId === "undefined") {
          console.warn("⚠️ Invalid packId provided to getDayProgress:", packId);
          return null;
        }
        return get().progress[packId]?.progressByDay?.[day] || null;
      },

      getSettings: (packId): StudySettings => {
        if (!packId || packId === "undefined") {
          return createDefaultStudySettings();
        }

        const packProgress = get().progress[packId];
        if (!packProgress?.settings) {
          return createDefaultStudySettings();
        }

        return {
          ...createDefaultStudySettings(),
          ...packProgress.settings,
        };
      },

      setItemCompleted: (packId, day, itemId, completed) => {
        if (!packId || packId === "undefined") {
          console.error(
            "❌ Invalid packId provided to setItemCompleted:",
            packId
          );
          return;
        }

        set((state) => {
          const newProgress = { ...state.progress };

          if (!newProgress[packId]) {
            newProgress[packId] = createEmptyPackProgress(packId);
          }

          const packProgress = { ...newProgress[packId] };

          if (!packProgress.progressByDay[day]) {
            packProgress.progressByDay[day] = createEmptyDayProgress(day);
          }

          const dayProgress = { ...packProgress.progressByDay[day] };

          dayProgress.completedItems = {
            ...dayProgress.completedItems,
            [itemId]: {
              isCompleted: completed,
              lastStudied: new Date().toISOString(),
            },
          };

          dayProgress.lastStudiedAt = new Date().toISOString();
          packProgress.progressByDay[day] = dayProgress;
          newProgress[packId] = packProgress;

          return { progress: newProgress };
        });
      },

      getItemProgress: (packId, day, itemId) => {
        if (!packId || packId === "undefined") {
          return { isCompleted: false, lastStudied: null };
        }

        const state = get();
        const dayProgress = state.progress[packId]?.progressByDay?.[day];
        const itemProgress = dayProgress?.completedItems?.[itemId];

        if (typeof itemProgress === "boolean") {
          return {
            isCompleted: itemProgress,
            lastStudied: dayProgress?.lastStudiedAt || null,
          };
        }

        return itemProgress || { isCompleted: false, lastStudied: null };
      },

      setModeCompleted: (packId, day, modeType, packData) => {
        if (!packId || packId === "undefined") {
          console.error(
            "❌ Invalid packId provided to setModeCompleted:",
            packId
          );
          return;
        }

        set((state) => {
          const newProgress = { ...state.progress };

          if (!newProgress[packId]) {
            newProgress[packId] = createEmptyPackProgress(packId);
          }

          const packProgress = { ...newProgress[packId] };

          if (!packProgress.progressByDay[day]) {
            packProgress.progressByDay[day] = createEmptyDayProgress(day);
          }

          const dayProgress = { ...packProgress.progressByDay[day] };

          dayProgress.completedModes = {
            ...dayProgress.completedModes,
            [modeType]: true,
          };

          if (packData?.learningPlan?.days) {
            const dayPlan = packData.learningPlan.days.find(
              (d) => d.day === day
            );

            if (dayPlan) {
              const allModesCompleted = dayPlan.modes?.every(
                (m) => dayProgress.completedModes[m.type]
              );

              if (allModesCompleted && !dayProgress.isCompleted) {
                dayProgress.isCompleted = true;
                dayProgress.lastStudiedAt = new Date().toISOString();

                packProgress.progressByDay = {
                  ...packProgress.progressByDay,
                  [day]: dayProgress,
                };

                packProgress.completedDaysCount = Object.values(
                  packProgress.progressByDay
                ).filter((d) => d.isCompleted).length;

                packProgress.lastStudiedDay = day;
                packProgress.lastStudiedAt = new Date().toISOString();

                console.log(
                  `🎉 Day ${day} completed! Total: ${packProgress.completedDaysCount}`
                );
              }
            }
          }

          packProgress.progressByDay[day] = dayProgress;
          newProgress[packId] = packProgress;

          return { progress: newProgress };
        });
      },

      completeDay1Introduction: (packId) => {
        if (!packId || packId === "undefined") {
          console.error(
            "❌ Invalid packId provided to completeDay1Introduction:",
            packId
          );
          return;
        }

        set((state) => {
          const newProgress = { ...state.progress };

          if (!newProgress[packId]) {
            newProgress[packId] = createEmptyPackProgress(packId);
          }

          const packProgress = { ...newProgress[packId] };
          const dayProgress = {
            ...createEmptyDayProgress(1),
            completedModes: { introduction: true },
            isCompleted: true,
            lastStudiedAt: new Date().toISOString(),
          };

          packProgress.progressByDay = {
            ...packProgress.progressByDay,
            [1]: dayProgress,
          };

          packProgress.completedDaysCount = Object.values(
            packProgress.progressByDay
          ).filter((d) => d.isCompleted).length;
          packProgress.lastStudiedDay = 1;
          packProgress.lastStudiedAt = new Date().toISOString();

          newProgress[packId] = packProgress;

          return { progress: newProgress };
        });
      },

      updateSettings: (packId, newSettings) => {
        if (!packId || packId === "undefined") return;

        set((state) => {
          const newProgress = { ...state.progress };
          const packProgress =
            newProgress[packId] || createEmptyPackProgress(packId);

          newProgress[packId] = {
            ...packProgress,
            settings: {
              ...createDefaultStudySettings(),
              ...packProgress.settings,
              ...newSettings,
            },
          };

          return { progress: newProgress };
        });
      },

      // 🔥 현재 학습 위치 저장
      setCurrentItemIndex: (packId, day, mode, index) => {
        if (!packId || packId === "undefined") return;

        set((state) => {
          const newProgress = { ...state.progress };
          if (!newProgress[packId])
            newProgress[packId] = createEmptyPackProgress(packId);

          const packProgress = newProgress[packId];
          if (!packProgress.progressByDay[day])
            packProgress.progressByDay[day] = createEmptyDayProgress(day);

          const dayProgress = { ...packProgress.progressByDay[day] };

          // currentItemIndexByMode가 없으면 초기화
          if (!dayProgress.currentItemIndexByMode) {
            dayProgress.currentItemIndexByMode = {};
          }

          dayProgress.currentItemIndexByMode[mode] = index;
          packProgress.progressByDay[day] = dayProgress;
          newProgress[packId] = packProgress;

          // console.log(`📍 Set current index for ${mode}: ${index}`);
          return { progress: newProgress };
        });
      },

      // 🔥 현재 학습 위치 조회
      getCurrentItemIndex: (packId, day, mode) => {
        if (!packId || packId === "undefined") return 0;

        const dayProgress = get().progress[packId]?.progressByDay?.[day];
        const index = dayProgress?.currentItemIndexByMode?.[mode] || 0;
        // console.log(`📍 Get current index for ${mode}: ${index}`);
        return index;
      },

      // 🔥 다음 미완료 아이템 인덱스 계산
      getNextUncompletedIndex: (packId, day, mode, contentIds) => {
        if (!packId || packId === "undefined" || !contentIds.length) return 0;

        const dayProgress = get().progress[packId]?.progressByDay?.[day];
        if (!dayProgress) return 0;

        // 완료된 아이템들 확인
        for (let i = 0; i < contentIds.length; i++) {
          const itemProgress = dayProgress.completedItems?.[contentIds[i]];
          const isCompleted =
            typeof itemProgress === "boolean"
              ? itemProgress
              : itemProgress?.isCompleted || false;

          if (!isCompleted) {
            // console.log(`🔍 Next uncompleted index for ${mode}: ${i}`);
            return i;
          }
        }

        // 모든 아이템이 완료된 경우 마지막 인덱스
        const lastIndex = contentIds.length - 1;
        // console.log(
        //   `🔍 All completed, returning last index for ${mode}: ${lastIndex}`
        // );
        return lastIndex;
      },

      // 🔥 자동 다음 모드 이동
      autoMoveToNextMode: (packId, day, currentMode, packData) => {
        const dayPlan = packData.learningPlan?.days?.find((d) => d.day === day);
        if (!dayPlan) return null;

        const currentModeIndex = dayPlan.modes.findIndex(
          (m) => m.type === currentMode
        );
        if (
          currentModeIndex === -1 ||
          currentModeIndex >= dayPlan.modes.length - 1
        ) {
          return null;
        }

        const nextMode = dayPlan.modes[currentModeIndex + 1];

        // 🔥 다음 모드의 콘텐츠 ID 가져오기
        const nextModeContentIds = nextMode.contentIds || [];

        if (nextModeContentIds.length > 0) {
          // 🔥 다음 모드의 최적 시작 위치 계산 (0이 아님)
          const optimalIndex = get().getNextUncompletedIndex(
            packId,
            day,
            nextMode.type,
            nextModeContentIds
          );
          get().setCurrentItemIndex(packId, day, nextMode.type, optimalIndex);
          console.log(
            `🔄 Auto moved to ${nextMode.type} at index ${optimalIndex}`
          );
        } else {
          // 콘텐츠가 없으면 0부터 시작
          get().setCurrentItemIndex(packId, day, nextMode.type, 0);
        }

        return nextMode.type;
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),

      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error("💥 Hydration failed:", error);
        } else {
          console.log("✅ Hydration completed successfully");
          if (state) {
            state.setHasHydrated(true);
          }
        }
      },

      partialize: (state) => ({
        progress: state.progress,
      }),
    }
  )
);
