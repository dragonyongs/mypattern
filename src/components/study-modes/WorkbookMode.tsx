// src/components/study-modes/WorkbookMode.tsx
import React, { useState, useCallback, useMemo, useEffect } from "react";
import { CheckCircle, XCircle, ArrowRight, Lightbulb } from "lucide-react";
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

// 🎯 완료 모달 컴포넌트
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
      <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2">
            {score} / {totalQuestions} 정답
          </div>
          <p className="text-gray-600 mb-6">
            {isExcellent
              ? "🎉 훌륭합니다! 완벽하게 이해하셨네요!"
              : isGood
              ? "👍 잘하셨어요! 조금 더 연습해보세요."
              : "💪 다시 한 번 도전해보세요!"}
          </p>
          <button
            onClick={onNext}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg w-full transition-colors"
          >
            다른 날짜를 선택해주세요
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
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  const { markModeCompleted } = useDayProgress(packId, dayNumber);

  // 🎯 정답 가져오기 로직
  const getCorrectAnswer = useCallback((item: WorkbookItem): string => {
    return item.correctAnswer || item.answer || "";
  }, []);

  // 🎯 점수 계산 (모달에서만 사용)
  const currentScore = useMemo(() => {
    return Object.entries(answers).reduce((score, [questionId, userAnswer]) => {
      const question = workbook.find((q) => q.id === questionId);
      if (!question) return score;

      const correctAnswer = getCorrectAnswer(question);
      return score + (correctAnswer === userAnswer ? 1 : 0);
    }, 0);
  }, [answers, workbook, getCorrectAnswer]);

  const currentQuestion = workbook[currentQuestionIndex];

  // 🎯 이미 답변한 문제의 답안 표시
  useEffect(() => {
    if (currentQuestion) {
      const savedAnswer = answers[currentQuestion.id];
      if (savedAnswer) {
        // ✅ 이미 답변한 문제 → 답안 복원
        setSelectedAnswer(savedAnswer);
        setShowResult(true);
      } else {
        // ✅ 새 문제 → 깔끔하게 초기화
        setSelectedAnswer("");
        setShowResult(false);
      }
    }
  }, [currentQuestionIndex, currentQuestion, answers]);

  // 🎯 답안 제출 로직
  const handleAnswerSubmit = useCallback(() => {
    if (!currentQuestion || !selectedAnswer) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: selectedAnswer,
    }));
    setShowResult(true);
  }, [currentQuestion, selectedAnswer]);

  // 🎯 다음 문제로 이동 로직
  const handleNext = useCallback(() => {
    if (currentQuestionIndex < workbook.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedAnswer("");
      setShowResult(false);
    } else {
      setShowCompletionModal(true);
      markModeCompleted(dayNumber, "workbook");
      onComplete?.();
    }
  }, [
    currentQuestionIndex,
    workbook.length,
    dayNumber,
    markModeCompleted,
    onComplete,
  ]);

  // 🎯 옵션 선택 로직
  const handleOptionClick = useCallback(
    (option: string) => {
      if (!showResult) {
        setSelectedAnswer(option);
      }
    },
    [showResult]
  );

  if (!currentQuestion) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">문제를 로드할 수 없습니다.</p>
      </div>
    );
  }

  const correctAnswer = getCorrectAnswer(currentQuestion);
  const isCorrect = selectedAnswer === correctAnswer;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* 🎯 진행률 표시 */}
      <div className="text-center">
        <div className="text-sm text-gray-500 mb-2">
          문제 {currentQuestionIndex + 1} / {workbook.length}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${
                (Object.keys(answers).length / workbook.length) * 100
              }%`,
            }}
          />
        </div>
      </div>

      {/* 🎯 문제 카드 */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <div className="text-lg font-medium text-gray-800 mb-6">
          {currentQuestion.sentence?.split("_____").map((part, index) => (
            <React.Fragment key={index}>
              {part}
              {index === 0 && (
                <span
                  className={`inline-block min-w-[100px] mx-2 px-3 py-1 border-2 rounded font-bold transition-colors
                  ${
                    showResult
                      ? isCorrect
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-red-500 bg-red-50 text-red-700"
                      : "border-blue-300 bg-blue-50"
                  }
                `}
                >
                  {showResult && selectedAnswer ? selectedAnswer : "_____"}
                </span>
              )}
            </React.Fragment>
          )) || currentQuestion.question}
        </div>

        {/* 🎯 선택지 */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {currentQuestion.options.map((option) => (
            <button
              key={option}
              onClick={() => handleOptionClick(option)}
              disabled={showResult}
              className={`
                p-3 text-left border-2 rounded-lg transition-all font-medium
                ${
                  selectedAnswer === option
                    ? showResult
                      ? isCorrect
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-red-500 bg-red-50 text-red-700"
                      : "border-blue-500 bg-blue-50 text-blue-700"
                    : showResult && option === correctAnswer
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
                }
                ${showResult ? "cursor-default" : "cursor-pointer"}
              `}
            >
              {option}
              {showResult && option === correctAnswer && (
                <CheckCircle className="inline-block w-4 h-4 ml-2 text-green-600" />
              )}
              {showResult &&
                selectedAnswer === option &&
                option !== correctAnswer && (
                  <XCircle className="inline-block w-4 h-4 ml-2 text-red-600" />
                )}
            </button>
          ))}
        </div>

        {/* 🎯 설명 표시 */}
        {showResult && (
          <div
            className={`mt-4 p-4 rounded-lg ${
              isCorrect ? "bg-green-50" : "bg-orange-50"
            }`}
          >
            <div className="flex items-start gap-2">
              <CheckCircle
                className={`w-5 h-5 mt-0.5 ${
                  isCorrect ? "text-green-600" : "text-orange-600"
                }`}
              />
              <div>
                <p className="font-medium text-gray-700">
                  {isCorrect ? "정답입니다!" : "아쉽네요!"}
                </p>
                <p className="text-gray-600 text-sm mt-1">
                  {currentQuestion.explanation}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 🎯 버튼 영역 - 점수 표시 제거 */}
        <div className="flex justify-end items-center mt-6">
          {!showResult ? (
            <button
              onClick={handleAnswerSubmit}
              disabled={!selectedAnswer}
              className={`
                px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2
                ${
                  selectedAnswer
                    ? "bg-blue-500 text-white hover:bg-blue-600"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }
              `}
            >
              확인
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors flex items-center gap-2"
            >
              {currentQuestionIndex < workbook.length - 1 ? "다음" : "완료"}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 🎯 완료 모달 */}
      <CompletionModal
        isOpen={showCompletionModal}
        score={currentScore}
        totalQuestions={workbook.length}
        onNext={() => {
          setShowCompletionModal(false);
          onComplete?.();
        }}
        onClose={() => setShowCompletionModal(false)}
      />
    </div>
  );
};
