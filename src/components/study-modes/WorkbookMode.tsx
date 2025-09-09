// src/components/study-modes/WorkbookMode.tsx (수정된 핵심 부분)
import React, { useEffect, useMemo, useCallback } from "react";
import { PenTool } from "lucide-react";

import { useSwipeGesture } from "@/shared/hooks/useSwipeGesture";
import { useTTS } from "@/shared/hooks/useTTS";
import { useDayProgress } from "@/shared/hooks/useAppHooks";
import { useStudySettings } from "@/shared/hooks/useAppHooks";

import { useWorkbookState } from "@/hooks/useWorkbookState";
import { useWorkbookLogic } from "@/hooks/useWorkbookLogic";
import { QuestionCard } from "@/components/workbook/QuestionCard";
import { AnswerOptions } from "@/components/workbook/AnswerOptions";
import { WorkbookNavigation } from "@/components/workbook/WorkbookNavigation";
import { CompletionCard } from "@/components/workbook/CompletionCard";
import { MobileHeader } from "@/components/workbook/MobileHeader";
import { ProgressIndicator } from "@/components/workbook/ProgressIndicator";
import { ActionSection } from "@/components/workbook/ActionSection";
import { DesktopSidebar } from "@/components/workbook/DesktopSidebar";

import { shuffleWorkbookData } from "@/utils/workbook.utils";
import type { WorkbookModeProps } from "@/types/workbook.types";
import { WORKBOOK_CONSTANTS } from "@/constants/workbook.constants";

export const WorkbookMode = React.memo<WorkbookModeProps>(
  ({
    items: rawWorkbook,
    dayNumber,
    category,
    packId,
    onComplete,
    initialItemIndex = 0,
  }) => {
    const workbook = useMemo(() => {
      if (!Array.isArray(rawWorkbook) || rawWorkbook.length === 0) {
        return [];
      }

      // 🔥 한 번만 섞이도록 안정적인 키 기반 메모이제이션
      const dataHash = rawWorkbook
        .map((item) => `${item.id}-${item.options?.length || 0}`)
        .join("|");
      console.log("🔀 워크북 데이터 처리:", {
        length: rawWorkbook.length,
        hash: dataHash.substring(0, 50) + "...",
      });

      return shuffleWorkbookData(rawWorkbook);
    }, [rawWorkbook]);

    // 🔥 컴포넌트 키 생성 방식 개선
    const componentKey = useMemo(() => {
      const baseKey = `${packId}-${dayNumber}-${workbook.length}`;
      // 워크북 내용이 바뀐 경우에만 키 변경
      const contentHash = workbook.map((item) => item.id).join("-");
      return `${baseKey}-${contentHash}`;
    }, [packId, dayNumber, workbook]);

    // 🔥 기존 방식 그대로 사용 (개별 변수들)
    const {
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
      currentQuestion,
      progress,
      score,
      isAllAnswered,
      isCurrentAnswered,
      isCurrentCorrect,
      pendingSaveRef,
    } = useWorkbookState(workbook, initialItemIndex, componentKey);

    const { getCorrectAnswer, saveProgress, restoreProgress } =
      useWorkbookLogic(packId, dayNumber, workbook);

    const { settings, updateSetting } = useStudySettings(packId);
    const { markModeCompleted } = useDayProgress(packId, dayNumber);
    const { speak, isSpeaking } = useTTS();

    // 🔥 기존 핸들러들 그대로 유지
    const handleModeChange = useCallback(
      (mode: "immersive" | "assisted") => {
        updateSetting("studyMode", mode);
        updateSetting("showMeaningEnabled", mode === "assisted");
      },
      [updateSetting]
    );

    const handleSpeak = useCallback(
      (text: string) => {
        if (text) speak(text, WORKBOOK_CONSTANTS.TTS_CONFIG);
      },
      [speak]
    );

    const handleAnswerSelect = useCallback(
      (answer: string) => {
        if (isCurrentAnswered) return;

        setSelectedAnswers((prev) => ({ ...prev, [currentIndex]: answer }));

        // 🔥 답 선택시 자동으로 TTS 재생 (선택사항)
        if (settings.autoPlayOnSelect && currentQuestion) {
          const questionText =
            currentQuestion.question || currentQuestion.sentence || "";
          const completeText = questionText.replace(/_{2,}/g, answer);

          // 잠깐 지연 후 재생 (자연스러운 UX)
          setTimeout(() => {
            handleSpeak(completeText);
          }, 300);
        }
      },
      [
        currentIndex,
        isCurrentAnswered,
        settings.autoPlayOnSelect,
        currentQuestion,
        handleSpeak,
      ]
    );

    const handleCheckAnswer = useCallback(() => {
      const selectedAnswer = selectedAnswers[currentIndex];
      if (!selectedAnswer || isCurrentAnswered) return;

      const correctAnswer = getCorrectAnswer(currentQuestion!);
      const isCorrect = selectedAnswer === correctAnswer;

      // 기존 방식 그대로
      setAnsweredQuestions((prev) => {
        const newSet = new Set(prev);
        newSet.add(currentIndex);
        return newSet;
      });

      if (isCorrect) {
        setCorrectAnswers((prev) => {
          const newSet = new Set(prev);
          newSet.add(currentIndex);
          return newSet;
        });
      }

      setShowResult((prev) => ({ ...prev, [currentIndex]: true }));
      pendingSaveRef.current.add(currentIndex);
    }, [
      selectedAnswers,
      currentIndex,
      isCurrentAnswered,
      getCorrectAnswer,
      currentQuestion,
      setAnsweredQuestions,
      setCorrectAnswers,
      setShowResult,
    ]);

    const goToNext = useCallback(() => {
      // 저장 로직
      if (pendingSaveRef.current.has(currentIndex)) {
        const isCorrect = correctAnswers.has(currentIndex);
        saveProgress(currentIndex, isCorrect);
        pendingSaveRef.current.delete(currentIndex);
      }

      if (currentIndex < workbook.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      }
    }, [
      currentIndex,
      correctAnswers,
      workbook.length,
      saveProgress,
      setCurrentIndex,
    ]);

    const goToPrev = useCallback(() => {
      if (currentIndex > 0) {
        setCurrentIndex((prev) => prev - 1);
      }
    }, [currentIndex, setCurrentIndex]);

    const handleRetry = useCallback(() => {
      console.log("🔄 다시 풀기:", currentIndex);

      // 기존 로직 그대로
      setAnsweredQuestions((prev) => {
        const newSet = new Set(prev);
        newSet.delete(currentIndex);
        return newSet;
      });

      setCorrectAnswers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(currentIndex);
        return newSet;
      });

      setShowResult((prev) => {
        const newObj = { ...prev };
        delete newObj[currentIndex];
        return newObj;
      });

      setShowExplanation((prev) => {
        const newObj = { ...prev };
        delete newObj[currentIndex];
        return newObj;
      });

      setSelectedAnswers((prev) => {
        const newObj = { ...prev };
        delete newObj[currentIndex];
        return newObj;
      });

      if (currentQuestion) {
        saveProgress(currentIndex, false);
      }
    }, [
      currentIndex,
      currentQuestion,
      saveProgress,
      setAnsweredQuestions,
      setCorrectAnswers,
      setShowResult,
      setShowExplanation,
      setSelectedAnswers,
    ]);

    const handleToggleExplanation = useCallback(() => {
      setShowExplanation((prev) => ({
        ...prev,
        [currentIndex]: !prev[currentIndex],
      }));
    }, [currentIndex, setShowExplanation]);

    const handleComplete = useCallback(() => {
      pendingSaveRef.current.forEach((idx) => {
        const isCorrect = correctAnswers.has(idx);
        saveProgress(idx, isCorrect);
      });
      pendingSaveRef.current.clear();

      markModeCompleted(dayNumber, "workbook");
      onComplete?.();
    }, [
      correctAnswers,
      saveProgress,
      markModeCompleted,
      dayNumber,
      onComplete,
    ]);

    // 진행상태 복원
    useEffect(() => {
      const { answered, correct, results } = restoreProgress();
      setAnsweredQuestions(answered);
      setCorrectAnswers(correct);
      setShowResult(results);
    }, [
      restoreProgress,
      setAnsweredQuestions,
      setCorrectAnswers,
      setShowResult,
    ]);

    const swipeHandlers = useSwipeGesture({
      onSwipeLeft: goToNext,
      onSwipeRight: goToPrev,
    });

    // 키보드 이벤트 (기존 그대로)
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "ArrowRight") goToNext();
        else if (e.key === "ArrowLeft") goToPrev();
        else if (
          e.key === "Enter" &&
          selectedAnswers[currentIndex] &&
          !isCurrentAnswered
        ) {
          handleCheckAnswer();
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [
      goToNext,
      goToPrev,
      selectedAnswers,
      currentIndex,
      isCurrentAnswered,
      handleCheckAnswer,
    ]);

    // 로딩 상태 처리 (기존 그대로)
    if (!workbook.length) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <PenTool className="w-16 h-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            학습할 워크북이 없습니다
          </h3>
          <p className="text-gray-600">
            Day {dayNumber}의 워크북을 확인해주세요
          </p>
        </div>
      );
    }

    if (!currentQuestion) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            문제를 로드할 수 없습니다
          </h3>
          <p className="text-gray-600">
            현재 인덱스: {currentIndex}, 전체: {workbook.length}
          </p>
        </div>
      );
    }

    return (
      <div
        key={componentKey}
        className="flex h-full min-h-[calc(100vh-129px)] bg-gray-50 font-sans"
      >
        {/* 메인 컨텐츠 */}
        <div className="flex-1 flex flex-col">
          {/* 모바일 헤더 */}
          <MobileHeader
            category={category}
            dayNumber={dayNumber}
            progress={progress}
            answeredCount={answeredQuestions.size}
            totalCount={workbook.length}
            score={score}
          />

          {/* 메인 카드 영역 */}
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
              {/* 진행 인디케이터 */}
              <ProgressIndicator
                workbook={workbook}
                currentIndex={currentIndex}
                correctAnswers={correctAnswers}
                answeredQuestions={answeredQuestions}
                onIndexChange={setCurrentIndex}
              />

              {/* 메인 카드 */}
              <div {...swipeHandlers}>
                <QuestionCard
                  question={currentQuestion}
                  isAnswered={isCurrentAnswered}
                  isCorrect={isCurrentCorrect}
                  selectedAnswer={selectedAnswers[currentIndex]}
                  onSpeak={handleSpeak}
                  isSpeaking={isSpeaking}
                >
                  <AnswerOptions
                    options={currentQuestion.options}
                    selectedAnswer={selectedAnswers[currentIndex]}
                    correctAnswer={getCorrectAnswer(currentQuestion)}
                    showResult={showResult[currentIndex] || false}
                    isAnswered={isCurrentAnswered}
                    onSelect={handleAnswerSelect}
                  />

                  <ActionSection
                    isAnswered={isCurrentAnswered}
                    isCorrect={isCurrentCorrect}
                    hasSelectedAnswer={!!selectedAnswers[currentIndex]}
                    correctAnswer={getCorrectAnswer(currentQuestion)}
                    onCheck={handleCheckAnswer}
                    onRetry={handleRetry}
                    studyMode={settings.studyMode}
                    showMeaningEnabled={settings.showMeaningEnabled}
                    explanation={currentQuestion.explanation}
                    showExplanation={showExplanation[currentIndex]}
                    onToggleExplanation={handleToggleExplanation}
                  />
                </QuestionCard>
              </div>

              {/* 네비게이션 */}
              <WorkbookNavigation
                currentIndex={currentIndex}
                totalCount={workbook.length}
                onPrev={goToPrev}
                onNext={goToNext}
              />

              {/* 완료 카드 */}
              {isAllAnswered && (
                <CompletionCard
                  score={score}
                  totalQuestions={workbook.length}
                  onComplete={handleComplete}
                />
              )}
            </div>
          </div>
        </div>

        {/* 데스크톱 사이드바 */}
        <DesktopSidebar
          category={category}
          dayNumber={dayNumber}
          progress={progress}
          score={score}
          workbook={workbook}
          currentIndex={currentIndex}
          answeredQuestions={answeredQuestions}
          correctAnswers={correctAnswers}
          settings={settings}
          onIndexChange={setCurrentIndex}
          onModeChange={handleModeChange}
          onAutoProgressChange={(enabled) =>
            updateSetting("autoProgressEnabled", enabled)
          }
        />
      </div>
    );
  }
);

WorkbookMode.displayName = "WorkbookMode";
export default WorkbookMode;
