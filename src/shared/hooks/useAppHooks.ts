// src/shared/hooks/useAppHooks.ts
import { useAuthStore } from "@/stores/authStore";
import { useDailyPlanStore } from "@/stores/dailyPlanStore";
import { useLearningStore } from "@/stores/learningStore";

// 인증 관련 hooks
export function useAuth() {
  return useAuthStore();
}

export function useIsAuthenticated() {
  return useAuthStore((state) => state.isAuthenticated);
}

export function useUser() {
  return useAuthStore((state) => state.user);
}

// 학습 관련 hooks
export function useDailyPlan() {
  const store = useDailyPlanStore();
  return {
    ...store,
    // 모든 액션이 포함되어야 함
    initializePlan: store.initializePlan,
    startDay: store.startDay,
    completeStep: store.completeStep,
    completeDay: store.completeDay,
    resetPlan: store.resetPlan,
    getCurrentDayItems: store.getCurrentDayItems,
    isCompletedDay: store.isCompletedDay,
  };
}

export function useSentences() {
  return useDailyPlanStore((state) => state.todayLesson?.steps[0]?.items || []);
}

export function useDailyQueue() {
  return useDailyPlanStore((state) => state.currentPlan?.lessons || []);
}

// 편의 selector hooks
export function useCurrentLesson() {
  return useDailyPlanStore((state) => state.todayLesson);
}

export function useLearningProgress() {
  return useDailyPlanStore((state) => ({
    completed: state.completedDays?.length || 0,
    total: state.currentPlan?.totalDays || 14,
    progress: state.currentPlan
      ? ((state.completedDays?.length || 0) / state.currentPlan.totalDays) * 100
      : 0,
  }));
}

// 완료된 날짜 확인 헬퍼
export function useCompletedDays() {
  return useDailyPlanStore((state) => state.completedDays || []);
}

export function useLearningSession() {
  const { studyMode, setStudyMode } = useLearningStore();
  const { todayLesson, currentPlan } = useDailyPlan();

  return {
    studyMode,
    setStudyMode,
    currentLesson: todayLesson,
    currentPlan,
  };
}
