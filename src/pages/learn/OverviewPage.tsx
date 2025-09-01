// src/pages/learn/OverviewPage.tsx
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, CheckCircle, BookOpen, Eye } from "lucide-react";
import { useDailyPlan } from "@/shared/hooks";
import { VocaItem } from "@/entities";
import {
  isValidNavigationState,
  type NavigationState,
} from "@/shared/utils/navigation";
import { logger } from "@/shared/utils/logger";

export default function OverviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { completeStep } = useDailyPlan();

  const locationState = location.state;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewedItems, setReviewedItems] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!isValidNavigationState(locationState)) {
      logger.error("OverviewPage: Invalid route state", locationState);
      // 유효하지 않은 상태일 때만 리다이렉트
      navigate("/app/learn", { replace: true });
    }
  }, [locationState, navigate]);

  if (!isValidNavigationState(locationState)) {
    logger.error("OverviewPage: Invalid route state", locationState);
    return <div>잘못된 접근입니다.</div>;
  }

  const { stepId, stepTitle, items }: NavigationState = locationState;

  const handleItemReviewed = (index: number) => {
    setReviewedItems((prev) => new Set([...prev, index]));
  };

  const handleComplete = () => {
    const reviewedCount = reviewedItems.size;
    const score = Math.round((reviewedCount / items.length) * 100);

    // 단계 완료 처리
    completeStep(stepId, score, 180); // stepId, 점수, 소요시간(초)

    setTimeout(() => {
      navigate("/app/learn", { replace: true });
    }, 1500);
  };

  const handleBack = () => {
    navigate("/app/learn");
  };

  if (!items || items.length === 0) {
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

  const currentItem = items[currentIndex] as VocaItem;
  const progress = Math.round(((currentIndex + 1) / items.length) * 100);
  const allReviewed = reviewedItems.size === items.length;

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
                <Eye size={24} />
                {stepTitle || "전체 훑기"}
              </h1>
              <p className="text-gray-600">모든 단어를 빠르게 살펴보세요</p>
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

        {/* 단어 카드 */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <div className="text-center mb-6">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">
              {currentItem.headword}
            </h2>

            <div className="space-y-4">
              <div>
                <p className="text-xl text-blue-600 font-semibold">
                  {currentItem.definition}
                </p>
                {currentItem.pos && (
                  <p className="text-sm text-gray-500 mt-1">
                    ({currentItem.pos})
                  </p>
                )}
              </div>

              {currentItem.exampleEn && (
                <div className="border-t pt-4">
                  <p className="text-gray-700 mb-2 italic">
                    "{currentItem.exampleEn}"
                  </p>
                  <p className="text-gray-600 text-sm">
                    "{currentItem.exampleKo}"
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 확인 버튼 */}
          <div className="flex justify-center">
            {reviewedItems.has(currentIndex) ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle size={20} />
                <span className="font-semibold">확인 완료</span>
              </div>
            ) : (
              <button
                onClick={() => handleItemReviewed(currentIndex)}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
              >
                <BookOpen size={20} />
                확인했습니다
              </button>
            )}
          </div>
        </div>

        {/* 네비게이션 */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            이전
          </button>

          <span className="text-sm text-gray-600">
            {reviewedItems.size} / {items.length} 확인됨
          </span>

          <button
            onClick={() =>
              setCurrentIndex(Math.min(items.length - 1, currentIndex + 1))
            }
            disabled={currentIndex === items.length - 1}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            다음
          </button>
        </div>

        {/* 완료 버튼 */}
        {allReviewed && (
          <div className="text-center">
            <button
              onClick={handleComplete}
              className="px-8 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2 mx-auto"
            >
              <CheckCircle size={20} />
              전체 훑기 완료
            </button>
          </div>
        )}

        {/* 미리보기 그리드 (하단) */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">전체 단어 목록</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {items.map((item: VocaItem, index: number) => (
              <button
                key={item.id}
                onClick={() => setCurrentIndex(index)}
                className={`p-3 rounded-lg text-sm transition-colors ${
                  index === currentIndex
                    ? "bg-blue-500 text-white"
                    : reviewedItems.has(index)
                    ? "bg-green-100 text-green-800 border border-green-200"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <div className="font-semibold">{item.headword}</div>
                <div className="text-xs opacity-75">{item.definition}</div>
                {reviewedItems.has(index) && (
                  <CheckCircle size={14} className="mx-auto mt-1" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
