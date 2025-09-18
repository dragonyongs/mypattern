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

  const getCorrectAnswer = useCallback((q: WorkbookItem) => {
    return (q as any).correctAnswer || (q as any).answer || "";
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
    const selected: Record<number, string> = {};

    workbook.forEach((item, index) => {
      const p = getItemProgress(packId, dayNumber, item.id);
      if (p === null) return; // 미시도 [그대로 패스]

      answered.add(index);
      const isCorrect = p.isCompleted === true;
      results[index] = isCorrect;
      if (isCorrect) {
        selected[index] = getCorrectAnswer(item); // ✅ 정답 선택 복원
        correct.add(index);
      }
    });

    return { answered, correct, results, selected }; // ✅ selected 포함
  }, [workbook, getItemProgress, packId, dayNumber, getCorrectAnswer]);

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
