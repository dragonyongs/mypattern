// src/components/study-modes/WorkbookMode.tsx

import React, { useState, useCallback, useMemo, useEffect } from "react";

import {
  ArrowLeft,
  ArrowRight,
  Volume2,
  CheckCircle,
  XCircle,
  RotateCcw,
  Settings,
  Brain,
  Lightbulb,
  Eye,
  EyeOff,
  Zap,
  Target,
  X,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Check,
  PenTool,
} from "lucide-react";

import { useSwipeGesture } from "@/shared/hooks/useSwipeGesture";
import { useTTS } from "@/shared/hooks/useTTS";
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
  const { speak, isSpeaking } = useTTS();

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

  // 핸들러들
  const handleModeChange = useCallback(
    (mode: "immersive" | "assisted") => {
      updateSetting("studyMode", mode);
      updateSetting("showMeaningEnabled", mode === "assisted");
    },
    [updateSetting]
  );

  const handleAutoProgressChange = useCallback(
    (enabled: boolean) => {
      updateSetting("autoProgressEnabled", enabled);
    },
    [updateSetting]
  );

  const handleSpeak = useCallback(
    (text: string) => {
      if (text) speak(text, { lang: "en-US", rate: 0.8 });
    },
    [speak]
  );

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

  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: goToNext,
    onSwipeRight: goToPrev,
  });

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

    // Zustand 스토어에서도 제거
    if (currentQuestion) {
      setItemCompleted(packId, dayNumber, currentQuestion.id, false);
    }
  }, [
    answeredQuestions,
    correctAnswers,
    showResult,
    showExplanation,
    selectedAnswers,
    currentIndex,
    currentQuestion,
    setItemCompleted,
    packId,
    dayNumber,
  ]);

  // 설명 토글
  const handleToggleExplanation = useCallback(() => {
    const newShowExplanation = { ...showExplanation };
    newShowExplanation[currentIndex] = !newShowExplanation[currentIndex];
    setShowExplanation(newShowExplanation);
  }, [showExplanation, currentIndex]);

  // 전체 완료 핸들러
  const handleComplete = useCallback(() => {
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

    workbook.forEach((item, index) => {
      const progress = getItemProgress(packId, dayNumber, item.id);
      if (progress) {
        answered.add(index);
        results[index] = true;
        if (progress.completed) {
          correct.add(index);
        }
      }
    });

    setAnsweredQuestions(answered);
    setCorrectAnswers(correct);
    setShowResult(results);

    console.debug("[WorkbookMode] 완료 상태 복원:", {
      packId,
      dayNumber,
      answeredCount: answered.size,
      correctCount: correct.size,
    });
  }, [workbook, getItemProgress, packId, dayNumber]);

  if (!workbook.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <PenTool className="w-16 h-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          학습할 워크북이 없습니다
        </h3>
        <p className="text-gray-600">Day {dayNumber}의 워크북을 확인해주세요</p>
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
    <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50">
      {/* 모바일 헤더 */}
      <div className="lg:hidden bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{category}</h2>
            <p className="text-sm text-gray-600">Day {dayNumber}</p>
          </div>
          <button
            onClick={() => setIsSettingOpen((p) => !p)}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all"
          >
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* 진행률 바 - 모바일 */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>진행률</span>
            <span>
              {answeredQuestions.size}/{workbook.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* 점수 표시 - 모바일 */}
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>정답률</span>
            <span>
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
        <StudySettingsPanel
          packId={packId}
          showMeaningLabel="설명 표시 허용"
          onClose={() => setIsSettingOpen(false)}
        />
      )}

      {/* 메인 컨텐츠 영역 */}
      <div className="flex-1 flex flex-col">
        {/* 메인 카드 영역 */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl">
            {/* 카드 상단 인디케이터 */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {workbook.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    idx === currentIndex
                      ? "w-8 bg-indigo-600"
                      : correctAnswers.has(idx)
                      ? "w-1.5 bg-green-500"
                      : answeredQuestions.has(idx)
                      ? "w-1.5 bg-red-400"
                      : "w-1.5 bg-gray-300 hover:bg-gray-400"
                  }`}
                />
              ))}
            </div>

            {/* 메인 카드 */}
            <div
              {...swipeHandlers}
              className="bg-white rounded-2xl shadow-xl p-8 min-h-[500px] flex flex-col justify-center relative"
            >
              {/* 완료 상태 뱃지 */}
              {isCurrentAnswered && (
                <div
                  className={`absolute top-4 right-4 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${
                    isCurrentCorrect
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {isCurrentCorrect ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      정답
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" />
                      오답
                    </>
                  )}
                </div>
              )}

              {/* 문제 텍스트 */}
              <div className="text-center mb-6">
                <p className="text-2xl font-medium text-gray-800 leading-relaxed mb-4">
                  {currentQuestion.question || currentQuestion.sentence}
                </p>

                {/* TTS 버튼 (문제에 영어가 있을 경우) */}
                {(currentQuestion.question || currentQuestion.sentence) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSpeak(
                        currentQuestion.question ||
                          currentQuestion.sentence ||
                          ""
                      );
                    }}
                    disabled={isSpeaking}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 text-gray-700 rounded-full text-sm font-medium transition-all disabled:opacity-50"
                  >
                    <Volume2 className="w-4 h-4" />
                    {isSpeaking ? "재생중" : "발음 듣기"}
                  </button>
                )}
              </div>

              {/* 선택지 */}
              <div className="space-y-3 mb-6">
                {currentQuestion.options.map((option, index) => {
                  const isSelected = selectedAnswers[currentIndex] === option;
                  const isCorrect = option === correctAnswer;
                  const showingResult = showResult[currentIndex];

                  let buttonClass =
                    "w-full p-4 text-left border-2 rounded-xl transition-all ";

                  if (showingResult) {
                    if (isCorrect) {
                      buttonClass +=
                        "border-green-500 bg-green-50 text-green-700";
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
                        <span>{option}</span>
                        {showingResult && (
                          <div className="flex-shrink-0 ml-2">
                            {isCorrect ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : isSelected ? (
                              <XCircle className="w-5 h-5 text-red-500" />
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
                  className={`text-center p-4 rounded-lg mb-4 ${
                    isCurrentCorrect
                      ? "bg-green-50 text-green-800"
                      : "bg-red-50 text-red-800"
                  }`}
                >
                  {isCurrentCorrect ? (
                    <>
                      <p className="font-medium">정답입니다! 🎉</p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium">
                        아쉽네요! 정답: {correctAnswer}
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* 설명 */}
              {showResult[currentIndex] &&
                settings.studyMode === "assisted" &&
                settings.showMeaningEnabled && (
                  <div className="mt-4">
                    <button
                      onClick={handleToggleExplanation}
                      className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-all"
                    >
                      <Lightbulb className="w-4 h-4" />
                      설명 {showExplanation[currentIndex] ? "숨기기" : "보기"}
                    </button>

                    {showExplanation[currentIndex] && (
                      <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                          {currentQuestion.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                )}

              {/* 힌트 텍스트 */}
              {!isCurrentAnswered && (
                <div className="text-center text-gray-400 text-sm mt-4">
                  {settings.studyMode === "immersive"
                    ? "🧠 영어로 직접 문제를 해결해보세요"
                    : "💡 필요시 설명을 확인하며 학습하세요"}
                </div>
              )}
            </div>

            {/* 네비게이션 버튼 */}
            <div className="flex items-center gap-4 mt-6">
              <button
                onClick={goToPrev}
                disabled={currentIndex === 0}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium transition-all hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="w-4 h-4" />
                이전
              </button>

              <div className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-600">
                {currentIndex + 1} / {workbook.length}
              </div>

              <button
                onClick={goToNext}
                disabled={currentIndex >= workbook.length - 1}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium transition-all hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                다음
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* 액션 버튼 */}
            <div className="mt-4">
              {!isCurrentAnswered ? (
                <button
                  onClick={handleCheckAnswer}
                  disabled={!selectedAnswers[currentIndex]}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all"
                >
                  <Check className="w-4 h-4" />
                  정답 확인
                </button>
              ) : (
                <button
                  onClick={handleRetry}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  다시 풀기
                </button>
              )}
            </div>

            {/* 전체 학습 완료 버튼 */}
            {isAllAnswered && (
              <div className="mt-4">
                <div className="bg-white rounded-xl p-6 text-center border-2 border-green-200">
                  <div className="text-4xl mb-2">
                    {score === workbook.length
                      ? "🎉"
                      : score >= Math.ceil(workbook.length * 0.7)
                      ? "👍"
                      : "💪"}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {score === workbook.length
                      ? "완벽합니다!"
                      : score >= Math.ceil(workbook.length * 0.7)
                      ? "잘하셨어요!"
                      : "다시 도전해보세요!"}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    총 {workbook.length}문제 중 {score}문제 정답 (
                    {Math.round((score / workbook.length) * 100)}%)
                  </p>
                  <button
                    onClick={handleComplete}
                    className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-lg transition-all shadow-lg"
                  >
                    워크북 학습 완료하기
                  </button>
                </div>
              </div>
            )}

            {/* 스와이프 힌트 */}
            <div className="text-center text-xs text-gray-400 mt-4">
              좌우 스와이프 또는 화살표로 이동
            </div>
          </div>
        </div>
      </div>

      {/* 데스크톱 사이드바 */}
      <div className="hidden lg:block w-80 bg-white">
        <div className="p-6 h-full overflow-y-auto">
          {/* 헤더 정보 */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              {category}
            </h2>
            <p className="text-sm text-gray-600">Day {dayNumber}</p>
          </div>

          {/* 진행률 */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>학습 진행률</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
              <div
                className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
              <span>완료</span>
              <span>
                {answeredQuestions.size}/{workbook.length}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>정답률</span>
              <span className="font-medium text-indigo-600">
                {workbook.length > 0
                  ? Math.round((score / workbook.length) * 100)
                  : 0}
                %
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>정답</span>
              <span>
                {score}/{workbook.length}
              </span>
            </div>
          </div>

          {/* 학습 현황 그리드 */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              문제 현황
            </h3>
            <div className="grid grid-cols-6 gap-2">
              {workbook.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`aspect-square rounded-lg text-xs font-semibold transition-all ${
                    idx === currentIndex
                      ? "bg-indigo-600 text-white shadow-md scale-110"
                      : correctAnswers.has(idx)
                      ? "bg-green-100 text-green-600 hover:bg-green-200"
                      : answeredQuestions.has(idx)
                      ? "bg-red-100 text-red-600 hover:bg-red-200"
                      : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                  }`}
                  title={
                    correctAnswers.has(idx)
                      ? "정답"
                      : answeredQuestions.has(idx)
                      ? "오답"
                      : "미완료"
                  }
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>

          {/* 학습 모드 설정 */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              학습 모드
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => handleModeChange("assisted")}
                className={`w-full px-4 py-3 rounded-lg text-left transition-all ${
                  settings.studyMode === "assisted"
                    ? "bg-indigo-50 border-2 border-indigo-600 text-indigo-600"
                    : "bg-gray-50 border-2 border-transparent text-gray-600 hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Lightbulb className="w-4 h-4" />
                  <span className="font-medium">도움 모드</span>
                </div>
                <p className="text-xs">설명을 바로 확인 가능</p>
              </button>

              <button
                onClick={() => handleModeChange("immersive")}
                className={`w-full px-4 py-3 rounded-lg text-left transition-all ${
                  settings.studyMode === "immersive"
                    ? "bg-indigo-50 border-2 border-indigo-600 text-indigo-600"
                    : "bg-gray-50 border-2 border-transparent text-gray-600 hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Brain className="w-4 h-4" />
                  <span className="font-medium">몰입 모드</span>
                </div>
                <p className="text-xs">영어로만 학습</p>
              </button>
            </div>
          </div>

          {/* 자동 진행 토글 */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">
                자동 진행
              </span>
              <button
                onClick={() =>
                  handleAutoProgressChange(!settings.autoProgressEnabled)
                }
                className={`w-11 h-6 rounded-full transition-all ${
                  settings.autoProgressEnabled ? "bg-indigo-600" : "bg-gray-300"
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.autoProgressEnabled
                      ? "translate-x-6"
                      : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* 설정 버튼 */}
          <button
            onClick={() => setIsSettingOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-all"
          >
            <Settings className="w-4 h-4" />
            상세 설정
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkbookMode;
