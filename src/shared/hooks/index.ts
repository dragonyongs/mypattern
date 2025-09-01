// src/shared/hooks/index.ts
export { useTTS } from "./useTTS";
export { useSwipeGesture } from "./useSwipeGesture";

export {
  // useAppState,
  // useAppDispatch,
  // useAppSelector,
  useSentences,
  useDailyQueue,

  // 🔥 새로 추가된 exports
  useAuth,
  useIsAuthenticated,
  useUser,
  useDailyPlan, // 이것이 누락되어 있었음
  useCurrentLesson,
  useLearningProgress,
  useCompletedDays,
} from "./useAppHooks";

export { useVoiceRecorder } from "./useVoiceRecorder";
export { useDebouncedValue } from "./useDebouncedValue";
