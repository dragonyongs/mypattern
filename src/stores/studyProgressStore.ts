// src/stores/studyProgressStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface DayProgress {
  vocabDone: boolean;
  sentenceDone: boolean;
  workbookDone: boolean;
  dayCompleted: boolean;
}

interface StudySettings {
  showMeaningEnabled: boolean;
  autoProgressEnabled: boolean;
  studyMode: "immersive" | "assisted";
}

interface PackProgress {
  packId: string;
  currentDay: number;
  completedDays: number;
  perDay: DayProgress[];
  settings: StudySettings;
  lastStudiedAt: string;
}

interface StudyProgressState {
  progress: Record<string, PackProgress>;

  // 진행 상태 조회
  getProgress: (packId: string) => PackProgress | null;
  getDayProgress: (packId: string, day: number) => DayProgress;

  // 진행 상태 업데이트
  setModeCompleted: (
    packId: string,
    day: number,
    mode: "vocab" | "sentence" | "workbook",
    completed: boolean
  ) => void;
  setDayCompleted: (packId: string, day: number) => void;
  setCurrentDay: (packId: string, day: number) => void;

  // 설정 관리
  getSettings: (packId: string) => StudySettings;
  updateSettings: (packId: string, settings: Partial<StudySettings>) => void;

  // 접근 권한 확인
  isModeAvailable: (
    packId: string,
    day: number,
    mode: "vocab" | "sentence" | "workbook"
  ) => boolean;
}

const createEmptyDayProgress = (): DayProgress => ({
  vocabDone: false,
  sentenceDone: false,
  workbookDone: false,
  dayCompleted: false,
});

const createDefaultSettings = (): StudySettings => ({
  showMeaningEnabled: true,
  autoProgressEnabled: false,
  studyMode: "assisted",
});

const createEmptyPackProgress = (packId: string): PackProgress => ({
  packId,
  currentDay: 1,
  completedDays: 0,
  perDay: Array(14)
    .fill(null)
    .map(() => createEmptyDayProgress()),
  settings: createDefaultSettings(),
  lastStudiedAt: new Date().toISOString(),
});

export const useStudyProgressStore = create<StudyProgressState>()(
  persist(
    (set, get) => ({
      progress: {},

      getProgress: (packId: string) => {
        const state = get();
        return state.progress[packId] || null;
      },

      // 🎯 안전한 getDayProgress 함수
      getDayProgress: (packId: string, day: number) => {
        const state = get();

        // 팩 진행상태가 없으면 생성
        if (!state.progress[packId]) {
          const newProgress = { ...state.progress };
          newProgress[packId] = createEmptyPackProgress(packId);
          set({ progress: newProgress });
          return createEmptyDayProgress();
        }

        // 유효하지 않은 날짜면 빈 진행상태 반환
        if (day < 1 || day > 14) {
          return createEmptyDayProgress();
        }

        return (
          state.progress[packId].perDay[day - 1] || createEmptyDayProgress()
        );
      },

      setModeCompleted: (
        packId: string,
        day: number,
        mode: "vocab" | "sentence" | "workbook",
        completed: boolean
      ) => {
        const state = get();
        const progress = { ...state.progress };

        // 팩 진행상태가 없으면 생성
        if (!progress[packId]) {
          progress[packId] = createEmptyPackProgress(packId);
        }

        const dayIndex = day - 1;
        const modeKey = `${mode}Done` as keyof DayProgress;

        // 해당 일자 진행상태 업데이트
        progress[packId].perDay[dayIndex] = {
          ...progress[packId].perDay[dayIndex],
          [modeKey]: completed,
        };

        // 하루 전체 완료 체크
        const dayProgress = progress[packId].perDay[dayIndex];
        if (
          dayProgress.vocabDone &&
          dayProgress.sentenceDone &&
          dayProgress.workbookDone
        ) {
          dayProgress.dayCompleted = true;
          progress[packId].completedDays = Math.max(
            progress[packId].completedDays,
            day
          );
        }

        progress[packId].lastStudiedAt = new Date().toISOString();

        set({ progress });
      },

      setDayCompleted: (packId: string, day: number) => {
        const state = get();
        const progress = { ...state.progress };

        if (!progress[packId]) {
          progress[packId] = createEmptyPackProgress(packId);
        }

        progress[packId].perDay[day - 1].dayCompleted = true;
        progress[packId].completedDays = Math.max(
          progress[packId].completedDays,
          day
        );
        progress[packId].lastStudiedAt = new Date().toISOString();

        set({ progress });
      },

      setCurrentDay: (packId: string, day: number) => {
        const state = get();
        const progress = { ...state.progress };

        if (!progress[packId]) {
          progress[packId] = createEmptyPackProgress(packId);
        }

        progress[packId].currentDay = day;
        progress[packId].lastStudiedAt = new Date().toISOString();

        set({ progress });
      },

      // 🎯 설정 관리
      getSettings: (packId: string) => {
        const state = get();
        return state.progress[packId]?.settings || createDefaultSettings();
      },

      updateSettings: (packId: string, newSettings: Partial<StudySettings>) => {
        const state = get();
        const progress = { ...state.progress };

        if (!progress[packId]) {
          progress[packId] = createEmptyPackProgress(packId);
        }

        progress[packId].settings = {
          ...progress[packId].settings,
          ...newSettings,
        };

        set({ progress });
      },

      // 🎯 모드 접근 가능성 체크
      isModeAvailable: (
        packId: string,
        day: number,
        mode: "vocab" | "sentence" | "workbook"
      ) => {
        const state = get();
        const dayProgress = state.getDayProgress(packId, day);

        switch (mode) {
          case "vocab":
            return true; // 단어는 항상 접근 가능

          case "sentence":
            // 단어를 완료했거나, 이미 문장을 완료한 적이 있으면 접근 가능
            return dayProgress.vocabDone || dayProgress.sentenceDone;

          case "workbook":
            // 문장까지 완료했거나, 이미 워크북을 완료한 적이 있으면 접근 가능
            return (
              (dayProgress.vocabDone && dayProgress.sentenceDone) ||
              dayProgress.workbookDone
            );

          default:
            return false;
        }
      },
    }),
    {
      name: "study-progress-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
