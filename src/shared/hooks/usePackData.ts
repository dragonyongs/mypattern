// src/hooks/usePackData.ts - AppStore 기반으로 단순화
import { useMemo } from "react";
import { useAppStore } from "@/stores/appStore";

export function useSelectedPack() {
  const { selectedPackId, selectedPackData } = useAppStore();

  return {
    packId: selectedPackId,
    packData: selectedPackData,
    isPackSelected: !!selectedPackId,
  };
}

export function useCurrentDayData() {
  const { selectedPackData, currentDay } = useAppStore();

  const dayData = useMemo(() => {
    if (!selectedPackData?.days) return null;
    return selectedPackData.days.find((d: any) => d.day === currentDay);
  }, [selectedPackData, currentDay]);

  return {
    dayData,
    vocabularies: dayData?.vocabularies || [],
    sentences: dayData?.sentences || [],
    workbook: dayData?.workbook || [],
    category: dayData?.category || `Day ${currentDay}`,
    isLoading: false,
    error: null,
  };
}

// 특정 날짜 데이터 (캘린더용)
export function useDayData(day: number) {
  const { selectedPackData } = useAppStore();

  const dayData = useMemo(() => {
    if (!selectedPackData?.days) return null;
    return selectedPackData.days.find((d: any) => d.day === day);
  }, [selectedPackData, day]);

  return dayData;
}

// 기존 호환성을 위한 훅들
export function useVocabularyData() {
  const { vocabularies, category } = useCurrentDayData();
  return {
    vocabularies,
    loading: false,
    error: null,
    category,
    totalCount: vocabularies.length,
  };
}

export function useSentenceData() {
  const { sentences, category } = useCurrentDayData();
  return {
    sentences,
    loading: false,
    error: null,
    category,
    totalCount: sentences.length,
  };
}

export function useWorkbookData() {
  const { workbook, category } = useCurrentDayData();
  return {
    workbook,
    loading: false,
    error: null,
    category,
    totalCount: workbook.length,
  };
}
