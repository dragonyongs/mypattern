import React, { createContext, useContext, useReducer, useEffect } from "react";
import {
  Sentence,
  Pattern,
  Chunk,
  Settings,
  PracticeSession,
  defaultSettings,
} from "@/entities";
import { loadFromStorage, saveToStorage } from "./storage";
import { generateDailyQueue } from "@/shared/lib/schedule";
import { loadPacksOnce } from "@/features/learn/services/loadPacks";

interface AppState {
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

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload };

    case "SET_ERROR":
      return { ...state, error: action.payload, loading: false };

    case "LOAD_DATA":
      return {
        ...state,
        ...action.payload,
        loading: false,
        error: null,
      };

    case "UPDATE_SENTENCE": {
      const updatedSentences = state.sentences.map((s) =>
        s.id === action.payload.id ? action.payload : s
      );
      return {
        ...state,
        sentences: updatedSentences,
        dailyQueue: generateDailyQueue(updatedSentences),
      };
    }

    case "UPDATE_SENTENCES": {
      return {
        ...state,
        sentences: action.payload,
        dailyQueue: generateDailyQueue(action.payload),
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
      return {
        ...initialState,
        loading: false,
      };

    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    const loadData = async () => {
      try {
        dispatch({ type: "SET_LOADING", payload: true });
        const savedData = loadFromStorage();
        if (savedData) {
          dispatch({ type: "LOAD_DATA", payload: savedData });
        } else {
          dispatch({ type: "SET_LOADING", payload: false });
        }
        // 팩 주입은 저장소 유무와 관계없이 1회 수행
        await loadPacksOnce();
        dispatch({ type: "REFRESH_DAILY_QUEUE" });
      } catch (e) {
        console.error(e);
        dispatch({ type: "SET_ERROR", payload: "데이터 로딩에 실패했습니다." });
      }
    };
    loadData();
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppState must be used within AppProvider");
  }
  return context;
}

// 편의 훅들
export function useAppDispatch() {
  const { dispatch } = useAppState();
  return dispatch;
}

export function useAppSelector<T>(selector: (state: AppState) => T): T {
  const { state } = useAppState();
  return selector(state);
}
