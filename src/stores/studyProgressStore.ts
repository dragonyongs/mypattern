// src/stores/studyProgressStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// -----------------------------
// 타입
// -----------------------------
export type StudySettings = {
  repeatCount?: number;
  ttsRate?: number;
  autoAdvance?: boolean;
  [k: string]: any;
};

export interface DayProgress {
  completedItems: Record<
    string,
    {
      itemId: string;
      completed: boolean;
      completedAt?: string;
      [k: string]: any;
    }
  >;
  vocabDone?: boolean;
  sentenceDone?: boolean;
  workbookDone?: boolean;
  dayCompleted?: boolean;
  settings?: StudySettings;
  [k: string]: any;
}

export interface PackProgress {
  packId: string;
  perDay: DayProgress[];
  currentDay?: number;
  completedDays?: number;
  lastStudiedAt?: string | null;
  settings?: StudySettings;
  [k: string]: any;
}

type Progress = Record<string, PackProgress>;

export interface StudyProgressState {
  progress: Progress;

  // 읽기
  getProgress: (packId: string) => PackProgress | null;
  getDayProgress: (packId: string, day: number) => DayProgress;

  // 모드/일자 완료
  setModeCompleted: (
    packId: string,
    day: number,
    mode: "vocab" | "sentence" | "workbook",
    completed: boolean
  ) => void;
  setDayCompleted: (packId: string, day: number) => void;
  setCurrentDay: (packId: string, day: number) => void;

  // 설정
  getSettings: (packId: string) => StudySettings;
  updateSettings: (packId: string, newSettings: Partial<StudySettings>) => void;

  // 아이템 단위 완료
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
  ) => { itemId: string; completed: boolean; completedAt?: string } | null;

  getCompletedItems: (packId?: string, day?: number) => Record<string, any>;

  // 접근성
  isModeAvailable: (
    packId: string,
    day: number,
    mode: "vocab" | "sentence" | "workbook"
  ) => boolean;
}

// -----------------------------
// 헬퍼
// -----------------------------
function createEmptyDayProgress(): DayProgress {
  return { completedItems: {} };
}

const createDefaultSettings = (): StudySettings => ({
  showMeaningEnabled: true,
  autoProgressEnabled: false,
  studyMode: "assisted",
});

function createEmptyPackProgress(
  packId?: string,
  defaultDays = 14
): PackProgress {
  return {
    packId: packId ?? "unknown",
    perDay: Array.from({ length: defaultDays }, () => createEmptyDayProgress()),
    currentDay: 1,
    completedDays: 0,
    lastStudiedAt: null,
    settings: createDefaultSettings(),
  };
}

function normalizeProgress(progress: any, defaultDays = 14): Progress {
  if (!progress || typeof progress !== "object") return {};
  const normalized: Progress = { ...progress };
  Object.keys(normalized).forEach((packKey) => {
    const pack = normalized[packKey];
    if (!pack || typeof pack !== "object") {
      normalized[packKey] = createEmptyPackProgress(packKey, defaultDays);
      return;
    }

    if (!Array.isArray(pack.perDay)) pack.perDay = [];
    while (pack.perDay.length < defaultDays) {
      pack.perDay.push(createEmptyDayProgress());
    }

    pack.perDay = pack.perDay.map((d: any) => {
      if (!d || typeof d !== "object") return createEmptyDayProgress();
      if (!d.completedItems || typeof d.completedItems !== "object")
        d.completedItems = {};
      return d;
    });

    if (typeof pack.completedDays !== "number") pack.completedDays = 0;
    if (typeof pack.currentDay !== "number") pack.currentDay = 1;
    if (!pack.settings || typeof pack.settings !== "object")
      pack.settings = createDefaultSettings();
  });
  return normalized;
}

function safeGetCompletedItemsFromState(
  state: any,
  packId?: string,
  day?: number
) {
  try {
    if (!state || !state.progress) return {};
    if (!packId) return {};
    const pack = state.progress[packId];
    if (!pack || !Array.isArray(pack.perDay)) return {};
    const dayIdx = Math.max(0, (day ?? 1) - 1);
    if (!pack.perDay[dayIdx]) return {};
    const dayProgress = pack.perDay[dayIdx];
    if (!dayProgress || typeof dayProgress !== "object") return {};
    return dayProgress.completedItems || {};
  } catch {
    return {};
  }
}

export function createSafeGetCompletedItems(get: any) {
  return (packId?: string, day?: number) => {
    try {
      const state = typeof get === "function" ? get() : get;
      return safeGetCompletedItemsFromState(state, packId, day);
    } catch {
      return {};
    }
  };
}

export function createSafeSetItemCompleted(get: any, set: any) {
  return (packId: string, day: number, itemId: string, completed: boolean) => {
    try {
      const state = typeof get === "function" ? get() : get;
      const prevProgress: Progress =
        state && state.progress && typeof state.progress === "object"
          ? { ...state.progress }
          : {};

      // pack 보장
      if (!prevProgress[packId]) {
        prevProgress[packId] = createEmptyPackProgress(packId);
      }

      // perDay 보장
      if (!Array.isArray(prevProgress[packId].perDay))
        prevProgress[packId].perDay = [];
      const dayIndex = Math.max(0, (day ?? 1) - 1);
      while (prevProgress[packId].perDay.length <= dayIndex) {
        prevProgress[packId].perDay.push(createEmptyDayProgress());
      }

      // dayProgress 보장
      if (
        !prevProgress[packId].perDay[dayIndex] ||
        typeof prevProgress[packId].perDay[dayIndex] !== "object"
      ) {
        prevProgress[packId].perDay[dayIndex] = createEmptyDayProgress();
      }
      const dayProgress = prevProgress[packId].perDay[dayIndex];

      // completedItems 보장
      if (
        !dayProgress.completedItems ||
        typeof dayProgress.completedItems !== "object"
      ) {
        dayProgress.completedItems = {};
      }

      // 기록
      dayProgress.completedItems[itemId] = {
        ...(dayProgress.completedItems[itemId] || {}),
        itemId,
        completed,
        completedAt: new Date().toISOString(),
      };

      // 메타
      prevProgress[packId].lastStudiedAt = new Date().toISOString();

      console.debug("[study] item completed", {
        packId,
        day,
        itemId,
        completed,
      });

      // 저장
      set({ progress: prevProgress });
    } catch (err) {
      console.error("createSafeSetItemCompleted failed", err);
    }
  };
}

// -----------------------------
// 스토어
// -----------------------------
export const useStudyProgressStore = create<StudyProgressState>()(
  persist(
    (set, get) => ({
      progress: {},

      getCompletedItems: createSafeGetCompletedItems(get),
      setItemCompleted: createSafeSetItemCompleted(get, set),

      getProgress: (packId: string) => {
        const state = get();
        return state.progress[packId] || null;
      },

      getDayProgress: (packId: string, day: number) => {
        const state = get();
        const progress = { ...state.progress };
        if (!progress[packId]) {
          progress[packId] = createEmptyPackProgress(packId);
          set({ progress });
        }
        if (day < 1 || day > 14) return createEmptyDayProgress();
        return progress[packId].perDay[day - 1] || createEmptyDayProgress();
      },

      setModeCompleted: (packId, day, mode, completed) => {
        const state = get();
        const progress = { ...state.progress };
        if (!progress[packId])
          progress[packId] = createEmptyPackProgress(packId);

        const dayIndex = day - 1;
        const modeKey = `${mode}Done` as keyof DayProgress;
        const cur =
          progress[packId].perDay[dayIndex] || createEmptyDayProgress();
        progress[packId].perDay[dayIndex] = {
          ...cur,
          [modeKey]: completed,
        };

        const d = progress[packId].perDay[dayIndex];
        if (d.vocabDone && d.sentenceDone && d.workbookDone) {
          d.dayCompleted = true;
          progress[packId].completedDays = Math.max(
            progress[packId].completedDays || 0,
            day
          );
        }

        progress[packId].lastStudiedAt = new Date().toISOString();
        set({ progress });
      },

      setDayCompleted: (packId, day) => {
        const state = get();
        const progress = { ...state.progress };
        if (!progress[packId])
          progress[packId] = createEmptyPackProgress(packId);

        const dayIndex = day - 1;
        const cur =
          progress[packId].perDay[dayIndex] || createEmptyDayProgress();
        cur.dayCompleted = true;
        progress[packId].perDay[dayIndex] = cur;

        progress[packId].completedDays = Math.max(
          progress[packId].completedDays || 0,
          day
        );
        progress[packId].lastStudiedAt = new Date().toISOString();
        set({ progress });
      },

      setCurrentDay: (packId, day) => {
        const state = get();
        const progress = { ...state.progress };
        if (!progress[packId])
          progress[packId] = createEmptyPackProgress(packId);

        progress[packId].currentDay = day;
        progress[packId].lastStudiedAt = new Date().toISOString();
        set({ progress });
      },

      getSettings: (packId) => {
        const state = get();
        return state.progress[packId]?.settings || createDefaultSettings();
      },

      updateSettings: (packId, newSettings) => {
        const state = get();
        const progress = { ...state.progress };
        if (!progress[packId])
          progress[packId] = createEmptyPackProgress(packId);

        progress[packId].settings = {
          ...progress[packId].settings,
          ...newSettings,
        };
        set({ progress });
      },

      getItemProgress: (packId, day, itemId) => {
        const state = get();
        const dayProgress = state.getDayProgress(packId, day);
        return dayProgress.completedItems[itemId] || null;
      },

      isModeAvailable: (packId, day, mode) => {
        const state = get();
        const dayProgress = state.getDayProgress(packId, day);
        switch (mode) {
          case "vocab":
            return true;
          case "sentence":
            return !!(dayProgress.vocabDone || dayProgress.sentenceDone);
          case "workbook":
            return !!(
              (dayProgress.vocabDone && dayProgress.sentenceDone) ||
              dayProgress.workbookDone
            );
          default:
            return false;
        }
      },
    }),
    {
      name: "study-progress",
      storage: createJSONStorage(() => localStorage),
      version: 2,
      // 안전 마이그레이션: 데이터 정규화
      migrate: (persisted: any) => {
        try {
          const normalized = normalizeProgress(persisted?.progress || {}, 14);
          return { ...persisted, progress: normalized };
        } catch (e) {
          console.warn("migrate normalize failed", e);
          return persisted || { progress: {} };
        }
      },
    }
  )
);
