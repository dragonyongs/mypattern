// src/shared/hooks/useAppHooks.ts
import React, { useCallback } from "react";
import { useAppStore } from "@/stores/appStore";
import { useStudyProgressStore } from "@/stores/studyProgressStore";
import { StudySettings } from "@/types"; // 🎯 이미 정의된 타입 import

// 🎯 인증 관련 훅들
export function useAuth() {
  const { user, isAuthenticated, loading, login, logout } = useAppStore();
  return {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
  };
}

export function useIsAuthenticated() {
  return useAppStore((state) => state.isAuthenticated);
}

export function useUser() {
  return useAppStore((state) => state.user);
}

// 🎯 팩 관련 훅들
export function useSelectedPack() {
  const { selectedPackId, selectedPackData } = useAppStore();
  return {
    packId: selectedPackId,
    packData: selectedPackData,
    isPackSelected: !!selectedPackId,
  };
}

// 🎯 학습 진행 상태 관리
export function useCurrentDay() {
  const { currentDay, setCurrentDay } = useAppStore();
  const nextDay = () => {
    const next = Math.min(currentDay + 1, 14);
    setCurrentDay(next);
    return next;
  };

  const previousDay = () => {
    const prev = Math.max(currentDay - 1, 2); // Day 2가 최소
    setCurrentDay(prev);
    return prev;
  };

  return {
    currentDay,
    setCurrentDay,
    nextDay,
    previousDay,
    isFirstDay: currentDay === 2,
    isLastDay: currentDay === 14,
  };
}

// 🎯 학습 진행률 관리
export function useLearningProgress() {
  const { completedDays, markDayCompleted, isDayCompleted } = useAppStore();
  const getCompletionRate = () => {
    return (completedDays.length / 14) * 100;
  };

  return {
    completedDays,
    markDayCompleted,
    isDayCompleted,
    getCompletionRate,
    currentStreak: completedDays.length,
  };
}

// 🎯 일별 진행률 관리 (안전한 버전)
export const useDayProgress = (packId: string, day: number) => {
  const { getDayProgress, setModeCompleted, setDayCompleted, isModeAvailable } =
    useStudyProgressStore();

  const dayProgress = getDayProgress(packId, day);

  const markModeCompleted = (
    day: number,
    mode: "vocab" | "sentence" | "workbook"
  ) => {
    setModeCompleted(packId, day, mode, true);
  };

  const markDayCompleted = (day: number) => {
    setDayCompleted(packId, day);
  };

  const isModeAccessible = (mode: "vocab" | "sentence" | "workbook") => {
    return isModeAvailable(packId, day, mode);
  };

  return {
    dayProgress: {
      vocab: dayProgress?.vocabDone || false,
      sentence: dayProgress?.sentenceDone || false,
      workbook: dayProgress?.workbookDone || false,
      completed: dayProgress?.dayCompleted || false,
    },
    markModeCompleted,
    markDayCompleted,
    isModeAccessible,
  };
};

// 🎯 학습 설정 훅
export const useStudySettings = (packId: string) => {
  const { getSettings, updateSettings } = useStudyProgressStore();

  const settings = getSettings(packId);

  const updateSetting = (key: keyof StudySettings, value: any) => {
    updateSettings(packId, { [key]: value });
  };

  return {
    settings,
    updateSetting,
    updateSettings: (newSettings: Partial<StudySettings>) =>
      updateSettings(packId, newSettings),
  };
};

// 🎯 학습 모드 관리 (수정된 버전 - packId 추가)
export function useStudyMode(packId: string, day?: number) {
  const { currentDay } = useCurrentDay();
  const finalDay = day || currentDay;

  // 🔥 packId가 빈 문자열이면 기본값 처리
  const { dayProgress } = useDayProgress(packId || "default", finalDay);

  const getCurrentMode = (): "vocab" | "sentence" | "workbook" => {
    if (!dayProgress.vocab) return "vocab";
    if (!dayProgress.sentence) return "sentence";
    return "workbook";
  };

  return {
    studyMode: getCurrentMode(),
    isVocabCompleted: dayProgress.vocab,
    isSentenceCompleted: dayProgress.sentence,
    isWorkbookCompleted: dayProgress.workbook,
  };
}

// 🎯 현재 선택된 팩의 학습 모드 (편의 훅)
export function useCurrentPackStudyMode(day?: number) {
  const { packId } = useSelectedPack();
  const { currentDay } = useCurrentDay();

  // 🔥 기본값으로 빈 문자열 사용 (Hook 항상 호출)
  const studyModeResult = useStudyMode(packId || "", day || currentDay);

  // 🔥 packId가 없으면 기본값으로 오버라이드
  if (!packId) {
    return {
      studyMode: "vocab" as const,
      isVocabCompleted: false,
      isSentenceCompleted: false,
      isWorkbookCompleted: false,
    };
  }

  return studyModeResult;
}

// 🎯 아이템별 학습 진행 상태 관리 훅
export const useItemProgress = (packId: string, day: number) => {
  const { setItemCompleted, getItemProgress, getCompletedItems } =
    useStudyProgressStore();

  const markItemCompleted = useCallback(
    (itemId: string) => {
      setItemCompleted(packId, day, itemId, true);
    },
    [packId, day, setItemCompleted]
  );

  const isItemCompleted = useCallback(
    (itemId: string) => {
      const progress = getItemProgress(packId, day, itemId);
      return progress?.completed || false;
    },
    [packId, day, getItemProgress]
  );

  const getCompletedCount = useCallback(
    (itemIds: string[]) => {
      const completedItems = getCompletedItems(packId, day);
      return itemIds.filter((id) => completedItems[id]?.completed).length;
    },
    [packId, day, getCompletedItems]
  );

  return {
    markItemCompleted,
    isItemCompleted,
    getCompletedCount,
    getCompletedItems: () => getCompletedItems(packId, day),
  };
};
