// src/shared/hooks/useAppHooks.ts - hooks를 별도 파일로 분리
import { useAppContext } from "@/providers/AppProvider";

export function useAppState() {
  const { state } = useAppContext();
  return state;
}

export function useAppDispatch() {
  const { dispatch } = useAppContext();
  return dispatch;
}

export function useAppSelector<T>(selector: (state: AppState) => T): T {
  const { state } = useAppContext();
  return selector(state);
}

// 편의 hooks
export function useSentences() {
  return useAppSelector((state) => state.sentences);
}

export function useDailyQueue() {
  return useAppSelector((state) => state.dailyQueue);
}
