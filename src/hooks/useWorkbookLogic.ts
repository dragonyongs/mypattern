// src/hooks/useWorkbookLogic.ts
import { useCallback, useEffect } from "react";
import type { WorkbookItem } from "@/types/workbook.types";
import { useStudyProgressStore } from "@/stores/studyProgressStore";

export const useWorkbookLogic = (
  packId: string,
  dayNumber: number,
  workbook: WorkbookItem[]
) => {
  const {
    setItemCompleted,
    getItemProgress,
    clearItemProgress: clearItemProgressInStore,
  } = useStudyProgressStore();

  const getCorrectAnswer = useCallback((question: WorkbookItem) => {
    return (question as any).correctAnswer || (question as any).answer || "";
  }, []);

  const saveProgress = useCallback(
    (index: number, isCorrect: boolean) => {
      const item = workbook[index];
      if (item) {
        try {
          setItemCompleted(packId, dayNumber, item.id, isCorrect);
        } catch (error) {
          console.warn("[WorkbookLogic] Failed to save progress:", error);
        }
      }
    },
    [packId, dayNumber, workbook, setItemCompleted]
  );

  // 🔥 복원 로직 완전 수정
  const restoreProgress = useCallback(() => {
    const answered = new Set<number>();
    const correct = new Set<number>();
    const results: Record<number, boolean> = {};

    workbook.forEach((item, index) => {
      const p = getItemProgress(packId, dayNumber, item.id);

      // p가 null이면 기록 자체가 없으므로 "미시도" 상태. 아무것도 하지 않음.
      if (p === null) {
        return;
      }

      // p가 객체면 시도한 것으로 간주
      answered.add(index);
      const isCorrect = p.isCompleted === true;
      results[index] = isCorrect;
      if (isCorrect) {
        correct.add(index);
      }
    });

    return { answered, correct, results };
  }, [workbook, getItemProgress, packId, dayNumber]);

  // 🔥 개별 아이템 삭제 함수 추가 (다시 풀기용)
  const clearItemProgress = useCallback(
    (index: number) => {
      const item = workbook[index];
      if (item) {
        try {
          // 저장소에서 해당 아이템의 기록을 완전히 삭제
          clearItemProgressInStore(packId, dayNumber, item.id);
        } catch (error) {
          console.warn("[WorkbookLogic] Failed to clear progress:", error);
        }
      }
    },
    [packId, dayNumber, workbook, clearItemProgressInStore]
  );

  useEffect(() => {
    if (!workbook.length) return;
    const sample = workbook.slice(0, 3).map((item, i) => ({
      index: i,
      id: item.id,
      progress: getItemProgress(packId, dayNumber, item.id),
    }));
  }, [workbook, packId, dayNumber, getItemProgress]);

  return {
    getCorrectAnswer,
    saveProgress,
    restoreProgress,
    clearItemProgress,
  };
};
