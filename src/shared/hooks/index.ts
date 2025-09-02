// src/shared/hooks/index.ts
export { useTTS } from "./useTTS";
export { useSwipeGesture } from "./useSwipeGesture";
export { useDebouncedValue } from "./useDebouncedValue";

// 🎯 새로운 구조의 hooks
export {
  useAuth,
  useIsAuthenticated,
  useUser,
  useStudyData,
  useLearningProgress,
  useStudySettings,
  useCurrentPack,
  useAvailablePacks,
} from "./useAppHooks";
