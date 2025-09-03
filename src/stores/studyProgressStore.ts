// src/stores/studyProgressStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// interface StudySettings {
//   showMeaningEnabled: boolean;
//   autoProgressEnabled: boolean;
//   studyMode: "immersive" | "assisted";
// }

// type DayProgress = {
//   completedItems: Record<
//     string,
//     { itemId: string; completed: boolean; completedAt: string }
//   >;
//   // (필요하면 다른 필드도 여기에 추가)
// };

// type PackProgress = {
//   packId: string;
//   perDay: DayProgress[];
//   lastStudiedAt?: string | null;
// };

// interface ItemProgress {
//   itemId: string;
//   completed: boolean;
//   completedAt: string;
// }

// interface StudyProgressState {
//   progress: Record<string, PackProgress>;

//   // 진행 상태 조회
//   getProgress: (packId: string) => PackProgress | null;
//   getDayProgress: (packId: string, day: number) => DayProgress;

//   // 진행 상태 업데이트
//   setModeCompleted: (
//     packId: string,
//     day: number,
//     mode: "vocab" | "sentence" | "workbook",
//     completed: boolean
//   ) => void;
//   setDayCompleted: (packId: string, day: number) => void;
//   setCurrentDay: (packId: string, day: number) => void;

//   // 설정 관리
//   getSettings: (packId: string) => StudySettings;
//   updateSettings: (packId: string, settings: Partial<StudySettings>) => void;

//   // 접근 권한 확인
//   isModeAvailable: (
//     packId: string,
//     day: number,
//     mode: "vocab" | "sentence" | "workbook"
//   ) => boolean;

//   setItemCompleted: (
//     packId: string,
//     day: number,
//     itemId: string,
//     completed: boolean
//   ) => void;

//   getItemProgress: (
//     packId: string,
//     day: number,
//     itemId: string
//   ) => ItemProgress | null;

//   getCompletedItems: (
//     packId: string,
//     day: number
//   ) => Record<string, ItemProgress>;
// }

// -----------------------------
// Study progress 관련 공용 타입 (붙여넣기)
// -----------------------------

/** 학습 설정(간단한 예시 — 필요하면 속성 추가) */
export type StudySettings = {
  repeatCount?: number;
  ttsRate?: number;
  autoAdvance?: boolean;
  [k: string]: any;
};

/** 하루 단위 진행 정보 */
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

/** 팩(코스) 단위 진행 정보 */
export interface PackProgress {
  packId: string;
  perDay: DayProgress[]; // day 1..N (N은 프로젝트 규칙에 따름)
  currentDay?: number;
  completedDays?: number;
  lastStudiedAt?: string | null;
  settings?: StudySettings;
  [k: string]: any;
}

/** 전체 스토어 상태 / API 타입 (필요한 함수 시그니처 포함) */
export interface StudyProgressState {
  progress: Record<string, PackProgress>;
  getCompletedItems: (
    packId?: string,
    day?: number
  ) => Record<string, any> | any[];
  setItemCompleted: (
    packId: string,
    day: number,
    itemId: string,
    completed: boolean
  ) => void;
  getProgress: (packId: string) => PackProgress | null;
  getDayProgress: (packId: string, day: number) => DayProgress;
  setModeCompleted: (
    packId: string,
    day: number,
    mode: "vocab" | "sentence" | "workbook",
    completed: boolean
  ) => void;
  setDayCompleted: (packId: string, day: number) => void;
  setCurrentDay: (packId: string, day: number) => void;
  getSettings: (packId: string) => StudySettings;
  updateSettings: (packId: string, newSettings: Partial<StudySettings>) => void;
  getItemProgress: (packId: string, day: number, itemId: string) => any | null;
  isModeAvailable: (
    packId: string,
    day: number,
    mode: "vocab" | "sentence" | "workbook"
  ) => boolean;
  [k: string]: any;
}

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
    lastStudiedAt: null,
  };
}

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
        if (!progress[packId]) {
          progress[packId] = createEmptyPackProgress(packId);
        }

        const dayIndex = day - 1;
        const modeKey = `${mode}Done` as keyof DayProgress;
        progress[packId].perDay[dayIndex] = {
          ...progress[packId].perDay[dayIndex],
          [modeKey]: completed,
        };

        const dayProgress = progress[packId].perDay[dayIndex];
        if (
          dayProgress.vocabDone &&
          dayProgress.sentenceDone &&
          dayProgress.workbookDone
        ) {
          dayProgress.dayCompleted = true;
          progress[packId].completedDays = Math.max(
            progress[packId].completedDays || 0,
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
          progress[packId].completedDays || 0,
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

      // 🎯 특정 아이템 진행 상태 조회
      getItemProgress: (packId: string, day: number, itemId: string) => {
        const state = get();
        const dayProgress = state.getDayProgress(packId, day);
        return dayProgress.completedItems[itemId] || null;
      },

      // 🎯 모드 접근 가능성 체크
      isModeAvailable: (
        packId: string,
        day: number,
        mode: "vocab" | "sentence" | "workbook"
      ): boolean => {
        const state = get();
        const dayProgress = state.getDayProgress(packId, day);
        if (!dayProgress) return false;
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
      name: "study-progress", // localStorage key
      // rehydrate 완료 직후에 호출되어 저장된 state를 보정할 수 있음
      onRehydrateStorage: () => (state) => {
        try {
          if (state && state.progress) {
            // 정규화만 수행하고 set 호출은 제거
            const normalized = normalizeProgress(state.progress, 14);
            // 직접 state 수정
            state.progress = normalized;
            console.info("[store] progress normalized after rehydrate");
          }
        } catch (e) {
          console.warn("onRehydrateStorage normalize failed", e);
        }
      },
    }
  )
);

/** progress 객체 정규화(마이그레이션/보호용) */
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
  });

  return normalized;
}

/** 내부용 안전한 읽기 (state에서 pack/day의 completedItems 객체를 안전히 가져옴) */
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
  } catch (e) {
    console.warn("safeGetCompletedItemsFromState error", e);
    return {};
  }
}

/**
 * 팩토리: getCompletedItems 함수 생성
 * 사용법: getCompletedItems: createSafeGetCompletedItems(get)
 */
export function createSafeGetCompletedItems(get: any) {
  return (packId?: string, day?: number) => {
    try {
      const state = typeof get === "function" ? get() : get;
      return safeGetCompletedItemsFromState(state, packId, day);
    } catch (e) {
      console.warn("createSafeGetCompletedItems error", e);
      return {};
    }
  };
}

/**
 * 팩토리: setItemCompleted 함수 생성 (방어적)
 * 사용법: setItemCompleted: createSafeSetItemCompleted(get, set)
 */
export function createSafeSetItemCompleted(get: any, set: any) {
  return (packId: string, day: number, itemId: string, completed: boolean) => {
    try {
      const state = typeof get === "function" ? get() : get;
      const prevProgress: Progress =
        state && state.progress && typeof state.progress === "object"
          ? { ...state.progress }
          : {};

      // pack 존재 보장
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

      // 안전한 할당 (기존 데이터 유지)
      dayProgress.completedItems[itemId] = {
        ...(dayProgress.completedItems[itemId] || {}),
        itemId,
        completed,
        completedAt: new Date().toISOString(),
      };

      // lastStudiedAt 갱신
      prevProgress[packId].lastStudiedAt = new Date().toISOString();

      // 저장 (zustand set 함수 사용 가정)
      if (typeof set === "function") {
        set({ progress: prevProgress });
      } else {
        console.warn(
          "createSafeSetItemCompleted: `set` is not a function - cannot persist"
        );
      }
    } catch (err) {
      console.error("createSafeSetItemCompleted failed", err);
    }
  };
}
