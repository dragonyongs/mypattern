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

  const restoreProgress = useCallback(() => {
    const answered = new Set<number>();
    const correct = new Set<number>();
    const results: Record<number, boolean> = {};

    workbook.forEach((item, index) => {
      const progress = getItemProgress(packId, dayNumber, item.id);

      if (progress?.isCompleted === true) {
        answered.add(index);
        results[index] = true;

        const itemCorrectAnswer = getCorrectAnswer(item);
        if (progress.lastStudied && itemCorrectAnswer) {
          correct.add(index);
        }
      }
    });

    return { answered, correct, results };
  }, [workbook, getItemProgress, packId, dayNumber, getCorrectAnswer]);

  return {
    getCorrectAnswer,
    saveProgress,
    restoreProgress,
  };
};
