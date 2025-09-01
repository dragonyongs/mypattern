// src/pages/learn/FlashcardPage.tsx
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { FlashCardSession } from "@/features/flashcard/ui";
import { useDailyPlan } from "@/shared/hooks";
import { logger } from "@/shared/utils/logger";

// 🔥 state 타입 정의
interface LocationState {
  stepId?: string;
  stepTitle?: string;
  items?: any[];
}

export default function FlashcardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { completeStep } = useDailyPlan();

  // 🔥 안전한 state 구조분해
  const locationState = location.state as LocationState | null;
  const {
    stepId = "",
    stepTitle = "플래시카드",
    items = [],
  } = locationState || {};

  // 🔥 안전한 검증
  useEffect(() => {
    if (!stepId || !Array.isArray(items) || items.length === 0) {
      logger.warn("FlashcardPage: Invalid route state", { stepId, items });
      navigate("/app/learn", { replace: true });
    }
  }, [stepId, items, navigate]);

  const handleComplete = (results: {
    correct: number;
    total: number;
    timeSpent: number;
  }) => {
    const score = Math.round((results.correct / results.total) * 100);

    completeStep(stepId, score, 300);

    setTimeout(() => {
      navigate("/app/learn", { replace: true });
    }, 2000);
  };

  const handleBack = () => {
    navigate("/app/learn");
  };

  // 🔥 안전한 검증 후 렌더링
  if (!Array.isArray(items) || items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">학습 데이터가 없습니다.</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-4xl px-4 py-6">
        {/* 헤더 */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold">{stepTitle}</h1>
            <p className="text-gray-600">단어를 보고 의미를 기억해보세요</p>
          </div>
        </div>

        {/* 플래시카드 세션 */}
        <FlashCardSession items={items} onComplete={handleComplete} />
      </div>
    </div>
  );
}
