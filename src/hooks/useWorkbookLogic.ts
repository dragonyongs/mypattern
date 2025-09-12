// src/hooks/useWorkbookLogic.ts
import { useCallback } from "react";
import type { WorkbookItem } from "@/types/workbook.types";
import { useStudyProgressStore } from "@/stores/studyProgressStore";

export const useWorkbookLogic = (
  packId: string,
  dayNumber: number,
  workbook: WorkbookItem[]
) => {
  const { setItemCompleted, getItemProgress } = useStudyProgressStore();

  const getCorrectAnswer = useCallback((question: WorkbookItem) => {
    return question.correctAnswer || question.answer || "";
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

  // src/hooks/useWorkbookLogic.ts (restoreProgress만 교체)
  const restoreProgress = useCallback(() => {
    const answered = new Set<number>();
    const correct = new Set<number>();
    const results: Record<number, boolean> = {};

    workbook.forEach((item, index) => {
      const p = getItemProgress(packId, dayNumber, item.id);

      // 시도 여부 확인
      const wasAnswered =
        !!p && (typeof p.isCompleted === "boolean" || !!p.lastStudied);

      if (!wasAnswered) return;

      answered.add(index); // 회색 칩 (시도함)

      const isCorrect = p.isCompleted === true;
      results[index] = isCorrect; // 🔥 실제 정답 여부 저장

      if (isCorrect) {
        correct.add(index); // 초록 칩 (정답)
      }
    });

    console.log(`🔄 복원: answered=${answered.size}, correct=${correct.size}`);
    return { answered, correct, results };
  }, [workbook, getItemProgress, packId, dayNumber]);

  const clearItemProgress = useCallback(
    (index: number) => {
      const item = workbook[index];
      if (item) {
        try {
          setItemCompleted(packId, dayNumber, item.id, false);
          console.log(`🗑️ Cleared progress: ${item.id}`);
        } catch (error) {
          console.warn("[WorkbookLogic] Failed to clear progress:", error);
        }
      }
    },
    [packId, dayNumber, workbook, setItemCompleted]
  );

  return {
    getCorrectAnswer,
    saveProgress,
    restoreProgress,
    clearItemProgress,
  };
};
