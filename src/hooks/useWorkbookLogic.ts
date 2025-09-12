// src/hooks/useWorkbookLogic.ts
import { useCallback, useEffect } from "react";
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
          console.log(
            `💾 [SAVE] Pack:${packId}, Day:${dayNumber}, Item:${item.id}, Result:${isCorrect}`
          );
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

    console.log(`🔄 [RESTORE] Starting for Pack:${packId}, Day:${dayNumber}`);

    workbook.forEach((item, index) => {
      const p = getItemProgress(packId, dayNumber, item.id);

      console.log(`[RESTORE] Index:${index}, Item:${item.id}, Progress:`, p);

      // 시도 여부: 진행기록이 있으면 (isCompleted가 boolean이거나 lastStudied가 있음)
      const wasAnswered =
        !!p && (typeof p.isCompleted === "boolean" || !!p.lastStudied);

      if (!wasAnswered) return;

      answered.add(index); // 회색 칩 (시도함)

      const isCorrect = p.isCompleted === true;
      results[index] = isCorrect; // 🔥 실제 정답 여부만 저장

      if (isCorrect) {
        correct.add(index); // 초록 칩 (정답)
      }
    });

    console.log(
      `✅ [RESTORE] Completed - answered:${answered.size}, correct:${correct.size}`
    );
    return { answered, correct, results };
  }, [workbook, getItemProgress, packId, dayNumber]);

  // 🔥 개별 아이템 삭제 함수 추가 (다시 풀기용)
  const clearItemProgress = useCallback(
    (index: number) => {
      const item = workbook[index];
      if (item) {
        try {
          setItemCompleted(packId, dayNumber, item.id, false);
          console.log(
            `🗑️ [CLEAR] Pack:${packId}, Day:${dayNumber}, Item:${item.id}`
          );
        } catch (error) {
          console.warn("[WorkbookLogic] Failed to clear progress:", error);
        }
      }
    },
    [packId, dayNumber, workbook, setItemCompleted]
  );

  // 🔥 디버깅용 샘플 로그 (개발 시에만)
  useEffect(() => {
    if (!workbook.length) return;

    const sample = workbook.slice(0, 3).map((item, i) => ({
      index: i,
      id: item.id,
      progress: getItemProgress(packId, dayNumber, item.id),
    }));
    console.log(
      `[DEBUG] Pack:${packId}, Day:${dayNumber} - 첫 3개 샘플:`,
      sample
    );
  }, [workbook, packId, dayNumber, getItemProgress]);

  return {
    getCorrectAnswer,
    saveProgress,
    restoreProgress,
    clearItemProgress,
  };
};
