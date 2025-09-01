// src/providers/AppProvider.tsx
import React, { createContext, useEffect, useMemo, useReducer } from "react";
import type {
  Sentence,
  Pattern,
  Chunk,
  Settings,
  PracticeSession,
} from "@/entities";
import { defaultSettings } from "@/entities";
import { loadFromStorage, saveToStorage } from "./storage";
import { generateDailyQueue } from "@/shared/lib/schedule";
import { logger } from "@/shared/utils/logger";
import { usePackStore } from "@/stores/packStore";
import { useDailyPlanStore } from "@/stores/dailyPlanStore";

// ---------- State / Action ----------
export interface AppState {
  sentences: Sentence[];
  patterns: Pattern[];
  chunks: Chunk[];
  settings: Settings;
  sessions: PracticeSession[];
  dailyQueue: Sentence[];
  loading: boolean;
  error: string | null;
}

type AppAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "LOAD_DATA"; payload: Partial<AppState> }
  | { type: "UPDATE_SENTENCE"; payload: Sentence }
  | { type: "UPDATE_SENTENCES"; payload: Sentence[] }
  | { type: "UPDATE_SETTINGS"; payload: Partial<Settings> }
  | { type: "ADD_SESSION"; payload: PracticeSession }
  | { type: "REFRESH_DAILY_QUEUE" }
  | { type: "RESET_DATA" };

// ---------- Initial ----------
const initialState: AppState = {
  sentences: [],
  patterns: [],
  chunks: [],
  settings: defaultSettings,
  sessions: [],
  dailyQueue: [],
  loading: true,
  error: null,
};

// ---------- Reducer ----------
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload };

    case "SET_ERROR":
      return { ...state, error: action.payload, loading: false };

    case "LOAD_DATA": {
      const merged = {
        ...state,
        ...action.payload,
      };
      const baseSentences = (merged.sentences ?? state.sentences) as Sentence[];
      return {
        ...merged,
        dailyQueue: generateDailyQueue(baseSentences),
        loading: false,
        error: null,
      };
    }

    case "UPDATE_SENTENCE": {
      const updated = state.sentences.map((s) =>
        s.id === action.payload.id ? action.payload : s
      );
      return {
        ...state,
        sentences: updated,
        dailyQueue: generateDailyQueue(updated),
      };
    }

    case "UPDATE_SENTENCES": {
      const updated = action.payload;
      return {
        ...state,
        sentences: updated,
        dailyQueue: generateDailyQueue(updated),
      };
    }

    case "UPDATE_SETTINGS":
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
      };

    case "ADD_SESSION":
      return {
        ...state,
        sessions: [...state.sessions, action.payload],
      };

    case "REFRESH_DAILY_QUEUE":
      return {
        ...state,
        dailyQueue: generateDailyQueue(state.sentences),
      };

    case "RESET_DATA":
      return { ...initialState, loading: false };

    default:
      return state;
  }
}

// ---------- Context ----------
export const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

// ---------- Data Restoration Component ----------
const DataRestoration: React.FC = () => {
  const selectedPack = usePackStore((state) => state.selectedPack);
  const currentPlan = useDailyPlanStore((state) => state.currentPlan);
  const initializePlan = useDailyPlanStore((state) => state.initializePlan);

  useEffect(() => {
    const restoreData = async () => {
      // 팩은 있는데 학습 계획이 없는 경우 복원
      if (selectedPack && !currentPlan) {
        console.log(
          "🔥 Restoring daily plan from selected pack:",
          selectedPack.title
        );

        try {
          initializePlan(
            selectedPack.id,
            selectedPack.title,
            selectedPack.items
          );
        } catch (error) {
          console.error("Failed to restore daily plan:", error);
        }
      }
    };

    // persist 복원 대기를 위한 지연
    const timer = setTimeout(restoreData, 200);
    return () => clearTimeout(timer);
  }, [selectedPack, currentPlan, initializePlan]);

  return null;
};

// ---------- Provider Component ----------
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // 초기 로드: localStorage → 상태 반영
  useEffect(() => {
    const load = async () => {
      try {
        dispatch({ type: "SET_LOADING", payload: true });
        const saved = loadFromStorage();

        if (saved) {
          dispatch({
            type: "LOAD_DATA",
            payload: {
              sentences: (saved as any).sentences ?? [],
              patterns: (saved as any).patterns ?? [],
              chunks: (saved as any).chunks ?? [],
              settings: (saved as any).settings ?? defaultSettings,
              sessions: (saved as any).sessions ?? [],
            },
          });
        } else {
          dispatch({ type: "SET_LOADING", payload: false });
          dispatch({ type: "REFRESH_DAILY_QUEUE" });
        }
      } catch (e) {
        logger.error("AppProvider load error:", e);
        dispatch({
          type: "SET_ERROR",
          payload: "데이터 로딩에 실패했습니다.",
        });
      }
    };

    load();
  }, []);

  // 변경사항 지속 저장
  useEffect(() => {
    if (state.loading) return;

    try {
      saveToStorage({
        sentences: state.sentences,
        patterns: state.patterns,
        chunks: state.chunks,
        settings: state.settings,
        sessions: state.sessions,
      } as any);
    } catch (error) {
      logger.error("Failed to save to storage:", error);
    }
  }, [
    state.sentences,
    state.patterns,
    state.chunks,
    state.settings,
    state.sessions,
    state.loading,
  ]);

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <AppContext.Provider value={value}>
      <DataRestoration />
      {children}
    </AppContext.Provider>
  );
}
