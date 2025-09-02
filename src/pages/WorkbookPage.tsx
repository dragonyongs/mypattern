// src/pages/WorkbookPage.tsx
import React, { useState } from "react";
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  Award,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCurrentDayData } from "@/shared/hooks/usePackData";
import { useCurrentDay } from "@/shared/hooks/useAppHooks"; // 경로 수정
import { useAppStore } from "@/stores/appStore";

const CompletionModal = ({
  isOpen,
  score,
  totalQuestions,
  onReview,
  onNext,
  onClose,
}: {
  isOpen: boolean;
  score: number;
  totalQuestions: number;
  onReview: () => void;
  onNext: () => void;
  onClose: () => void;
}) => {
  if (!isOpen) return null;

  const percentage = Math.round((score / totalQuestions) * 100);
  const isExcellent = percentage >= 80;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 text-center">
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${
            isExcellent ? "bg-yellow-100" : "bg-blue-100"
          }`}
        >
          <Award
            className={`w-8 h-8 ${
              isExcellent ? "text-yellow-600" : "text-blue-600"
            }`}
          />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          워크북 완료! 🎉
        </h2>
        <div className="mb-6">
          <div className="text-4xl font-bold text-blue-600 mb-2">
            {percentage}%
          </div>
          <p className="text-gray-600">
            {score}/{totalQuestions} 정답
          </p>
        </div>
        <div className="space-y-3">
          <button
            onClick={onNext}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
            다음 단계로
          </button>
          <button
            onClick={onReview}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            다시 풀기
          </button>
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default function WorkbookPage() {
  const navigate = useNavigate();
  const { workbook, category } = useCurrentDayData();
  const { currentDay } = useCurrentDay();
  const { markModeCompleted, markDayCompleted } = useAppStore(); // 직접 AppStore 사용

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState<Record<string, boolean>>({});
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // 로딩 상태
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">데이터 로드 실패: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-purple-600 text-white rounded"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  // 데이터 없음
  if (workbook.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Day {currentDay}에 워크북 문제가 없습니다.
          </p>
          <button
            onClick={() => navigate("/app/calendar")}
            className="px-4 py-2 bg-purple-600 text-white rounded"
          >
            달력으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const currentQuiz = workbook[currentIndex];
  const progress = ((currentIndex + 1) / workbook.length) * 100;
  const currentAnswer = answers[currentQuiz.question];
  const showCurrentResult = showResults[currentQuiz.question];
  const isCorrect = currentAnswer === currentQuiz.answer;
  const isLastQuestion = currentIndex === workbook.length - 1;

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));

    // 즉시 결과 표시
    setTimeout(() => {
      setShowResults((prev) => ({ ...prev, [questionId]: true }));

      // 정답이면 자동으로 다음 문제로
      if (answer === currentQuiz.answer && !isLastQuestion) {
        setTimeout(() => {
          setCurrentIndex((prev) => prev + 1);
        }, 1500);
      } else if (isLastQuestion) {
        // 마지막 문제면 완료 모달 표시
        setTimeout(() => {
          setShowCompletionModal(true);
        }, 1500);
      }
    }, 100);
  };

  const goToNext = () => {
    if (currentIndex < workbook.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setShowCompletionModal(true);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const resetQuiz = () => {
    setCurrentIndex(0);
    setAnswers({});
    setShowResults({});
    setShowCompletionModal(false);
  };

  const handleComplete = () => {
    markModeCompleted(currentDay, "workbook");
    markDayCompleted(currentDay);
    setShowCompletionModal(false);
    navigate("/calendar");
  };

  // 점수 계산
  const calculateScore = () => {
    return Object.entries(answers).filter(([questionId, answer]) => {
      const quiz = workbook.find((q) => q.question === questionId);
      return quiz && quiz.answer === answer;
    }).length;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
      <div className="w-full max-w-none">
        {/* 헤더 */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-xl font-bold text-gray-900">
                {category} - Workbook Quiz
              </h1>
              <div className="text-lg font-semibold text-gray-700">
                {currentIndex + 1}/{workbook.length}
              </div>
            </div>

            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 transition-all duration-500 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>

            <p className="text-sm text-gray-500 mt-2">
              Real VOCA Basic - Day {currentDay}
            </p>
          </div>
        </div>

        {/* 메인 퀴즈 카드 */}
        <div className="flex items-center justify-center py-8 px-4">
          <div className="w-full max-w-2xl">
            <div className="bg-white rounded-3xl shadow-xl p-8 md:p-10 min-h-[500px] flex flex-col">
              {/* 문제 번호 */}
              <div className="flex justify-between items-center mb-6">
                <span className="px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                  Question {currentIndex + 1}
                </span>
                {showCurrentResult && (
                  <div
                    className={`flex items-center gap-2 ${
                      isCorrect ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {isCorrect ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <XCircle className="w-5 h-5" />
                    )}
                    <span className="font-medium">
                      {isCorrect ? "정답!" : "오답"}
                    </span>
                  </div>
                )}
              </div>

              {/* 문제 문장 */}
              <div className="mb-8">
                <p className="text-2xl md:text-3xl font-medium text-gray-800 leading-relaxed text-center">
                  {currentQuiz.question.split("_____").map((part, index) => (
                    <span key={index}>
                      {part}
                      {index === 0 && (
                        <span className="inline-block min-w-[120px] mx-2 px-4 py-2 border-b-3 border-purple-500 border-dashed text-purple-600 font-bold">
                          {showCurrentResult && currentAnswer
                            ? currentAnswer
                            : "_____"}
                        </span>
                      )}
                    </span>
                  ))}
                </p>
              </div>

              {/* 선택지 */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                {currentQuiz.options.map((option, index) => {
                  const isSelected = currentAnswer === option;
                  const isCorrectOption = option === currentQuiz.answer;

                  let buttonStyle =
                    "p-4 text-center rounded-xl border-2 font-medium transition-all duration-200 ";

                  if (showCurrentResult) {
                    if (isCorrectOption) {
                      buttonStyle +=
                        "border-green-500 bg-green-50 text-green-800";
                    } else if (isSelected && !isCorrectOption) {
                      buttonStyle += "border-red-500 bg-red-50 text-red-800";
                    } else {
                      buttonStyle += "border-gray-200 bg-gray-50 text-gray-500";
                    }
                  } else {
                    buttonStyle += isSelected
                      ? "border-purple-500 bg-purple-50 text-purple-800 scale-105"
                      : "border-gray-300 hover:border-purple-300 hover:bg-purple-50 hover:scale-105";
                  }

                  return (
                    <button
                      key={index}
                      onClick={() =>
                        !showCurrentResult &&
                        handleAnswer(currentQuiz.question, option)
                      }
                      disabled={showCurrentResult}
                      className={buttonStyle}
                    >
                      <div className="flex items-center justify-center gap-3">
                        <span className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold">
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span className="text-lg">{option}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* 설명 */}
              {showCurrentResult && currentQuiz.explanation && (
                <div className="p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
                  <p className="text-blue-800 text-sm">
                    <span className="font-medium">💡 설명: </span>
                    {currentQuiz.explanation}
                  </p>
                </div>
              )}
            </div>

            {/* 네비게이션 */}
            <div className="flex items-center justify-between mt-8 px-4">
              <button
                onClick={goToPrevious}
                disabled={currentIndex === 0}
                className="flex items-center gap-2 px-6 py-3 text-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors rounded-xl hover:bg-white hover:shadow-md"
              >
                <span className="font-medium">이전 문제</span>
              </button>

              <div className="flex items-center gap-2">
                {workbook.map((_, index) => (
                  <div
                    key={index}
                    className={`w-3 h-3 rounded-full transition-all duration-200 ${
                      index === currentIndex
                        ? "bg-purple-500 scale-125"
                        : answers[workbook[index].question] ===
                          workbook[index].answer
                        ? "bg-green-400"
                        : answers[workbook[index].question]
                        ? "bg-red-400"
                        : "bg-gray-300"
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={goToNext}
                disabled={
                  !currentAnswer || currentIndex === workbook.length - 1
                }
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                <span>다음 문제</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <CompletionModal
        isOpen={showCompletionModal}
        score={calculateScore()}
        totalQuestions={workbook.length}
        onReview={resetQuiz}
        onNext={handleComplete}
        onClose={() => setShowCompletionModal(false)}
      />
    </div>
  );
}
