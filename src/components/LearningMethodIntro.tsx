// src/components/LearningMethodIntro.tsx
import React, { useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import type { LearningMethod } from "@/types";

interface LearningMethodIntroProps {
  methods: LearningMethod[];
  onComplete: () => void;
}

export const LearningMethodIntro: React.FC<LearningMethodIntroProps> = ({
  methods,
  onComplete,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedCards, setCompletedCards] = useState<Set<number>>(new Set());
  const { markModeCompleted } = useAppStore();

  const currentMethod = methods[currentIndex];

  const handleCardView = () => {
    const newCompleted = new Set(completedCards);
    newCompleted.add(currentIndex);
    setCompletedCards(newCompleted);
  };

  const handleNext = () => {
    if (currentIndex < methods.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else if (completedCards.size === methods.length) {
      markModeCompleted(1, "vocab"); // Day 1 완료 처리
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const isAllCompleted = completedCards.size === methods.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Real VOCA 학습 방법
          </h1>
          <p className="text-gray-600">
            14일이면 한 권을 충분히 볼 수 있습니다
          </p>
        </div>

        <div className="relative">
          {/* 학습 방법 카드 */}
          <div
            className="bg-white rounded-2xl shadow-xl p-8 mx-4 cursor-pointer transition-transform active:scale-95"
            onClick={handleCardView}
          >
            <div className="text-center">
              {/* 아이콘 */}
              <div className="text-6xl mb-6">{currentMethod.icon}</div>

              {/* 단계 */}
              <div className="inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-4">
                {currentMethod.phase}단계
              </div>

              {/* 제목 */}
              <h2 className="text-3xl font-bold text-gray-800 mb-4">
                {currentMethod.name}
              </h2>

              {/* 설명 */}
              <p className="text-lg text-gray-600 leading-relaxed mb-6">
                {currentMethod.description}
              </p>

              {/* 적용 일수 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <span className="text-sm text-gray-500">적용 일수</span>
                <p className="text-lg font-semibold text-gray-800">
                  Day {currentMethod.days}
                </p>
              </div>

              {/* 완료 표시 */}
              {completedCards.has(currentIndex) && (
                <div className="mt-4 flex items-center justify-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">확인 완료</span>
                </div>
              )}
            </div>
          </div>

          {/* 네비게이션 */}
          <div className="flex items-center justify-between mt-8">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="flex items-center gap-2 px-6 py-3 rounded-lg border border-gray-300 bg-white text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              이전
            </button>

            <div className="flex gap-2">
              {methods.map((_, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentIndex
                      ? "bg-blue-500"
                      : completedCards.has(index)
                      ? "bg-green-500"
                      : "bg-gray-300"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              disabled={!completedCards.has(currentIndex)}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
            >
              {currentIndex === methods.length - 1 && isAllCompleted
                ? "학습 시작"
                : "다음"}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* 진행률 */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 mb-2">
              {completedCards.size} / {methods.length} 확인 완료
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${(completedCards.size / methods.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* 힌트 */}
          {!completedCards.has(currentIndex) && (
            <p className="text-center text-sm text-gray-400 mt-4">
              카드를 터치하여 확인하세요
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
