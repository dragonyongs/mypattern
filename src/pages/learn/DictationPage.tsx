// src/pages/learn/DictationPage.tsx
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { DictationCard } from "@/features/dictation/ui";
import { useDailyPlan } from "@/shared/hooks";
import { logger } from "@/shared/utils/logger";

// 🔥 state 타입 정의
interface LocationState {
  stepId?: string;
  stepTitle?: string;
  items?: any[];
}

export default function DictationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { completeStep } = useDailyPlan();

  // 🔥 안전한 state 구조분해
  const locationState = location.state as LocationState | null;
  const {
    stepId = "",
    stepTitle = "빈칸 채우기",
    items = [],
  } = locationState || {};

  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<boolean[]>([]);

  // 🔥 안전한 검증
  useEffect(() => {
    if (!stepId || !Array.isArray(items) || items.length === 0) {
      logger.warn("DictationPage: Invalid route state", { stepId, items });
      navigate("/app/learn", { replace: true });
    }
  }, [stepId, items, navigate]);

  const handleComplete = (correct: boolean) => {
    const newResults = [...results, correct];
    setResults(newResults);

    if (currentIndex < items.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // 모든 문제 완료
      const correctCount = newResults.filter(Boolean).length;
      const score = Math.round((correctCount / items.length) * 100);

      completeStep(stepId, score, 600);

      setTimeout(() => {
        navigate("/app/learn", { replace: true });
      }, 2000);
    }
  };

  const handleNext = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
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

  const currentItem = items[currentIndex];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-4xl px-4 py-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-2xl font-bold">{stepTitle}</h1>
              <p className="text-gray-600">문장의 빈칸을 채워보세요</p>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            {currentIndex + 1} / {items.length}
          </div>
        </div>

        {/* 진행률 */}
        <div className="mb-6">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${((currentIndex + 1) / items.length) * 100}%` }}
            />
          </div>
        </div>

        {/* 딕테이션 카드 */}
        <DictationCard
          item={currentItem}
          onComplete={handleComplete}
          onNext={handleNext}
          onPrevious={handlePrevious}
        />
      </div>
    </div>
  );
}
