// src/components/study-modes/WorkbookMode.tsx
import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  CheckCircle,
  XCircle,
  ArrowLeft,
  ArrowRight,
  Lightbulb,
  Settings,
  RotateCcw,
} from "lucide-react";
import { useDayProgress } from "@/shared/hooks/useAppHooks";
import { useStudySettings } from "@/shared/hooks/useAppHooks";
import { StudySettingsPanel } from "@/shared/components/StudySettingsPanel";
import { useStudyProgressStore } from "@/stores/studyProgressStore";

// =======================================================================
// 타입 정의
// =======================================================================
interface WorkbookItem {
  id: string;
  type?: "fill-blank" | "multiple-choice";
  sentence?: string;
  question?: string;
  options: string[];
  answer?: string;
  correctAnswer?: string;
  explanation: string;
}

interface WorkbookModeProps {
  workbook: WorkbookItem[];
  dayNumber: number;
  category: string;
  packId: string;
  onComplete?: () => void;
}

// =======================================================================
// 메인 컴포넌트: WorkbookMode
// =======================================================================
export const WorkbookMode: React.FC<WorkbookModeProps> = ({
  workbook: rawWorkbook,
  dayNumber,
  category,
  packId,
  onComplete,
}) => {
  const workbook = Array.isArray(rawWorkbook) ? rawWorkbook : [];
  const workbookIds = useMemo(() => workbook.map((w) => w.id), [workbook]);

  // 상태 관리
  const [currentIndex, setCurrentIndex] = useState(0);
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
  const [isSettingOpen, setIsSettingOpen] = useState(false);

  // 공통 훅 사용
  const { settings, updateSetting } = useStudySettings(packId);
  const { markModeCompleted } = useDayProgress(packId, dayNumber);
  const { setItemCompleted, getItemProgress } = useStudyProgressStore();

  // 현재 문제 정보
  const currentQuestion = useMemo(
    () => workbook[currentIndex],
    [workbook, currentIndex]
  );
  const correctAnswer =
    currentQuestion?.correctAnswer || currentQuestion?.answer || "";

  // 진행률 계산
  const progress = useMemo(() => {
    return workbook.length > 0
      ? (answeredQuestions.size / workbook.length) * 100
      : 0;
  }, [answeredQuestions.size, workbook.length]);

  const score = useMemo(() => {
    return correctAnswers.size;
  }, [correctAnswers.size]);

  const isAllAnswered = useMemo(() => {
    return workbook.length > 0 && answeredQuestions.size === workbook.length;
  }, [answeredQuestions.size, workbook.length]);

  const isCurrentAnswered = useMemo(() => {
    return answeredQuestions.has(currentIndex);
  }, [answeredQuestions, currentIndex]);

  const isCurrentCorrect = useMemo(() => {
    return correctAnswers.has(currentIndex);
  }, [correctAnswers, currentIndex]);

  // 네비게이션
  const goToNext = useCallback(() => {
    if (currentIndex < workbook.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, workbook.length]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  // 답안 선택 핸들러
  const handleAnswerSelect = useCallback(
    (answer: string) => {
      if (isCurrentAnswered) return; // 이미 답변한 문제는 변경 불가

      const newSelectedAnswers = { ...selectedAnswers };
      newSelectedAnswers[currentIndex] = answer;
      setSelectedAnswers(newSelectedAnswers);
    },
    [selectedAnswers, currentIndex, isCurrentAnswered]
  );

  // 답안 확인 핸들러
  const handleCheckAnswer = useCallback(() => {
    if (!selectedAnswers[currentIndex] || isCurrentAnswered) return;

    const selectedAnswer = selectedAnswers[currentIndex];
    const isCorrect = selectedAnswer === correctAnswer;

    // 상태 업데이트
    const newAnswered = new Set(answeredQuestions);
    newAnswered.add(currentIndex);
    setAnsweredQuestions(newAnswered);

    if (isCorrect) {
      const newCorrect = new Set(correctAnswers);
      newCorrect.add(currentIndex);
      setCorrectAnswers(newCorrect);
    }

    // 결과 표시
    const newShowResult = { ...showResult };
    newShowResult[currentIndex] = true;
    setShowResult(newShowResult);

    // Zustand 스토어에 저장
    if (currentQuestion) {
      setItemCompleted(packId, dayNumber, currentQuestion.id, isCorrect);
    }

    // 자동 진행이 설정되어 있으면 다음으로 이동
    if (settings.autoProgressEnabled && currentIndex < workbook.length - 1) {
      setTimeout(() => {
        goToNext();
      }, 2000); // 2초 후 자동 이동
    }
  }, [
    selectedAnswers,
    currentIndex,
    isCurrentAnswered,
    correctAnswer,
    answeredQuestions,
    correctAnswers,
    showResult,
    currentQuestion,
    setItemCompleted,
    packId,
    dayNumber,
    settings.autoProgressEnabled,
    goToNext,
    workbook.length,
  ]);

  // 다시 풀기 핸들러
  const handleRetry = useCallback(() => {
    const newAnswered = new Set(answeredQuestions);
    newAnswered.delete(currentIndex);
    setAnsweredQuestions(newAnswered);

    const newCorrect = new Set(correctAnswers);
    newCorrect.delete(currentIndex);
    setCorrectAnswers(newCorrect);

    const newShowResult = { ...showResult };
    delete newShowResult[currentIndex];
    setShowResult(newShowResult);

    const newShowExplanation = { ...showExplanation };
    delete newShowExplanation[currentIndex];
    setShowExplanation(newShowExplanation);

    const newSelectedAnswers = { ...selectedAnswers };
    delete newSelectedAnswers[currentIndex];
    setSelectedAnswers(newSelectedAnswers);
  }, [
    answeredQuestions,
    correctAnswers,
    showResult,
    showExplanation,
    selectedAnswers,
    currentIndex,
  ]);

  // 설명 토글
  const handleToggleExplanation = useCallback(() => {
    const newShowExplanation = { ...showExplanation };
    newShowExplanation[currentIndex] = !newShowExplanation[currentIndex];
    setShowExplanation(newShowExplanation);
  }, [showExplanation, currentIndex]);

  // 전체 완료 핸들러
  const handleCompleteMode = useCallback(() => {
    markModeCompleted(dayNumber, "workbook");
    onComplete?.();
  }, [markModeCompleted, dayNumber, onComplete]);

  // 키보드 이벤트
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

  // 로컬스토리지에서 진행상태 복원
  useEffect(() => {
    const answered = new Set<number>();
    const correct = new Set<number>();
    const results: Record<number, boolean> = {};
    const answers: Record<number, string> = {};

    workbook.forEach((item, index) => {
      const progress = getItemProgress(packId, dayNumber, item.id);
      if (progress) {
        answered.add(index);
        results[index] = true;
        if (progress.completed) {
          correct.add(index);
        }
        // 선택한 답안은 복원하지 않음 (보안상 이유)
      }
    });

    setAnsweredQuestions(answered);
    setCorrectAnswers(correct);
    setShowResult(results);
  }, [workbook, getItemProgress, packId, dayNumber]);

  if (!workbook.length) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-500">
          Day {dayNumber}에 학습할 워크북이 없습니다
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-500">문제를 로드할 수 없습니다</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 relative">
      {/* 헤더 영역 */}
      <div className="w-full max-w-2xl mx-auto mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">
              Day {dayNumber} - {category}
            </h2>
            <p className="text-sm text-gray-500">
              {settings.studyMode === "immersive"
                ? "🧠 영어로 직접 문제를 해결해보세요"
                : "💡 필요시 설명을 확인하며 학습하세요"}
            </p>
          </div>
          <button
            onClick={() => setIsSettingOpen((p) => !p)}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* 진행률 */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>학습 진행률</span>
            <span>
              {answeredQuestions.size} / {workbook.length} 완료
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>
              현재: {currentIndex + 1} / {workbook.length}
            </span>
            <span>
              정답률:{" "}
              {workbook.length > 0
                ? Math.round((score / workbook.length) * 100)
                : 0}
              %
            </span>
          </div>
        </div>
      </div>

      {/* 설정 패널 */}
      {isSettingOpen && (
        <div className="absolute top-20 right-4 left-4 z-20">
          <StudySettingsPanel
            packId={packId}
            showMeaningLabel="설명 표시 허용"
          />
        </div>
      )}

      {/* 메인 카드 */}
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-2xl mx-auto">
        {/* 문제 텍스트 */}
        <div className="text-center mb-8">
          <div className="text-xl md:text-2xl font-medium text-gray-800 leading-relaxed mb-6">
            {currentQuestion.question || currentQuestion.sentence}
          </div>

          {/* 선택지 */}
          <div className="grid grid-cols-1 gap-3 mb-6">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswers[currentIndex] === option;
              const isCorrect = option === correctAnswer;
              const showingResult = showResult[currentIndex];

              let buttonClass =
                "w-full p-4 text-left border-2 rounded-xl transition-all ";

              if (showingResult) {
                if (isCorrect) {
                  buttonClass += "border-green-500 bg-green-50 text-green-700";
                } else if (isSelected && !isCorrect) {
                  buttonClass += "border-red-500 bg-red-50 text-red-700";
                } else {
                  buttonClass += "border-gray-200 bg-gray-50 text-gray-500";
                }
              } else if (isSelected) {
                buttonClass += "border-blue-500 bg-blue-50 text-blue-700";
              } else {
                buttonClass +=
                  "border-gray-300 hover:border-blue-400 hover:bg-blue-50";
              }

              if (isCurrentAnswered) {
                buttonClass += " cursor-not-allowed";
              }

              return (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(option)}
                  disabled={isCurrentAnswered}
                  className={buttonClass}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base">{option}</span>
                    {showingResult && (
                      <div className="ml-2">
                        {isCorrect ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : isSelected ? (
                          <XCircle className="w-5 h-5 text-red-600" />
                        ) : null}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* 결과 표시 */}
          {showResult[currentIndex] && (
            <div
              className={`p-4 rounded-lg mb-4 ${
                isCurrentCorrect
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                {isCurrentCorrect ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">정답입니다! 🎉</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5" />
                    <span className="font-medium">
                      아쉽네요! 정답: {correctAnswer}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* 설명 */}
          {showResult[currentIndex] &&
            settings.studyMode === "assisted" &&
            settings.showMeaningEnabled && (
              <div className="mb-4">
                <button
                  onClick={handleToggleExplanation}
                  className="flex items-center gap-2 mx-auto px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  <Lightbulb className="w-4 h-4" />
                  설명 {showExplanation[currentIndex] ? "숨기기" : "보기"}
                </button>

                {showExplanation[currentIndex] && (
                  <div className="mt-4 p-4 bg-gray-100 rounded-lg text-sm text-gray-700 text-left">
                    {currentQuestion.explanation}
                  </div>
                )}
              </div>
            )}
        </div>
      </div>

      {/* 컨트롤 버튼들 */}
      <div className="flex items-center gap-6 mt-8">
        {!isCurrentAnswered ? (
          <button
            onClick={handleCheckAnswer}
            disabled={!selectedAnswers[currentIndex]}
            className="px-8 py-3 bg-blue-500 text-white rounded-full font-medium shadow-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            정답 확인
          </button>
        ) : (
          <button
            onClick={handleRetry}
            className="flex items-center gap-2 px-6 py-3 bg-gray-500 text-white rounded-full font-medium shadow-lg hover:bg-gray-600 transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
            다시 풀기
          </button>
        )}
      </div>

      {/* 페이지 인디케이터 */}
      <div className="flex items-center gap-2 mt-8">
        <button
          onClick={goToPrev}
          disabled={currentIndex === 0}
          className="p-2 rounded-full disabled:opacity-30 text-gray-500 hover:bg-gray-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex gap-2 mx-4">
          {workbook.map((item, index) => (
            <button
              key={item.id}
              onClick={() => setCurrentIndex(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentIndex
                  ? "bg-blue-500 scale-110"
                  : correctAnswers.has(index)
                  ? "bg-green-500"
                  : answeredQuestions.has(index)
                  ? "bg-red-400"
                  : "bg-gray-300"
              }`}
              title={
                correctAnswers.has(index)
                  ? "정답"
                  : answeredQuestions.has(index)
                  ? "오답"
                  : "미완료"
              }
            />
          ))}
        </div>

        <button
          onClick={goToNext}
          disabled={currentIndex === workbook.length - 1}
          className="p-2 rounded-full disabled:opacity-30 text-gray-500 hover:bg-gray-100"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {/* 진행 카운터 */}
      <p className="text-sm text-gray-500 mt-4">
        문제 {currentIndex + 1} / {workbook.length}
      </p>

      {/* 전체 학습 완료 버튼 */}
      {isAllAnswered && (
        <div className="mt-8">
          <div className="text-center mb-4">
            <div className="text-2xl mb-2">
              {score === workbook.length
                ? "🎉"
                : score >= Math.ceil(workbook.length * 0.7)
                ? "👍"
                : "💪"}
            </div>
            <div className="text-lg font-medium text-gray-800 mb-1">
              {score === workbook.length
                ? "완벽합니다!"
                : score >= Math.ceil(workbook.length * 0.7)
                ? "잘하셨어요!"
                : "다시 도전해보세요!"}
            </div>
            <div className="text-sm text-gray-600">
              총 {workbook.length}문제 중 {score}문제 정답 (
              {Math.round((score / workbook.length) * 100)}%)
            </div>
          </div>
          <button
            onClick={handleCompleteMode}
            className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-8 py-3 rounded-full font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
          >
            워크북 학습 완료하기
          </button>
        </div>
      )}
    </div>
  );
};

export default WorkbookMode;
