// src/components/study-modes/WorkbookMode.tsx
import React, {
  useEffect,
  useMemo,
  useCallback,
  useState,
  useRef,
} from "react";
import { useShallow } from "zustand/react/shallow";
import { PenTool } from "lucide-react";
import { useSwipeGesture } from "@/shared/hooks/useSwipeGesture";
import { useTTS } from "@/shared/hooks/useTTS";
import { useDayProgress } from "@/shared/hooks/useAppHooks";
import { useWorkbookState } from "@/hooks/useWorkbookState";
import { useWorkbookLogic } from "@/hooks/useWorkbookLogic";
import StudyPagination from "@/shared/components/StudyPagination";
import { StudySidebar } from "@/shared/components/StudySidebar";
import StudyCompleteButton from "@/shared/components/StudyCompleteButton";
import { buildWorkbookForDay } from "@/shared/services/workbook.builder";
import { WorkbookCard } from "@/components/workbook/WorkbookCard";
import { shuffleWithSeed } from "@/utils/workbook.utils";
import {
  getShuffledItem,
  warmupShuffles,
} from "@/utils/workbook.shuffle.runtime";
import type { WorkbookItem, StudySettings, StudyModeType } from "@/types";

const getItemCorrectText = (it?: any) => {
  if (!it) return "";
  return it.correctAnswer ?? it.answer ?? "";
};

const normalize = (s = "") => s.toLowerCase().replace(/\s+/g, " ").trim();

interface WorkbookModePropsComplete {
  items?: WorkbookItem[];
  dayNumber: number;
  category?: string;
  packId: string;
  onComplete?: () => void;
  initialItemIndex?: number;
  settings?: StudySettings;
  onSettingsChange?: (newSettings: StudySettings) => void;
  isSettingOpen?: boolean;
}

export const WorkbookMode = React.memo<WorkbookModePropsComplete>(
  ({
    items: rawWorkbook,
    dayNumber,
    category = "워크북",
    packId,
    onComplete,
    initialItemIndex = 0,
    settings = {},
    onSettingsChange,
    isSettingOpen,
  }) => {
    // ✅ 모든 useState 먼저 선언
    const [workbook, setWorkbook] = useState<WorkbookItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // ✅ 모든 Hook들을 무조건 호출 (early return 전에)
    const currentSettings = useMemo(
      () => ({
        studyMode: "immersive" as const,
        showMeaningEnabled: false,
        autoProgressEnabled: false,
        autoPlayOnSelect: false,
        ...settings,
      }),
      [settings]
    );

    const workbookLogic = useWorkbookLogic(packId, dayNumber, workbook);
    const { speak, isSpeaking } = useTTS();
    const { markModeCompleted } = useDayProgress(packId, dayNumber);

    const dayKey = useMemo(() => {
      const d = new Date().toISOString().slice(0, 10);
      return `${packId}-day-${dayNumber}-${d}`;
    }, [packId, dayNumber]);

    const componentKey = useMemo(() => {
      if (!workbook.length) return `${packId}-${dayNumber}-empty`;
      const baseKey = `${packId}-${dayNumber}-${workbook.length}`;
      const contentHash = workbook.map((it) => it.id).join("-");
      return `${baseKey}-${contentHash}`;
    }, [packId, dayNumber, workbook]);

    const workbookState = useWorkbookState(
      workbook,
      initialItemIndex,
      componentKey,
      workbookLogic.restoreProgress
    );

    const autoProgressTimeoutRef = useRef<number | null>(null);
    const currentIndexRef = useRef(initialItemIndex);
    const warmupRef = useRef<{ cancel: () => void } | null>(null);

    // ✅ 워크북 데이터 로드
    useEffect(() => {
      let cancelled = false;
      setIsLoading(true);

      const loadWorkbook = async () => {
        try {
          if (Array.isArray(rawWorkbook) && rawWorkbook.length > 0) {
            console.log(
              "🔥 Using provided workbook items:",
              rawWorkbook.length
            );

            const validatedItems = rawWorkbook.map((item, index) => ({
              ...item,
              id: item.id || `wb-${dayNumber}-${index}`,
              question: item.question || item.sentence || "",
              options: Array.isArray(item.options) ? item.options : [],
              correctAnswer: item.correctAnswer || item.answer || "",
              explanation: item.explanation || "",
            }));

            if (!cancelled) {
              setWorkbook(validatedItems);
              setIsLoading(false);
            }
            return;
          }

          console.log("🔥 Building workbook dynamically for day:", dayNumber);
          const items = await buildWorkbookForDay(packId, dayNumber, 4);

          if (!cancelled && Array.isArray(items)) {
            const validatedItems = items.map((item, index) => ({
              ...item,
              id: item.id || `wb-${dayNumber}-${index}`,
              question: item.question || item.sentence || "",
              options: Array.isArray(item.options) ? item.options : [],
              correctAnswer: item.correctAnswer || item.answer || "",
              explanation: item.explanation || "",
            }));

            setWorkbook(validatedItems);
          }
        } catch (error) {
          console.error("Failed to load workbook:", error);
          if (!cancelled) {
            setWorkbook([]);
          }
        } finally {
          if (!cancelled) {
            setIsLoading(false);
          }
        }
      };

      loadWorkbook();
      return () => {
        cancelled = true;
      };
    }, [rawWorkbook, packId, dayNumber]);

    // ✅ workbookState destructuring
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
    } = workbookState;

    // ✅ currentIndexRef 동기화
    useEffect(() => {
      currentIndexRef.current = currentIndex;
    }, [currentIndex]);

    // ✅ 정리 작업
    useEffect(() => {
      return () => {
        if (autoProgressTimeoutRef.current) {
          window.clearTimeout(autoProgressTimeoutRef.current);
          autoProgressTimeoutRef.current = null;
        }
        warmupRef.current?.cancel();
      };
    }, []);

    // ✅ 현재 문제 셔플
    const shownItem = useMemo(() => {
      if (!workbook.length || currentIndex >= workbook.length) return null;

      const item = workbook[currentIndex];
      if (!item) return null;

      try {
        const shuffled = getShuffledItem(item, dayKey, shuffleWithSeed);

        // console.log("🔥 Shuffled item data:", {
        //   question: shuffled?.question || shuffled?.sentence,
        //   optionsLength: shuffled?.options?.length,
        //   correctAnswer: shuffled?.correctAnswer || shuffled?.answer,
        // });

        return {
          ...shuffled,
          question: shuffled.question || shuffled.sentence || "",
          options: Array.isArray(shuffled.options) ? shuffled.options : [],
          correctAnswer: shuffled.correctAnswer || shuffled.answer || "",
          explanation: shuffled.explanation || "",
        };
      } catch (error) {
        console.error("Failed to shuffle item:", error);
        return {
          ...item,
          question: item.question || item.sentence || "",
          options: Array.isArray(item.options) ? item.options : [],
          correctAnswer: item.correctAnswer || item.answer || "",
          explanation: item.explanation || "",
        };
      }
    }, [workbook, currentIndex, dayKey]);

    // ✅ 워밍업
    useEffect(() => {
      if (!workbook.length) return;

      warmupRef.current?.cancel();
      warmupRef.current = warmupShuffles(
        workbook,
        dayKey,
        currentIndex,
        8,
        shuffleWithSeed
      );

      return () => warmupRef.current?.cancel();
    }, [workbook, dayKey, currentIndex]);

    // ✅ 네비게이션 핸들러들
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

    const goToNext = useCallback(() => {
      const nextIndex = Math.min(
        currentIndexRef.current + 1,
        workbook.length - 1
      );
      navigateTo(nextIndex);
    }, [navigateTo, workbook.length]);

    const goToPrev = useCallback(() => {
      const prevIndex = Math.max(currentIndexRef.current - 1, 0);
      navigateTo(prevIndex);
    }, [navigateTo]);

    const goToIndex = useCallback(
      (i: number) => navigateTo(Math.max(0, Math.min(i, workbook.length - 1))),
      [navigateTo, workbook.length]
    );

    // ✅ 인터랙션 핸들러들
    const handleSpeak = useCallback(
      (text: string) => {
        const toSay = (text || "").trim();
        if (!toSay) return;
        speak(toSay, { lang: "en-US", rate: 0.8 });
      },
      [speak]
    );

    const handleAnswerSelect = useCallback(
      (answer: string) => {
        if (isCurrentAnswered) return;

        const idx = currentIndexRef.current;
        setSelectedAnswers((prev) => ({ ...prev, [idx]: answer }));

        if (currentSettings.autoPlayOnSelect && currentQuestion) {
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
        currentSettings.autoPlayOnSelect,
        setSelectedAnswers,
      ]
    );

    const handleCheckAnswer = useCallback(() => {
      const idx = currentIndexRef.current;
      const q = workbook[idx];
      if (!q || showResult[idx]) return;

      const selected = selectedAnswers[idx];
      if (!selected) return;

      const correct = getItemCorrectText(q);
      if (!correct) return;

      const isCorrect = normalize(selected) === normalize(correct);

      setAnsweredQuestions((prev) => new Set(prev).add(idx));

      if (isCorrect) {
        setCorrectAnswers((prev) => new Set(prev).add(idx));
      }

      setShowResult((prev) => ({ ...prev, [idx]: true }));
      workbookLogic.saveProgress(idx, isCorrect);

      // 자동 진행
      const shouldAutoProgress =
        currentSettings.studyMode === "assisted" &&
        currentSettings.autoProgressEnabled;

      if (shouldAutoProgress) {
        let nextIdx = -1;
        for (let i = idx + 1; i < workbook.length; i++) {
          if (!answeredQuestions.has(i)) {
            nextIdx = i;
            break;
          }
        }

        if (nextIdx === -1) nextIdx = Math.min(idx + 1, workbook.length - 1);

        autoProgressTimeoutRef.current = window.setTimeout(() => {
          navigateTo(nextIdx);
          autoProgressTimeoutRef.current = null;
        }, 1000) as unknown as number;
      }
    }, [
      selectedAnswers,
      showResult,
      workbook,
      setAnsweredQuestions,
      setCorrectAnswers,
      setShowResult,
      workbookLogic.saveProgress,
      currentSettings.studyMode,
      currentSettings.autoProgressEnabled,
      navigateTo,
      answeredQuestions,
    ]);

    const handleRetry = useCallback(() => {
      const idx = currentIndexRef.current;

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
        const c = { ...prev };
        delete c[idx];
        return c;
      });

      setSelectedAnswers((prev) => {
        const c = { ...prev };
        delete c[idx];
        return c;
      });
    }, [
      setAnsweredQuestions,
      setCorrectAnswers,
      setShowResult,
      setSelectedAnswers,
    ]);

    const handleToggleExplanation = useCallback(() => {
      const idx = currentIndexRef.current;
      setShowExplanation((prev) => ({ ...prev, [idx]: !prev[idx] }));
    }, [setShowExplanation]);

    // ✅ 설정 핸들러들
    const handleModeChange = useCallback(
      (mode: StudyModeType) => onSettingsChange?.({ studyMode: mode }),
      [onSettingsChange]
    );

    const handleAutoProgressChange = useCallback(
      (enabled: boolean) =>
        onSettingsChange?.({ autoProgressEnabled: enabled }),
      [onSettingsChange]
    );

    const handleAutoPlayChange = useCallback(
      (enabled: boolean) => onSettingsChange?.({ autoPlayOnSelect: enabled }),
      [onSettingsChange]
    );

    const handleComplete = useCallback(() => {
      markModeCompleted("workbook");
      onComplete?.();
    }, [markModeCompleted, onComplete]);

    // ✅ 제스처 핸들러
    const swipeHandlers = useSwipeGesture({
      onSwipeLeft: goToNext,
      onSwipeRight: goToPrev,
    });

    // ✅ 키보드 핸들러
    useEffect(() => {
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "ArrowRight") goToNext();
        if (e.key === "ArrowLeft") goToPrev();
        if (e.key === "Enter") handleCheckAnswer();
      };

      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [goToNext, goToPrev, handleCheckAnswer]);

    // ✅ 모든 Hook 호출 후 조건부 렌더링
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            워크북 준비 중...
          </h2>
          <p className="text-gray-600">잠시만 기다려주세요</p>
        </div>
      );
    }

    if (!workbook.length) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            학습할 워크북이 없습니다
          </h2>
          <p className="text-gray-600">
            Day {dayNumber}의 워크북을 확인해주세요
          </p>
        </div>
      );
    }

    if (!shownItem) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            문제를 불러올 수 없습니다
          </h2>
          <p className="text-gray-600">
            현재 인덱스: {currentIndex}, 전체: {workbook.length}
          </p>
        </div>
      );
    }

    // ✅ 정상 렌더링
    return (
      <div className="flex h-full min-h-[calc(100vh-217px)] lg:min-h-[calc(100vh-130px)] bg-gray-50 font-sans pb-20 lg:pb-0">
        <div className="flex-1 flex flex-col overflow-hidden">
          <main
            className="flex-1 flex flex-col justify-center items-center p-4 overflow-y-auto"
            {...swipeHandlers}
          >
            <div className="w-full max-w-xl">
              <WorkbookCard
                question={shownItem.question}
                options={shownItem.options}
                correctAnswer={shownItem.correctAnswer}
                explanation={shownItem.explanation}
                selectedAnswer={selectedAnswers[currentIndex]}
                showResult={showResult[currentIndex]}
                showExplanation={showExplanation[currentIndex]}
                isAnswered={isCurrentAnswered}
                isSpeaking={isSpeaking}
                onAnswerSelect={handleAnswerSelect}
                onSpeak={handleSpeak}
                onCheck={handleCheckAnswer}
                onRetry={handleRetry}
                onToggleExplanation={handleToggleExplanation}
              />

              <StudyPagination
                totalItems={workbook.length || 0}
                currentIndex={currentIndex || 0}
                completed={correctAnswers}
                secondary={answeredQuestions}
                onPrev={goToPrev}
                onNext={goToNext}
                onIndexChange={goToIndex}
              />

              <StudyCompleteButton
                isAllMastered={isAllAnswered}
                onComplete={handleComplete}
              />
            </div>
          </main>
        </div>

        <StudySidebar
          category={category}
          dayNumber={dayNumber}
          progress={Math.round(progress)}
          items={workbook}
          currentIndex={currentIndex}
          masteredCards={correctAnswers}
          studiedCards={answeredQuestions}
          correctAnswers={correctAnswers}
          answeredQuestions={answeredQuestions}
          score={score}
          onSelectIndex={goToIndex}
          settings={currentSettings}
          handleModeChange={handleModeChange}
          handleAutoProgressChange={handleAutoProgressChange}
          handleAutoPlayChange={handleAutoPlayChange}
          isSettingOpen={isSettingOpen ?? false}
        />
      </div>
    );
  }
);

WorkbookMode.displayName = "WorkbookMode";
export default WorkbookMode;
