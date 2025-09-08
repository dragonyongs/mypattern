// src/stores/studyProgressStore.ts

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  PackProgress,
  DayProgress,
  PackData,
  StudySettings,
} from "@/types";

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

  // ✅ 개별 아이템 완료 상태 관리 추가
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
  debugProgress: (packId: string) => void;
  setHasHydrated: (state: boolean) => void;
}

// ✅ StudySettings 기본값 생성 함수
const createDefaultStudySettings = (): StudySettings => ({
  showMeaningEnabled: true,
  autoProgressEnabled: true,
  studyMode: "immersive",
});

// ✅ 개선된 DayProgress 생성 - 개별 아이템 완료 상태 포함
const createEmptyDayProgress = (day: number): DayProgress => ({
  day,
  completedModes: {},
  completedItems: {}, // ✅ 개별 아이템 완료 상태 추가
  isCompleted: false,
});

// ✅ 수정된 PackProgress 생성 - packId 인자 필수
const createEmptyPackProgress = (packId: string): PackProgress => ({
  packId,
  lastStudiedDay: 1,
  completedDaysCount: 0,
  progressByDay: {},
  settings: createDefaultStudySettings(), // ✅ 기본 설정 제공
});

export const useStudyProgressStore = create<
  StudyProgressState & StudyProgressActions
>()(
  persist(
    (set, get) => ({
      // --- 상태 (State) ---
      progress: {},
      _hasHydrated: false,

      // --- 액션 (Actions) ---
      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
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
        return get().progress[packId]?.progressByDay[day] || null;
      },

      // ✅ 수정된 getSettings - 올바른 타입 반환
      getSettings: (packId): StudySettings => {
        if (!packId || packId === "undefined") {
          return createDefaultStudySettings();
        }

        const packProgress = get().progress[packId];
        if (!packProgress?.settings) {
          return createDefaultStudySettings();
        }

        // 기본값과 저장된 설정 병합
        return {
          ...createDefaultStudySettings(),
          ...packProgress.settings,
        };
      },

      // ✅ 개별 아이템 완료 상태 설정
      setItemCompleted: (packId, day, itemId, completed) => {
        if (!packId || packId === "undefined") {
          console.error(
            "❌ Invalid packId provided to setItemCompleted:",
            packId
          );
          return;
        }

        set((state) => {
          console.log(
            `🔥 setItemCompleted: ${packId}, day ${day}, item ${itemId} = ${completed}`
          );
          const newProgress = { ...state.progress };

          if (!newProgress[packId]) {
            newProgress[packId] = createEmptyPackProgress(packId);
          }

          const packProgress = { ...newProgress[packId] };

          if (!packProgress.progressByDay[day]) {
            packProgress.progressByDay[day] = createEmptyDayProgress(day);
          }

          const dayProgress = { ...packProgress.progressByDay[day] };

          // ✅ 개별 아이템 완료 상태를 객체로 저장
          dayProgress.completedItems = {
            ...dayProgress.completedItems,
            [itemId]: {
              isCompleted: completed,
              lastStudied: new Date().toISOString(), // 🔥 개별 아이템별 시간
            },
          };

          // 전체 day 학습 시간도 업데이트
          dayProgress.lastStudiedAt = new Date().toISOString();

          packProgress.progressByDay[day] = dayProgress;
          newProgress[packId] = packProgress;

          return { progress: newProgress };
        });
      },

      // ✅ 수정된 getItemProgress
      getItemProgress: (packId, day, itemId) => {
        if (!packId || packId === "undefined") {
          return { isCompleted: false, lastStudied: null };
        }

        const state = get();
        const dayProgress = state.progress[packId]?.progressByDay[day];
        const itemProgress = dayProgress?.completedItems?.[itemId];

        // 🔥 구조 확인 - 기존 boolean 데이터와 새 객체 데이터 호환
        if (typeof itemProgress === "boolean") {
          return {
            isCompleted: itemProgress,
            lastStudied: dayProgress?.lastStudiedAt || null,
          };
        }

        return itemProgress || { isCompleted: false, lastStudied: null };
      },

      setModeCompleted: (packId, day, modeType, packData) => {
        // [중요] packId 유효성 검사
        if (!packId || packId === "undefined") {
          console.error(
            "❌ Invalid packId provided to setModeCompleted:",
            packId
          );
          return;
        }

        set((state) => {
          console.log(
            `🔥 setModeCompleted: ${packId}, day ${day}, mode ${modeType}`
          );

          const newProgress = { ...state.progress };

          // ✅ 수정된 부분 - packId 인자 전달
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
              const allModesCompleted = dayPlan.modes.every(
                (m) => dayProgress.completedModes[m.type]
              );

              if (allModesCompleted && !dayProgress.isCompleted) {
                dayProgress.isCompleted = true;

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
          console.log(`🔥 Completing Day 1 introduction for ${packId}`);

          const newProgress = { ...state.progress };

          // ✅ 수정된 부분 - packId 인자 전달
          if (!newProgress[packId]) {
            newProgress[packId] = createEmptyPackProgress(packId);
          }

          const packProgress = { ...newProgress[packId] };
          const dayProgress = {
            ...createEmptyDayProgress(1),
            completedModes: { introduction: true },
            isCompleted: true,
          };

          packProgress.progressByDay = {
            ...packProgress.progressByDay,
            [1]: dayProgress,
          };

          packProgress.completedDaysCount = 1;
          packProgress.lastStudiedDay = 1;
          packProgress.lastStudiedAt = new Date().toISOString();

          newProgress[packId] = packProgress;

          console.log(`✅ Day 1 introduction completed for ${packId}`);
          return { progress: newProgress };
        });
      },

      updateSettings: (packId, newSettings) => {
        if (!packId || packId === "undefined") return;

        set((state) => {
          const newProgress = { ...state.progress };
          const packProgress =
            newProgress[packId] || createEmptyPackProgress(packId); // ✅ packId 인자 전달

          newProgress[packId] = {
            ...packProgress,
            settings: {
              ...createDefaultStudySettings(), // ✅ 기본값 병합
              ...packProgress.settings,
              ...newSettings,
            },
          };

          return { progress: newProgress };
        });
      },

      debugProgress: (packId) => {
        if (!packId) {
          console.log(
            "📊 All Progress:",
            JSON.stringify(get().progress, null, 2)
          );
          return;
        }

        const progress = get().progress[packId];
        console.log(
          `📊 Debug Progress for ${packId}:`,
          JSON.stringify(progress, null, 2)
        );
        console.log(
          `🔍 localStorage data:`,
          localStorage.getItem("study-progress-v3")
        );
      },
    }),
    {
      name: "study-progress-v3",
      storage: createJSONStorage(() => localStorage),

      // [중요] hydration 완료 시 상태 업데이트
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

      partialize: (state) => {
        console.log(
          `💾 Persisting state:`,
          JSON.stringify(state.progress, null, 2)
        );
        return { progress: state.progress };
      },
    }
  )
);
