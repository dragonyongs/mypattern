import React, { useState, useEffect } from "react";
import { CheckCircle, Circle, ArrowRight, RotateCcw } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { useNavigate } from "react-router-dom";
import {
  levelTestQuestions,
  getAdaptiveQuestions,
} from "@/data/levelTestQuestions";
import { assessLevel } from "@/utils/levelAssessment";

export function LevelTestPage() {
  const { user, updateUser } = useAuthStore();
  const {
    currentQuestionIndex,
    levelTestAnswers,
    levelTestCompleted,
    answerQuestion,
    setCurrentQuestion,
    completeLevelTest,
    startOnboarding,
    resetOnboarding,
  } = useOnboardingStore();

  const navigate = useNavigate();
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [questions] = useState(() => getAdaptiveQuestions());

  // 온보딩 시작
  useEffect(() => {
    startOnboarding();
  }, [startOnboarding]);

  // 인증 확인
  useEffect(() => {
    if (!user) {
      navigate("/landing", { replace: true });
    }
  }, [user, navigate]);

  // 이미 완료된 테스트라면 결과 페이지로
  useEffect(() => {
    if (levelTestCompleted) {
      navigate("/onboarding/interests", { replace: true });
    }
  }, [levelTestCompleted, navigate]);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  const handleAnswerSelect = (optionIndex: number) => {
    setSelectedAnswer(optionIndex);
  };

  const handleNext = () => {
    if (selectedAnswer === null || !currentQuestion) return;

    const selectedOption = currentQuestion.options[selectedAnswer];

    // 답변 저장
    answerQuestion(
      currentQuestion.id,
      selectedAnswer,
      selectedOption.isCorrect
    );

    if (currentQuestionIndex < questions.length - 1) {
      // 다음 문제로
      setCurrentQuestion(currentQuestionIndex + 1);
      setSelectedAnswer(null);
    } else {
      // 테스트 완료
      completeLevelTest();

      // 기본 레벨 평가만 사용
      const allAnswers = [
        ...levelTestAnswers,
        {
          questionId: currentQuestion.id,
          selectedOption: selectedAnswer,
          isCorrect: selectedOption.isCorrect,
        },
      ];

      const correctCount = allAnswers.filter((a) => a.isCorrect).length;
      const accuracy = correctCount / allAnswers.length;

      let finalLevel: "beginner" | "intermediate" | "advanced";
      if (accuracy >= 0.8) finalLevel = "advanced";
      else if (accuracy >= 0.5) finalLevel = "intermediate";
      else finalLevel = "beginner";

      updateUser({ level: finalLevel });

      console.log("📊 최종 평가:", {
        correctCount,
        total: allAnswers.length,
        accuracy,
        finalLevel,
      });
      navigate("/onboarding/interests", { replace: true });
    }
  };

  const handleReset = () => {
    resetOnboarding();
    setSelectedAnswer(null);
    setCurrentQuestion(0);
  };

  if (!currentQuestion) {
    return <div>문제를 불러오는 중...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-sm mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate("/landing")}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← 뒤로가기
          </button>
          <button
            onClick={handleReset}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="테스트 다시 시작"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        {/* 진행률 표시 */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>레벨 테스트</span>
            <span>
              {currentQuestionIndex + 1} / {questions.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* 질문 카드 */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 mb-6">
          {/* 문제 타입 표시 */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
              {currentQuestion.type} · {currentQuestion.difficulty}
            </span>
            <span className="text-xs text-gray-400">
              {currentQuestion.tags.join(", ")}
            </span>
          </div>

          <h2 className="text-lg font-medium text-gray-900 mb-6">
            {currentQuestion.question}
          </h2>

          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => (
              <button
                key={option.id}
                onClick={() => handleAnswerSelect(index)}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${
                  selectedAnswer === index
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center space-x-3">
                  {selectedAnswer === index ? (
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-400" />
                  )}
                  <span className="text-gray-900">{option.text}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 다음 버튼 */}
        <button
          onClick={handleNext}
          disabled={selectedAnswer === null}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
            selectedAnswer !== null
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          <span>
            {currentQuestionIndex === questions.length - 1 ? "완료" : "다음"}
          </span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
