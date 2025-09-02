// src/components/study-modes/WorkbookMode.tsx
import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  Award,
  ArrowRight,
  Lightbulb,
} from "lucide-react";
import { useDayProgress } from "@/shared/hooks/useAppHooks";

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

// 🎯 완료 모달 컴포넌트 정의
const CompletionModal = ({
  isOpen,
  score,
  totalQuestions,
  onNext,
  onClose,
}: {
  isOpen: boolean;
  score: number;
  totalQuestions: number;
  onNext: () => void;
  onClose: () => void;
}) => {
  if (!isOpen) return null;

  const percentage = Math.round((score / totalQuestions) * 100);
  const isExcellent = percentage >= 80;
  const isGood = percentage >= 60;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl">
        <div className="mb-6">
          {isExcellent ? (
            <Award className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          ) : isGood ? (
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          ) : (
            <RefreshCw className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          )}

          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            워크북 완료!
          </h2>

          <div className="text-4xl font-bold mb-4">
            <span
              className={
                isExcellent
                  ? "text-yellow-600"
                  : isGood
                  ? "text-green-600"
                  : "text-blue-600"
              }
            >
              {percentage}%
            </span>
          </div>

          <p className="text-gray-600 mb-4">
            {score} / {totalQuestions} 정답
          </p>

          <p className="text-gray-700">
            {isExcellent
              ? "🎉 훌륭합니다! 완벽하게 이해하셨네요!"
              : isGood
              ? "👍 잘하셨어요! 조금 더 연습해보세요."
              : "💪 다시 한 번 도전해보세요!"}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            검토하기
          </button>
          <button
            onClick={onNext}
            className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowRight className="w-4 h-4" />
            다음으로
          </button>
        </div>
      </div>
    </div>
  );
};

export const WorkbookMode: React.FC<WorkbookModeProps> = ({
  workbook,
  dayNumber,
  category,
  packId,
  onComplete,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState<Record<string, boolean>>({});
  const [showCompletion, setShowCompletion] = useState(false);
  const [currentScore, setCurrentScore] = useState(0); // 🎯 실시간 점수 상태 추가

  const { markModeCompleted } = useDayProgress(packId, dayNumber);

  const currentItem = workbook[currentIndex];

  // 🎯 실시간 점수 계산
  const score = useMemo(() => {
    return Object.entries(answers).reduce((acc, [itemId, answer]) => {
      const item = workbook.find((w) => w.id === itemId);
      if (item && (answer === item.correctAnswer || answer === item.answer)) {
        return acc + 1;
      }
      return acc;
    }, 0);
  }, [answers, workbook]);

  // 🎯 점수 변화 감지하여 실시간 업데이트
  useEffect(() => {
    setCurrentScore(score);
  }, [score]);

  const percentage = useMemo(() => {
    return workbook.length > 0
      ? Math.round((score / workbook.length) * 100)
      : 0;
  }, [score, workbook.length]);

  const isCompleted = useMemo(() => {
    return (
      Object.keys(answers).length === workbook.length && workbook.length > 0
    );
  }, [answers, workbook.length]);

  // 🎯 정답 선택 핸들러 (즉시 점수 반영)
  const handleAnswer = useCallback((itemId: string, answer: string) => {
    setAnswers((prev) => {
      const newAnswers = { ...prev, [itemId]: answer };

      // 🔥 정답 확인 즉시 결과 표시
      setShowResults((prevResults) => ({ ...prevResults, [itemId]: true }));

      return newAnswers;
    });
  }, []);

  // 🎯 다음 문제로 이동
  const handleNext = useCallback(() => {
    if (currentIndex < workbook.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, workbook.length]);

  // 🎯 이전 문제로 이동
  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  // 🎯 완료 처리
  const handleComplete = useCallback(() => {
    markModeCompleted(dayNumber, "workbook");
    setShowCompletion(true);
  }, [markModeCompleted, dayNumber]);

  // 🎯 완료 조건 체크 (점수 반영 후)
  useEffect(() => {
    if (isCompleted && !showCompletion) {
      // 🔥 약간의 지연 후 완료 처리 (상태 업데이트 완료 대기)
      const timer = setTimeout(() => {
        handleComplete();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isCompleted, showCompletion, handleComplete]);

  // 🎯 완료 모달 핸들러들
  const handleModalNext = useCallback(() => {
    setShowCompletion(false);
    onComplete?.(); // 부모 컴포넌트에게 완료 알림
  }, [onComplete]);

  const handleModalClose = useCallback(() => {
    setShowCompletion(false);
    // 검토 모드로 돌아가거나 그대로 유지
  }, []);

  // 정답 확인 함수
  const isCorrect = useCallback(
    (itemId: string, answer: string) => {
      const item = workbook.find((w) => w.id === itemId);
      return item && (answer === item.correctAnswer || answer === item.answer);
    },
    [workbook]
  );

  if (!workbook.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            Day {dayNumber}에 워크북 문제가 없습니다
          </h3>
          <p className="text-gray-500">다른 날짜를 선택해주세요</p>
        </div>
      </div>
    );
  }

  if (!currentItem) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  const questionText = currentItem.sentence || currentItem.question || "";
  const correctAnswer = currentItem.correctAnswer || currentItem.answer || "";
  const userAnswer = answers[currentItem.id];
  const showResult = showResults[currentItem.id];

  return (
    <>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* 헤더 */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-gray-800 mb-2">
            Day {dayNumber} - {category}
          </h1>
          <p className="text-sm text-gray-600 mb-4">
            빈칸에 들어갈 알맞은 단어를 선택하세요
          </p>

          {/* 🎯 실시간 진행률 바 */}
          <div className="w-full max-w-md mx-auto bg-gray-200 rounded-full h-2 mb-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${
                  (Object.keys(answers).length / workbook.length) * 100
                }%`,
              }}
            />
          </div>
          <p className="text-xs text-gray-500">
            {Object.keys(answers).length} / {workbook.length} 문제 완료
          </p>
        </div>

        {/* 문제 카드 */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <div className="text-sm text-gray-500 mb-2">
              문제 {currentIndex + 1} / {workbook.length}
            </div>

            {/* 문제 문장 */}
            <div className="text-xl font-medium text-gray-800 leading-relaxed mb-6">
              {questionText.split("_____").map((part, index) => (
                <span key={index}>
                  {part}
                  {index === 0 && (
                    <span
                      className={`inline-block min-w-[120px] mx-2 px-3 py-1 rounded-lg border-2 font-semibold ${
                        showResult
                          ? isCorrect(currentItem.id, userAnswer!)
                            ? "bg-green-100 border-green-500 text-green-700"
                            : "bg-red-100 border-red-500 text-red-700"
                          : "bg-gray-100 border-gray-300 text-gray-500"
                      }`}
                    >
                      {showResult ? userAnswer : "_____"}
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>

          {/* 선택지 */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {currentItem.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(currentItem.id, option)}
                disabled={showResult}
                className={`p-3 text-left border rounded-lg transition-all font-medium ${
                  userAnswer === option
                    ? showResult
                      ? isCorrect(currentItem.id, option)
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-red-500 bg-red-50 text-red-700"
                      : "border-blue-500 bg-blue-50 text-blue-700"
                    : showResult && option === correctAnswer
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
                } ${showResult ? "cursor-not-allowed" : "cursor-pointer"}`}
              >
                <div className="flex items-center justify-between">
                  <span>{option}</span>
                  {showResult &&
                    userAnswer === option &&
                    (isCorrect(currentItem.id, option) ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    ))}
                  {showResult &&
                    option === correctAnswer &&
                    userAnswer !== option && (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    )}
                </div>
              </button>
            ))}
          </div>

          {/* 결과 및 설명 */}
          {showResult && (
            <div
              className={`p-4 rounded-lg mb-4 ${
                isCorrect(currentItem.id, userAnswer!)
                  ? "bg-green-100 border border-green-300"
                  : "bg-red-100 border border-red-300"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {isCorrect(currentItem.id, userAnswer!) ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800">
                      정답입니다!
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span className="font-medium text-red-800">
                      틀렸습니다. 정답: {correctAnswer}
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Lightbulb className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium text-blue-800">설명</span>
                  <p className="text-gray-700 mt-1">
                    {currentItem.explanation}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 네비게이션 */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
          >
            이전
          </button>

          {currentIndex < workbook.length - 1 ? (
            <button
              onClick={handleNext}
              disabled={!showResult}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
            >
              다음
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={!isCompleted}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-600 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              완료
            </button>
          )}
        </div>

        {/* 🎯 실시간 점수 표시 */}
        <div className="bg-white rounded-xl p-6 shadow-lg max-w-md mx-auto">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              현재 점수
            </h3>
            <div className="text-4xl font-bold mb-2">
              <span
                className={
                  currentScore === workbook.length
                    ? "text-green-600"
                    : currentScore >= workbook.length * 0.8
                    ? "text-blue-600"
                    : "text-orange-600"
                }
              >
                {percentage}%
              </span>
            </div>
            <p className="text-gray-600 mb-4">
              {currentScore} / {workbook.length} 정답
            </p>

            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  currentScore === workbook.length
                    ? "bg-green-500"
                    : currentScore >= workbook.length * 0.8
                    ? "bg-blue-500"
                    : "bg-orange-500"
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 완료 모달 */}
      <CompletionModal
        isOpen={showCompletion}
        score={currentScore}
        totalQuestions={workbook.length}
        onNext={handleModalNext}
        onClose={handleModalClose}
      />
    </>
  );
};
