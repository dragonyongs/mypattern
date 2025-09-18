// src/hooks/useWorkbookState.ts
import { useState, useCallback, useRef, useEffect } from "react";
import { useStudyProgressStore } from "@/stores/studyProgressStore";
import type { WorkbookItem } from "@/types/workbook.types";

export const useWorkbookState = (
  workbook: WorkbookItem[],
  initialIndex = 0,
  componentKey: string,
  restoreProgress: () => {
    answered: Set<number>;
    correct: Set<number>;
    results: Record<number, boolean>;
    selected?: Record<number, string>;
  }
) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<number, string>
  >({});
  const [answeredQuestions, setAnsweredQuestions] = useState(new Set<number>());
  const [correctAnswers, setCorrectAnswers] = useState(new Set<number>());
  const [showResult, setShowResult] = useState<Record<number, boolean>>({});
  const [showExplanation, setShowExplanation] = useState<
    Record<number, boolean>
  >({});

  const pendingSaveRef = useRef(new Set<number>());
  const lastComponentKeyRef = useRef(componentKey);
  const [isRestored, setIsRestored] = useState(false);

  // 🔥 스토어에서 하이드레이션 상태와 대기 함수 가져오기
  const progressHydrated = useStudyProgressStore((s) => s._hasHydrated);
  const waitForHydration = useStudyProgressStore((s) => s.waitForHydration);

  // componentKey 변경 시 전체 초기화 + 복원 재시도
  const resetState = useCallback(() => {
    if (lastComponentKeyRef.current === componentKey) return;

    console.log("🔄 WorkbookState 초기화:", {
      from: lastComponentKeyRef.current,
      to: componentKey,
    });

    setCurrentIndex(initialIndex);
    setSelectedAnswers({});
    setAnsweredQuestions(new Set());
    setCorrectAnswers(new Set());
    setShowResult({});
    setShowExplanation({});
    setIsRestored(false); // 🔥 복원 상태도 리셋
    pendingSaveRef.current.clear();

    lastComponentKeyRef.current = componentKey;
  }, [initialIndex, componentKey]);

  useEffect(() => {
    resetState();
  }, [resetState]);

  // 🔥 하이드레이션 대기 후 복원 실행
  useEffect(() => {
    let cancelled = false;
    if (!workbook.length || isRestored) return;

    const performRestore = async () => {
      try {
        if (!progressHydrated) await waitForHydration();
        if (cancelled) return;

        // ✅ 선택값 포함 복원
        const { answered, correct, results, selected } = restoreProgress();

        if (!cancelled) {
          setAnsweredQuestions(answered);
          setCorrectAnswers(correct);
          setShowResult(results);
          if (selected) setSelectedAnswers(selected); // ✅ 추가
          setIsRestored(true);
        }
      } catch (e) {
        console.warn("⚠️ WorkbookState 복원 실패:", e);
        if (!cancelled) setIsRestored(true);
      }
    };

    void performRestore();
    return () => {
      cancelled = true;
    };
  }, [
    workbook.length,
    progressHydrated,
    waitForHydration,
    restoreProgress,
    isRestored,
    componentKey,
  ]);

  return {
    currentIndex,
    selectedAnswers,
    answeredQuestions,
    correctAnswers,
    showResult,
    showExplanation,
    setCurrentIndex,
    setSelectedAnswers,
    setAnsweredQuestions,
    setCorrectAnswers,
    setShowResult,
    setShowExplanation,
    currentQuestion: workbook[currentIndex],
    progress:
      workbook.length > 0
        ? (answeredQuestions.size / workbook.length) * 100
        : 0,
    score: correctAnswers.size,
    isAllAnswered:
      workbook.length > 0 && answeredQuestions.size === workbook.length,
    isCurrentAnswered: answeredQuestions.has(currentIndex),
    isCurrentCorrect: correctAnswers.has(currentIndex),
    pendingSaveRef,
    resetState,
    isRestored,
  };
};
