// src/hooks/useWorkbookState.ts (수정됨)
import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import type { WorkbookItem } from "@/types/workbook.types";

export const useWorkbookState = (
  workbook: WorkbookItem[],
  initialIndex = 0,
  componentKey: string
) => {
  // 개별 상태들을 직접 관리 (기존 방식 유지)
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<number, string>
  >({});
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(
    new Set()
  );
  const [correctAnswers, setCorrectAnswers] = useState<Set<number>>(new Set());
  const [showResult, setShowResult] = useState<Record<number, boolean>>({});
  const [showExplanation, setShowExplanation] = useState<
    Record<number, boolean>
  >({});

  const pendingSaveRef = useRef<Set<number>>(new Set());
  const lastComponentKeyRef = useRef<string>(componentKey);

  // 완전 초기화 (componentKey 변경시)
  const resetState = useCallback(() => {
    if (lastComponentKeyRef.current === componentKey) {
      console.log("🔄 WorkbookState - 동일한 키, 초기화 건너뜀:", componentKey);
      return;
    }

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
    pendingSaveRef.current.clear();

    lastComponentKeyRef.current = componentKey;
  }, [initialIndex, componentKey]);

  // componentKey 변경시 자동 초기화
  useEffect(() => {
    resetState();
  }, [resetState]);

  const currentQuestion = useMemo(
    () => workbook[currentIndex],
    [workbook, currentIndex]
  );

  const progress = useMemo(() => {
    return workbook.length > 0
      ? (answeredQuestions.size / workbook.length) * 100
      : 0;
  }, [answeredQuestions.size, workbook.length]);

  const score = correctAnswers.size;
  const isAllAnswered =
    workbook.length > 0 && answeredQuestions.size === workbook.length;
  const isCurrentAnswered = answeredQuestions.has(currentIndex);
  const isCurrentCorrect = correctAnswers.has(currentIndex);

  // 기존 방식과 동일하게 개별 상태들과 setter들을 반환
  return {
    // 상태들
    currentIndex,
    selectedAnswers,
    answeredQuestions,
    correctAnswers,
    showResult,
    showExplanation,

    // Setter들
    setCurrentIndex,
    setSelectedAnswers,
    setAnsweredQuestions,
    setCorrectAnswers,
    setShowResult,
    setShowExplanation,

    // 계산된 값들
    currentQuestion,
    progress,
    score,
    isAllAnswered,
    isCurrentAnswered,
    isCurrentCorrect,

    // Refs와 유틸리티
    pendingSaveRef,
    resetState,
  };
};
