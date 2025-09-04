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
  // console.log("selectedPackData", selectedPackData);
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

export const useDay1Progress = (packId: string) => {
  const { getDayProgress, setModeCompleted, setDayCompleted } =
    useStudyProgressStore();

  const dayProgress = getDayProgress(packId, 1);

  const markIntroductionCompleted = useCallback(() => {
    console.log("🔥 Marking Day 1 introduction as completed");
    // introduction을 vocab으로 간주하여 저장
    setModeCompleted(packId, 1, "vocab", true);
    // Day 1은 introduction만 있으므로 바로 완료 처리
    setTimeout(() => {
      setDayCompleted(packId, 1);
    }, 100);
  }, [packId, setModeCompleted, setDayCompleted]);

  return {
    isIntroductionCompleted: dayProgress?.vocabDone || false,
    isDayCompleted: dayProgress?.dayCompleted || false,
    markIntroductionCompleted,
  };
};

// 🎯 일별 진행률 관리 (안전한 버전)
export const useDayProgress = (packId: string, day: number) => {
  const { getDayProgress, setModeCompleted, setDayCompleted, isModeAvailable } =
    useStudyProgressStore();

  // 🔥 실시간 상태 가져오기
  const dayProgress = getDayProgress(packId, day);

  const markModeCompleted = useCallback(
    (day: number, mode: "vocab" | "sentence" | "workbook") => {
      console.log(`🔥 Marking ${mode} as completed for day ${day}`); // 디버깅

      setModeCompleted(packId, day, mode, true);

      // 🔥 상태 업데이트 후 즉시 확인
      setTimeout(() => {
        const updatedProgress = getDayProgress(packId, day);
        console.log("Updated progress:", updatedProgress); // 디버깅

        if (
          updatedProgress?.vocabDone &&
          updatedProgress?.sentenceDone &&
          updatedProgress?.workbookDone
        ) {
          setDayCompleted(packId, day);
        }
      }, 100); // 짧은 지연으로 상태 동기화 보장
    },
    [packId, setModeCompleted, setDayCompleted, getDayProgress]
  );

  return {
    // 🔥 실시간 진행 상태 반환
    dayProgress: {
      vocab: dayProgress?.vocabDone || false,
      sentence: dayProgress?.sentenceDone || false,
      workbook: dayProgress?.workbookDone || false,
      completed: dayProgress?.dayCompleted || false,
    },
    markModeCompleted,
    isModeAccessible: (mode: "vocab" | "sentence" | "workbook") => {
      if (dayProgress?.[`${mode}Done`]) return true;
      if (mode === "vocab") return true;
      if (mode === "sentence") return dayProgress?.vocabDone || false;
      if (mode === "workbook") return dayProgress?.sentenceDone || false;
      return false;
    },
  };
};

export const useCalendarDayStatus = (packId: string, day: number) => {
  const { getDayProgress } = useStudyProgressStore();
  const dayProgress = getDayProgress(packId, day);

  // Day 1은 '학습 방법 소개'만 있으므로, dayCompleted 여부로 완료를 판단합니다.
  const isDay1AndCompleted = day === 1 && dayProgress?.dayCompleted;

  const normalDayCompleted =
    !!dayProgress?.vocabDone &&
    !!dayProgress?.sentenceDone &&
    !!dayProgress?.workbookDone;

  const allCompleted = isDay1AndCompleted || normalDayCompleted;

  // Day 1의 경우 모드 개수를 1로 설정하여 정확한 진행률을 표시합니다.
  const totalModes = day === 1 ? 1 : 3;
  const completedCount = [
    dayProgress?.vocabDone,
    dayProgress?.sentenceDone,
    dayProgress?.workbookDone,
  ].filter(Boolean).length;

  return {
    vocabCompleted: dayProgress?.vocabDone || false,
    sentenceCompleted: dayProgress?.sentenceDone || false,
    workbookCompleted: dayProgress?.workbookDone || false,
    allCompleted, // 🔥 수정된 완료 상태
    completedCount,
    totalModes,
    progressPercentage:
      totalModes > 0 ? Math.round((completedCount / totalModes) * 100) : 0,
  };
};

export const usePackProgressSummary = (packId: string) => {
  const { getProgress } = useStudyProgressStore();
  const packProgress = getProgress(packId);

  if (!packProgress) {
    return {
      totalDays: 14,
      completedDays: 0,
      totalModes: 42,
      completedModes: 0,
      overallProgress: 0,
    };
  }

  let completedModes = 0;
  let completedDays = 0;

  packProgress.perDay.forEach((day) => {
    if (day.vocabDone) completedModes++;
    if (day.sentenceDone) completedModes++;
    if (day.workbookDone) completedModes++;
    if (day.dayCompleted) completedDays++;
  });

  return {
    totalDays: 14,
    completedDays,
    totalModes: 42,
    completedModes,
    overallProgress: Math.round((completedModes / 42) * 100),
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
