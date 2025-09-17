// src/components/study-modes/WorkbookMode.tsx
import React, {
  useEffect,
  useMemo,
  useCallback,
  useState,
  useRef,
} from "react";
import { PenTool } from "lucide-react";

import { useSwipeGesture } from "@/shared/hooks/useSwipeGesture";
import { useTTS } from "@/shared/hooks/useTTS";
import { useDayProgress } from "@/shared/hooks/useAppHooks";

import { useWorkbookState } from "@/hooks/useWorkbookState";
import { useWorkbookLogic } from "@/hooks/useWorkbookLogic";
import StudyPagination from "@/shared/components/StudyPagination";
import { StudySidebar } from "@/shared/components/StudySidebar";
import StudyCompleteButton from "@/shared/components/StudyCompleteButton";
import ActionButtons from "@/shared/components/ActionButtons";
import { WorkbookCard } from "@/components/workbook/WorkbookCard";

import { shuffleWithSeed } from "@/utils/workbook.utils"; // PRNG + Fisher–Yates
import {
  getShuffledItem,
  warmupShuffles,
} from "@/utils/workbook.shuffle.runtime";

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
    // 1) 원본 유지: 전역 일괄 셔플 제거
    const workbook = useMemo(() => {
      if (!Array.isArray(rawWorkbook) || rawWorkbook.length === 0) return [];
      return rawWorkbook;
    }, [rawWorkbook]);

    const {
      getCorrectAnswer,
      saveProgress,
      restoreProgress,
      clearItemProgress,
    } = useWorkbookLogic(packId, dayNumber, workbook);

    // 2) 세션/일자 단위 시드 키
    const dayKey = useMemo(() => {
      const d = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      return `${packId}-day-${dayNumber}-${d}`;
    }, [packId, dayNumber]);

    // 3) componentKey 유지(복원/키 관리)
    const componentKey = useMemo(() => {
      const baseKey = `${packId}-${dayNumber}-${workbook.length}`;
      const contentHash = workbook.map((it) => it.id).join("-");
      return `${baseKey}-${contentHash}`;
    }, [packId, dayNumber, workbook]);

    // 4) 로컬 설정
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

    // 5) 상태 훅 — 반드시 상단에서 먼저 호출(훅의 규칙)
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
      isRestored, // 🔥 복원 완료 여부
    } = useWorkbookState(
      workbook,
      initialItemIndex,
      componentKey,
      restoreProgress
    );

    useEffect(() => {
      // 크기/참조 로그
      console.log(
        "[wb] answered size/ref",
        answeredQuestions.size,
        answeredQuestions
      );
      console.log("[wb] correct size/ref", correctAnswers.size, correctAnswers);
      console.log("[wb] currentIndex", currentIndex);
    }, [answeredQuestions, correctAnswers, currentIndex]);

    const warmupRef = useRef<ReturnType<typeof warmupShuffles> | null>(null);

    // 6) 현재 문제만 즉시 셔플
    const shownItem = useMemo(() => {
      if (!workbook.length) return undefined;
      return getShuffledItem(workbook[currentIndex], dayKey, shuffleWithSeed);
    }, [workbook, currentIndex, dayKey]);

    // 7) 현재 인덱스 주변 k개 유휴 시간 워밍업
    useEffect(() => {
      if (!workbook.length) return;
      // 이전 워밍업 작업 취소
      warmupRef.current?.cancel();
      // 새 범위 예약(반경 8 예시)
      warmupRef.current = warmupShuffles(
        workbook,
        dayKey,
        currentIndex,
        8,
        shuffleWithSeed
      );
      return () => warmupRef.current?.cancel();
    }, [workbook, dayKey, currentIndex]);

    // 8) 로직 훅
    const { speak, isSpeaking } = useTTS();

    // 9) refs/내비
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

    // 10) TTS
    const handleSpeak = useCallback(
      (text: string) => {
        const toSay = (text || "").trim();
        if (!toSay) return;
        speak(toSay, { lang: "en-US", rate: 0.8 });
      },
      [speak]
    );

    // 11) 복원(마운트 1회)
    // useEffect(() => {
    //   const { answered, correct, results } = restoreProgress();
    //   setAnsweredQuestions(answered);
    //   setCorrectAnswers(correct);
    //   setShowResult(results);
    //   // eslint-disable-next-line react-hooks/exhaustive-deps
    // }, []);

    // 12) 선택
    const handleAnswerSelect = useCallback(
      (answer: string) => {
        console.log("[wb] select", { idx: currentIndexRef.current, answer });
        if (isCurrentAnswered) {
          console.log("[wb] select ignored: already answered");
          return;
        }

        // if (isCurrentAnswered) return;
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

    // 13) 정답 확인
    const handleCheckAnswer = useCallback(() => {
      const idx = currentIndexRef.current;
      if (answeredRef.current.has(idx)) return;

      const selected = selectedAnswers[idx];
      console.log("[wb] check start", {
        idx,
        selected,
        wasAnswered: answeredRef.current.has(idx),
      });
      if (answeredRef.current.has(idx)) {
        console.log("[wb] early return: already checked");
        return;
      }
      if (!selected) {
        console.log("[wb] early return: no selection");
        return;
      }

      // if (!selected) return;

      const correct = getCorrectAnswer(currentQuestion!);
      const isCorrect = selected === correct;

      setAnsweredQuestions((prev) => {
        const n = new Set(prev);
        n.add(idx);
        return n;
      });
      console.log("[wb] check done", {
        idx,
        isCorrect,
        answeredSize: answeredRef.current.size + 1 /* 예상 */,
        correctSize: correctRef.current.size + (isCorrect ? 1 : 0),
      });
      if (isCorrect) {
        setCorrectAnswers((prev) => {
          const n = new Set(prev);
          n.add(idx);
          return n;
        });
      }
      setShowResult((prev) => ({ ...prev, [idx]: true }));

      saveProgress(idx, isCorrect);

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

        console.log("[wb] after check", {
          idx,
          isCorrect,
          answeredSize: answeredRef.current.size,
          correctSize: correctRef.current.size,
        });

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
      navigateTo,
      workbook.length,
      localSettings.autoProgressEnabled,
    ]);

    //const { clearItemProgress } = useWorkbookLogic(packId, dayNumber, workbook);

    // 14) 다시 풀기
    // WorkbookMode.tsx 내부 - handleRetry 함수만 교체
    const handleRetry = useCallback(() => {
      const idx = currentIndexRef.current;

      // 🔥 저장소에서도 완전히 삭제
      clearItemProgress(idx);

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

      console.log(`🔄 [RETRY] Reset state for index ${idx}`);
    }, [
      clearItemProgress, // 🔥 추가
      setAnsweredQuestions,
      setCorrectAnswers,
      setShowResult,
      setShowExplanation,
      setSelectedAnswers,
      pendingSaveRef,
    ]);

    const handleToggleExplanation = useCallback(() => {
      const idx = currentIndexRef.current;
      setShowExplanation((prev) => ({ ...prev, [idx]: !prev[idx] }));
    }, [setShowExplanation]);

    // 15) 다음/이전
    const { speak: _s } = useTTS(); // to avoid unused warning if needed
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
      [navigateTo, workbook.length]
    );

    // 16) 제스처/키
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

    // 17) 완료
    const { markModeCompleted } = useDayProgress(packId, dayNumber);
    const handleComplete = useCallback(() => {
      pendingSaveRef.current.forEach((idx) => {
        const isCorrect = correctRef.current.has(idx);
        saveProgress(idx, isCorrect);
      });
      pendingSaveRef.current.clear();
      markModeCompleted(packId, "workbook");
      onComplete?.();
    }, [saveProgress, markModeCompleted, packId, onComplete]);

    // 사이드바 리렌더 보장용 refresh 키(얕은 비교 우회)
    const answeredCount = answeredQuestions.size;
    const correctCount = correctAnswers.size;
    const sidebarKey = useMemo(
      () =>
        `sb-${componentKey}-${answeredCount}-${correctCount}-${currentIndex}`,
      [componentKey, answeredCount, correctCount, currentIndex]
    );

    // 경계 처리
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
    if (!shownItem) {
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

    // 레이아웃
    return (
      <div
        key={componentKey}
        className="flex h-full min-h-[calc(100vh-130px)] bg-gray-50 font-sans pb-20 lg:pb-0"
      >
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex">
            {/* 본문 */}
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="w-full max-w-xl">
                <div {...swipeHandlers}>
                  <WorkbookCard
                    currentIndex={currentIndex}
                    question={shownItem.question || shownItem.sentence}
                    options={shownItem.options || []} // 셔플된 옵션
                    correctAnswer={shownItem.correctAnswer} // 결정적 정답
                    explanation={shownItem.explanation}
                    selectedAnswer={selectedAnswers[currentIndex]}
                    showResult={showResult[currentIndex]}
                    showExplanation={showExplanation[currentIndex]}
                    isSpeaking={isSpeaking}
                    isAnswered={isCurrentAnswered}
                    onCheck={handleCheckAnswer}
                    onRetry={handleRetry}
                    onAnswerSelect={handleAnswerSelect}
                    onSpeak={handleSpeak}
                    onToggleExplanation={handleToggleExplanation}
                  />
                </div>
                {/* <div className="mt-6">
                  <ActionButtons
                    isAnswered={isCurrentAnswered}
                    canCheck={!!selectedAnswers[currentIndex]}
                    onCheck={handleCheckAnswer}
                    onRetry={handleRetry}
                  />
                </div> */}

                {isAllAnswered && (
                  <StudyCompleteButton
                    isAllMastered={isAllAnswered}
                    onComplete={handleComplete}
                  />
                )}
                <StudyPagination
                  currentIndex={currentIndex}
                  totalItems={workbook.length}
                  completed={correctAnswers}
                  secondary={answeredQuestions}
                  onPrev={goToPrev}
                  onNext={goToNext}
                  onIndexChange={goToIndex}
                />
              </div>
            </div>

            {/* 사이드바: refresh 키로 리렌더 확정 */}
            <StudySidebar
              key={sidebarKey}
              category={category}
              dayNumber={dayNumber}
              progress={progress}
              items={workbook}
              currentIndex={currentIndex}
              studiedCards={answeredQuestions}
              masteredCards={correctAnswers}
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
