// src/pages/learn/PronunciationPage.tsx
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, CheckCircle, Mic } from "lucide-react";
import { PronunciationCard } from "@/features/pronunciation/ui";
import { useDailyPlan } from "@/shared/hooks";
import { logger, safeStringify } from "@/shared/utils/logger";
import {
  isValidNavigationState,
  type NavigationState,
} from "@/shared/utils/navigation";

export default function PronunciationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { completeStep } = useDailyPlan();

  // 🔥 완전히 안전한 state 처리
  const locationState = location.state;

  // 수정안 — 안전 체크 후 리다이렉트
  useEffect(() => {
    // location.state 를 아무 가공 없이 바로 쓰지 않도록, 검증 후 리다이렉트합니다.
    if (!isValidNavigationState(locationState)) {
      // 디버그용으로 전체 객체를 찍지 말고 키 목록 또는 stringify 사용
      logger.error(
        "PronunciationPage: invalid route state",
        // logger.safeStringify가 logger 모듈에 있으면 그걸 사용하거나:
        { keys: locationState ? Object.keys(locationState as object) : [] }
      );
      navigate("/app/learn", { replace: true });
    }
    // locationState는 참조형이므로 꼭 의존성에 넣을 필요는 없음.
  }, [navigate /*, locationState if stable */]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [practiceResults, setPracticeResults] = useState<boolean[]>([]);

  // 🔥 타입 가드 사용
  if (!isValidNavigationState(locationState)) {
    logger.error(
      "PronunciationPage: Invalid route state",
      safeStringify(locationState)
    );

    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">잘못된 접근입니다.</p>
          <button
            onClick={() => navigate("/app/learn")}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            학습 페이지로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const { stepId, stepTitle, items }: NavigationState = locationState;

  const handlePracticeComplete = (success: boolean) => {
    logger.log("Practice completed", { success, currentIndex });

    const newResults = [...practiceResults, success];
    setPracticeResults(newResults);

    if (currentIndex < items.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // 모든 발음 연습 완료
      const successCount = newResults.filter(Boolean).length;
      const score = Math.round((successCount / items.length) * 100);

      completeStep(stepId, score, 450);

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

  const currentItem = items[currentIndex];
  const progress = Math.round(((currentIndex + 1) / items.length) * 100);

  // 🔥 안전한 렌더링 - 모든 값이 검증됨
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
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Mic size={24} />
                {stepTitle}
              </h1>
              <p className="text-gray-600">원어민 발음을 듣고 따라해보세요</p>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            {currentIndex + 1} / {items.length}
          </div>
        </div>

        {/* 진행률 */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">진행률</span>
            <span className="text-sm font-semibold">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* 🔥 발음 연습 카드 - 안전한 props 전달 */}
        <PronunciationCard
          key={`${currentItem.id}-${currentIndex}`}
          item={currentItem}
          onComplete={handlePracticeComplete}
          onNext={handleNext}
          onPrevious={handlePrevious}
        />

        {/* 완료 안내 */}
        {currentIndex === items.length - 1 && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
            <CheckCircle size={20} className="mx-auto mb-2 text-green-500" />
            <p className="text-green-800 font-semibold">
              마지막 단어입니다! 연습을 완료하면 자동으로 다음 단계로
              이동합니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
