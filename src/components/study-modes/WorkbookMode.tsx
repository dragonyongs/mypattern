// src/components/study-modes/WorkbookMode.tsx
import React, {
  useEffect,
  useMemo,
  useCallback,
  useState,
  useRef,
} from "react";
import { PenTool } from "lucide-react"; //, Check, RotateCcw
// import { WORKBOOK_MESSAGES } from "@/constants/workbook.constants";

import { useSwipeGesture } from "@/shared/hooks/useSwipeGesture";
import { useTTS } from "@/shared/hooks/useTTS";
import { useDayProgress } from "@/shared/hooks/useAppHooks";

import { useWorkbookState } from "@/hooks/useWorkbookState";
import { useWorkbookLogic } from "@/hooks/useWorkbookLogic";

// import { QuestionCard } from "@/components/workbook/QuestionCard";
// import { AnswerOptions } from "@/components/workbook/AnswerOptions";
// import { ActionSection } from "@/components/workbook/ActionSection";
import StudyPagination from "@/shared/components/StudyPagination";

import { StudySidebar } from "@/shared/components/StudySidebar";

import StudyCompleteButton from "@/shared/components/StudyCompleteButton";
import ActionButtons from "@/shared/components/ActionButtons";
import { WorkbookCard } from "@/components/workbook/WorkbookCard";

import { shuffleWorkbookData } from "@/utils/workbook.utils";
import type { WorkbookModeProps } from "@/types/workbook.types";

export const WorkbookMode = React.memo<WorkbookModeProps>(
  ({
    items: rawWorkbook,
    dayNumber,
    category = "워크북",
    packId,
    onComplete,
    initialItemIndex = 0,
    settings = {},
    onSettingsChange,
  }) => {
    // 데이터
    const workbook = useMemo(() => {
      if (!Array.isArray(rawWorkbook) || rawWorkbook.length === 0) return [];
      return shuffleWorkbookData(rawWorkbook);
    }, [rawWorkbook]);

    const componentKey = useMemo(() => {
      const baseKey = `${packId}-${dayNumber}-${workbook.length}`;
      const contentHash = workbook.map((it) => it.id).join("-");
      return `${baseKey}-${contentHash}`;
    }, [packId, dayNumber, workbook]);

    // 로컬 설정
    const [localSettings, setLocalSettings] = useState(() => ({
      studyMode: "immersive" as const,
      showMeaningEnabled: false,
      autoProgressEnabled: true,
      autoPlayOnSelect: false,
      ...settings,
    }));
    useEffect(() => {
      setLocalSettings((prev) => ({ ...prev, ...settings }));
    }, [settings]);

    const handleModeChange = useCallback(
      (mode: "immersive" | "assisted") => {
        setLocalSettings((prev) => {
          const next = { ...prev, studyMode: mode };
          onSettingsChange?.(next);
          return next;
        });
      },
      [onSettingsChange]
    );
    const handleAutoProgressChange = useCallback(
      (enabled: boolean) => {
        setLocalSettings((prev) => {
          const next = { ...prev, autoProgressEnabled: enabled };
          onSettingsChange?.(next);
          return next;
        });
      },
      [onSettingsChange]
    );
    const handleAutoPlayChange = useCallback(
      (enabled: boolean) => {
        setLocalSettings((prev) => {
          const next = { ...prev, autoPlayOnSelect: enabled };
          onSettingsChange?.(next);
          return next;
        });
      },
      [onSettingsChange]
    );

    // 상태 훅
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

    // 로직
    const { getCorrectAnswer, saveProgress, restoreProgress } =
      useWorkbookLogic(packId, dayNumber, workbook);
    const { speak, isSpeaking } = useTTS();
    const { markModeCompleted } = useDayProgress(packId, dayNumber);

    // 내비/타이머/refs
    const autoProgressTimeoutRef = useRef<number | null>(null);
    const currentIndexRef = useRef<number>(initialItemIndex);
    const answeredRef = useRef<Set<number>>(answeredQuestions);
    const correctRef = useRef<Set<number>>(correctAnswers);

    useEffect(() => {
      currentIndexRef.current = currentIndex;
    }, [currentIndex]);
    useEffect(() => {
      answeredRef.current = answeredQuestions;
    }, [answeredQuestions]);
    useEffect(() => {
      correctRef.current = correctAnswers;
    }, [correctAnswers]);
    useEffect(() => {
      return () => {
        if (autoProgressTimeoutRef.current) {
          window.clearTimeout(autoProgressTimeoutRef.current);
          autoProgressTimeoutRef.current = null;
        }
      };
    }, []);

    // 이동은 항상 navigateTo
    const navigateTo = useCallback(
      (index: number) => {
        if (autoProgressTimeoutRef.current) {
          window.clearTimeout(autoProgressTimeoutRef.current);
          autoProgressTimeoutRef.current = null;
        }
        const safeIndex = Math.max(0, Math.min(index, workbook.length - 1));
        currentIndexRef.current = safeIndex;
        setCurrentIndex(safeIndex);
      },
      [workbook.length, setCurrentIndex]
    );

    // TTS: 단어/문장 모드와 동일 인자
    const handleSpeak = useCallback(
      (text: string) => {
        const toSay = (text || "").trim();
        if (!toSay) return;
        speak(toSay, { lang: "en-US", rate: 0.8 });
      },
      [speak]
    );

    // 복원(마운트 1회)
    useEffect(() => {
      const { answered, correct, results } = restoreProgress();
      setAnsweredQuestions(answered);
      setCorrectAnswers(correct);
      setShowResult(results);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 선택
    const handleAnswerSelect = useCallback(
      (answer: string) => {
        if (isCurrentAnswered) return;
        const idx = currentIndexRef.current;
        setSelectedAnswers((prev) => ({ ...prev, [idx]: answer }));
        if (localSettings.autoPlayOnSelect && currentQuestion) {
          const qText =
            currentQuestion.question || currentQuestion.sentence || "";
          const filled = qText.replace(/_{2,}/g, answer);
          setTimeout(() => handleSpeak(filled), 240);
        }
      },
      [
        isCurrentAnswered,
        currentQuestion,
        handleSpeak,
        localSettings.autoPlayOnSelect,
        setSelectedAnswers,
      ]
    );

    // 정답 확인
    const handleCheckAnswer = useCallback(() => {
      const idx = currentIndexRef.current;
      if (answeredRef.current.has(idx)) return;

      const selected = selectedAnswers[idx];
      if (!selected) return;

      const correct = getCorrectAnswer(currentQuestion!);
      const isCorrect = selected === correct;

      // 상태 반영
      setAnsweredQuestions((prev) => {
        const n = new Set(prev);
        n.add(idx);
        return n;
      });
      if (isCorrect) {
        setCorrectAnswers((prev) => {
          const n = new Set(prev);
          n.add(idx);
          return n;
        });
      }
      setShowResult((prev) => ({ ...prev, [idx]: true }));

      // ✅ 즉시 저장하여 이탈해도 복원 가능
      saveProgress(idx, isCorrect);
      // pendingSaveRef.current.add(idx);

      if (localSettings.autoProgressEnabled) {
        if (autoProgressTimeoutRef.current) {
          window.clearTimeout(autoProgressTimeoutRef.current);
          autoProgressTimeoutRef.current = null;
        }
        let nextIdx = -1;
        for (let i = idx + 1; i < workbook.length; i++) {
          if (!answeredRef.current.has(i)) {
            nextIdx = i;
            break;
          }
        }
        if (nextIdx === -1) nextIdx = Math.min(idx + 1, workbook.length - 1);

        autoProgressTimeoutRef.current = window.setTimeout(() => {
          navigateTo(nextIdx);
          autoProgressTimeoutRef.current = null;
        }, 380) as unknown as number;
      }
    }, [
      selectedAnswers,
      getCorrectAnswer,
      currentQuestion,
      setAnsweredQuestions,
      setCorrectAnswers,
      setShowResult,
      saveProgress,
    ]);

    // 다시 풀기(현재 카드만 리셋)
    const handleRetry = useCallback(() => {
      const idx = currentIndexRef.current;
      pendingSaveRef.current.delete(idx);

      setAnsweredQuestions((prev) => {
        const n = new Set(prev);
        n.delete(idx);
        return n;
      });
      setCorrectAnswers((prev) => {
        const n = new Set(prev);
        n.delete(idx);
        return n;
      });
      setShowResult((prev) => {
        const copy = { ...prev };
        delete copy[idx];
        return copy;
      });
      setShowExplanation((prev) => {
        const copy = { ...prev };
        delete copy[idx];
        return copy;
      });
      setSelectedAnswers((prev) => {
        const copy = { ...prev };
        delete copy[idx];
        return copy;
      });
    }, [
      setAnsweredQuestions,
      setCorrectAnswers,
      setShowResult,
      setShowExplanation,
      setSelectedAnswers,
    ]);

    const handleToggleExplanation = useCallback(() => {
      const idx = currentIndexRef.current;
      setShowExplanation((prev) => ({ ...prev, [idx]: !prev[idx] }));
    }, [setShowExplanation]);

    // 다음/이전
    const goToNext = useCallback(() => {
      const idx = currentIndexRef.current;
      if (pendingSaveRef.current.has(idx)) {
        const isCorrect = correctRef.current.has(idx);
        saveProgress(idx, isCorrect);
        pendingSaveRef.current.delete(idx);
      }
      const nextIndex = Math.min(
        currentIndexRef.current + 1,
        workbook.length - 1
      );
      navigateTo(nextIndex);
    }, [navigateTo, saveProgress, workbook.length]);

    const goToPrev = useCallback(() => {
      const prevIndex = Math.max(currentIndexRef.current - 1, 0);
      navigateTo(prevIndex);
    }, [navigateTo]);

    const goToIndex = useCallback(
      (i: number) => navigateTo(Math.max(0, Math.min(i, workbook.length - 1))),
      [navigateTo]
    );

    // 제스처/키
    const swipeHandlers = useSwipeGesture({
      onSwipeLeft: goToNext,
      onSwipeRight: goToPrev,
    });
    useEffect(() => {
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "ArrowRight") goToNext();
        if (e.key === "ArrowLeft") goToPrev();
        if (e.key === "Enter") handleCheckAnswer();
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [goToNext, goToPrev, handleCheckAnswer]);

    // 완료
    const handleComplete = useCallback(() => {
      pendingSaveRef.current.forEach((idx) => {
        const isCorrect = correctRef.current.has(idx);
        saveProgress(idx, isCorrect);
      });
      pendingSaveRef.current.clear();
      markModeCompleted(packId, "workbook");
      onComplete?.();
    }, [saveProgress, markModeCompleted, packId, onComplete]);

    // 경계
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
            문제를 불러올 수 없습니다
          </h3>
          <p className="text-gray-600">
            현재 인덱스: {currentIndex}, 전체: {workbook.length}
          </p>
        </div>
      );
    }

    // 레이아웃: SentenceMode와 동일 2열 구조
    return (
      <div
        key={componentKey}
        className="flex h-full min-h-[calc(100vh-130px)] bg-gray-50 font-sans pb-20 lg:pb-0"
      >
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 본문+사이드바 2열 */}
          <div className="flex-1 flex">
            {/* 왼쪽 본문: 중앙 카드 */}
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="w-full max-w-xl">
                <div {...swipeHandlers}>
                  {/* <QuestionCard
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

                    {!isCurrentAnswered && (
                      <div className="text-center text-gray-400 text-sm">
                        {
                          WORKBOOK_MESSAGES.STUDY_HINTS[
                            localSettings.studyMode.toUpperCase() as keyof typeof WORKBOOK_MESSAGES.STUDY_HINTS
                          ]
                        }
                      </div>
                    )}

                    {isCurrentAnswered && (
                      <ActionSection
                        isCorrect={isCurrentCorrect}
                        correctAnswer={getCorrectAnswer(currentQuestion)}
                        studyMode={localSettings.studyMode}
                        showMeaningEnabled={localSettings.showMeaningEnabled}
                        explanation={currentQuestion.explanation}
                        showExplanation={showExplanation[currentIndex]}
                        onToggleExplanation={handleToggleExplanation}
                      />
                    )}
                  </QuestionCard> */}
                  <WorkbookCard
                    question={
                      currentQuestion.question || currentQuestion.sentence
                    }
                    options={currentQuestion.options || []}
                    correctAnswer={getCorrectAnswer(currentQuestion)}
                    explanation={currentQuestion.explanation}
                    selectedAnswer={selectedAnswers[currentIndex]}
                    showResult={showResult[currentIndex]}
                    showExplanation={showExplanation[currentIndex]}
                    isSpeaking={isSpeaking} // 🔥 공통 SpeakButton 사용
                    isAnswered={isCurrentAnswered}
                    onAnswerSelect={handleAnswerSelect}
                    onSpeak={handleSpeak}
                    onToggleExplanation={handleToggleExplanation}
                  />
                </div>
                <StudyPagination
                  currentIndex={currentIndex}
                  totalItems={workbook.length}
                  completed={correctAnswers}
                  secondary={answeredQuestions}
                  onPrev={goToPrev}
                  onNext={goToNext}
                  onIndexChange={goToIndex}
                />

                <div className="mt-6">
                  <ActionButtons
                    isAnswered={isCurrentAnswered}
                    canCheck={!!selectedAnswers[currentIndex]}
                    onCheck={handleCheckAnswer}
                    onRetry={handleRetry}
                  />
                </div>

                {isAllAnswered && (
                  <StudyCompleteButton
                    isAllMastered={isAllAnswered}
                    onComplete={handleComplete}
                  />
                )}
              </div>
            </div>

            {/* 오른쪽 사이드바: 독립 컬럼 */}
            <StudySidebar
              category={category}
              dayNumber={dayNumber}
              progress={progress}
              items={workbook}
              currentIndex={currentIndex}
              studiedCards={answeredQuestions} // 학습됨 = 답안 확인 완료
              masteredCards={correctAnswers} // 완료 = 정답 처리
              score={score}
              onSelectIndex={goToIndex}
              settings={localSettings}
              handleModeChange={handleModeChange}
              handleAutoProgressChange={handleAutoProgressChange}
              handleAutoPlayChange={handleAutoPlayChange}
            />
          </div>
        </div>
      </div>
    );
  }
);

WorkbookMode.displayName = "WorkbookMode";
export default WorkbookMode;
