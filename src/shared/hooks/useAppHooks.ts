// src/shared/hooks/useAppHooks.ts
import React, { useCallback } from "react";
import { useAppStore } from "@/stores/appStore";
import { useStudyProgressStore } from "@/stores/studyProgressStore";
import type { StudySettings, PackData } from "@/types";

// Core 모드 유니온(스토어와 일치)
type Mode = "vocab" | "sentence" | "workbook";

// ---------- 인증 ----------
export function useAuth() {
  const { user, isAuthenticated, loading, login, logout } = useAppStore();
  return { user, isAuthenticated, loading, login, logout };
}
export function useIsAuthenticated() {
  return useAppStore((s) => s.isAuthenticated);
}
export function useUser() {
  return useAppStore((s) => s.user);
}

// ---------- 팩 선택 ----------
export function useSelectedPack() {
  const { selectedPackId, selectedPackData } = useAppStore();
  return {
    packId: selectedPackId,
    packData: selectedPackData,
    isPackSelected: !!selectedPackId,
  };
}

// ---------- 일자 ----------
export function useCurrentDay() {
  const { currentDay, setCurrentDay, selectedPackData } = useAppStore();
  const totalDays =
    selectedPackData?.learningPlan?.days?.length ??
    selectedPackData?.learningPlan?.totalDays ??
    14;

  const clamp = (d: number) => Math.min(Math.max(d, 1), totalDays);

  const nextDay = () => {
    const next = clamp(currentDay + 1);
    setCurrentDay(next);
    return next;
  };
  const previousDay = () => {
    const prev = clamp(currentDay - 1);
    setCurrentDay(prev);
    return prev;
  };

  return {
    currentDay,
    setCurrentDay,
    nextDay,
    previousDay,
    isFirstDay: currentDay === 1,
    isLastDay: currentDay === totalDays,
    totalDays,
  };
}

// ---------- 진행률 ----------
export function useLearningProgress(packId: string) {
  const { getPackProgress } = useStudyProgressStore();
  const p = getPackProgress(packId);
  const days = p ? Object.values(p.progressByDay) : [];
  const totalDays = days.length || 14;
  const completedDays = days.filter((d) => d.isCompleted).length;
  return {
    completedDaysIndexes: days.filter((d) => d.isCompleted).map((d) => d.day),
    getCompletionRate: () =>
      totalDays > 0 ? (completedDays / totalDays) * 100 : 0,
    currentStreak: completedDays,
    totalDays,
  };
}

// ---------- Day 진행 ----------
export const useDayProgress = (packId: string, day: number) => {
  const { selectedPackData } = useAppStore();
  const { getDayProgress, setModeCompleted } = useStudyProgressStore();

  const dp = getDayProgress(packId, day);
  const cm = (dp?.completedModes ?? {}) as Record<Mode, boolean>;

  const markModeCompleted = useCallback(
    (mode: Mode) => {
      if (!["vocab", "sentence", "workbook"].includes(mode)) {
        console.warn("Invalid mode:", mode);
        return;
      }
      const safeDay = Number(day);
      console.log(`🔥 Marking ${mode} as completed for day ${safeDay}`);
      setModeCompleted(packId, safeDay, mode, selectedPackData as PackData);
    },
    [packId, day, setModeCompleted, selectedPackData]
  );

  return {
    dayProgress: {
      vocab: !!cm.vocab,
      sentence: !!cm.sentence,
      workbook: !!cm.workbook,
      completed: !!dp?.isCompleted,
    },
    markModeCompleted,
  };
};

// ---------- 캘린더 셀 ----------
export const useCalendarDayStatus = (
  packId: string,
  day: number,
  plan?: PackData
) => {
  const { getDayProgress } = useStudyProgressStore();
  const dp = getDayProgress(packId, day);
  const modes = (dp?.completedModes ?? {}) as Record<Mode, boolean>;
  const required =
    plan?.learningPlan?.days
      ?.find((d) => d.day === day)
      ?.modes?.map((m) => m.type as Mode)
      ?.filter((t) => t === "vocab" || t === "sentence" || t === "workbook") ??
    (["vocab", "sentence", "workbook"] as Mode[]);
  const completedCount = required.filter((t) => !!modes[t]).length;

  return {
    allCompleted: !!dp?.isCompleted || completedCount === required.length,
    progressPercentage:
      required.length > 0
        ? Math.round((completedCount / required.length) * 100)
        : 0,
  };
};

// ---------- 팩 요약 ----------
export const usePackProgressSummary = (packId: string) => {
  const { getPackProgress } = useStudyProgressStore();
  const p = getPackProgress(packId);
  const days = p ? Object.values(p.progressByDay) : [];
  const totalDays = days.length || 14;
  const completedDays = days.filter((d) => d.isCompleted).length;
  return {
    totalDays,
    completedDays,
    overallProgress:
      totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0,
  };
};

// ---------- 학습 설정 ----------
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

// ---------- 현재 모드 ----------
export function useStudyMode(packId: string, day?: number) {
  const { currentDay } = useCurrentDay();
  const finalDay = day || currentDay;

  // packId 없을 때도 훅은 항상 호출되게
  const { dayProgress } = useDayProgress(packId || "default", finalDay);

  const getCurrentMode = (): Mode => {
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

// ---------- 선택된 팩의 현재 모드 ----------
export function useCurrentPackStudyMode(day?: number) {
  const { packId } = useSelectedPack();
  const { currentDay } = useCurrentDay();
  const studyModeResult = useStudyMode(packId || "", day || currentDay);

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

// ---------- 아이템 진행 ----------
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
      const progress = getItemProgress(packId, day, itemId) as any;
      // store 구조: { isCompleted, lastStudied }
      return !!progress?.isCompleted || !!progress?.completed;
    },
    [packId, day, getItemProgress]
  );

  const getCompletedCount = useCallback(
    (itemIds: string[]) => {
      const items = getCompletedItems(packId, day) as Record<
        string,
        { isCompleted?: boolean; completed?: boolean }
      >;
      return itemIds.filter(
        (id) => !!items?.[id]?.isCompleted || !!items?.[id]?.completed
      ).length;
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
