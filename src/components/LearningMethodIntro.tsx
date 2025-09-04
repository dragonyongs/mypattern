// src/components/LearningMethodIntro.tsx
import React, { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import type { LearningMethod } from "@/types";
import { DynamicIcon } from "@/shared/components/DynamicIcon";
import { useDay1Progress } from "@/shared/hooks/useAppHooks";

interface LearningMethodIntroProps {
  methods: LearningMethod[];
  onComplete: () => void;
  packId: string; // 🔥 packId prop 추가
}

export const LearningMethodIntro: React.FC<LearningMethodIntroProps> = ({
  methods,
  onComplete,
  packId, // 🔥 packId 받기
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedCards, setCompletedCards] = useState<Set<number>>(new Set());

  // 🔥 Day1 진행 상태 확인
  const { isIntroductionCompleted, markIntroductionCompleted } =
    useDay1Progress(packId);

  useEffect(() => {
    if (isIntroductionCompleted && methods.length > 0) {
      // 마지막 페이지로 이동
      setCurrentIndex(methods.length - 1);

      // 모든 카드를 완료된 것으로 표시
      const allCards = new Set(
        Array.from({ length: methods.length }, (_, i) => i)
      );
      setCompletedCards(allCards);

      console.log(
        "🔥 Day 1 already completed, showing final page with start button"
      );
    }
  }, [isIntroductionCompleted, methods.length]);

  if (!methods || methods.length === 0) {
    return <div>학습 방법 데이터를 불러오는 중...</div>;
  }

  const currentMethod = methods[currentIndex];

  const handleCardView = () => {
    if (completedCards.has(currentIndex)) return;

    const newCompleted = new Set(completedCards);
    newCompleted.add(currentIndex);
    setCompletedCards(newCompleted);
  };

  const isAllCompleted = completedCards.size === methods.length;

  const handleNext = () => {
    if (currentIndex < methods.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else if (isAllCompleted) {
      // 🔥 완료되지 않은 경우만 완료 상태 저장
      if (!isIntroductionCompleted) {
        markIntroductionCompleted();
      }
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const progressPercentage =
    methods.length > 0 ? (completedCards.size / methods.length) * 100 : 0;

  // 🔥 마지막 페이지이고 모든 카드가 완료된 경우의 버튼 텍스트
  const isLastPageAndCompleted =
    currentIndex === methods.length - 1 && isAllCompleted;
  const buttonText = isLastPageAndCompleted
    ? isIntroductionCompleted
      ? "학습 시작"
      : "완료"
    : "다음";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4 font-sans">
      <div className="w-full max-w-md mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">
            Real VOCA 학습 방법
          </h1>
          <p className="text-slate-500 mt-2">
            14일이면 한 권을 충분히 볼 수 있습니다
          </p>
        </header>

        <main
          className="relative bg-white rounded-2xl shadow-lg p-8 cursor-pointer transition-transform duration-200 active:scale-95"
          onClick={handleCardView}
        >
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 text-blue-500">
              <DynamicIcon name={currentMethod.icon} size={48} />
            </div>
            <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full mb-3">
              {currentMethod.phase}단계
            </span>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">
              {currentMethod.name}
            </h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              {currentMethod.description}
            </p>

            <div className="bg-slate-100 rounded-lg w-full p-4 mb-6">
              <p className="text-sm font-medium text-slate-500">적용 일수</p>
              <p className="font-bold text-slate-800 mt-1">
                Day {currentMethod.days}
              </p>
            </div>

            {completedCards.has(currentIndex) ? (
              <div className="flex items-center text-green-600">
                <CheckCircle size={18} className="mr-1.5" />
                <span className="font-semibold text-sm">확인 완료</span>
              </div>
            ) : (
              <div className="flex items-center text-gray-400">
                <span className="font-medium text-sm">
                  카드를 터치하여 확인하세요
                </span>
              </div>
            )}
          </div>
        </main>

        <footer className="mt-8">
          {/* <div className="flex items-center justify-between mb-5">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArrowLeft size={16} />
              이전
            </button>
            <div className="flex items-center gap-2">
              {methods.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    currentIndex === index ? "bg-blue-500" : "bg-slate-200"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={handleNext}
              disabled={currentIndex === methods.length - 1 && !isAllCompleted}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white bg-blue-500 shadow-sm transition-colors hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {currentIndex === methods.length - 1 && isAllCompleted
                ? "학습 시작"
                : "다음"}
              <ArrowRight size={16} />
            </button>
          </div> */}
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              이전
            </button>

            <div className="text-sm text-gray-600">
              {currentIndex + 1} / {methods.length}
            </div>

            <button
              onClick={handleNext}
              disabled={!isAllCompleted && currentIndex === methods.length - 1}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium ${
                isLastPageAndCompleted && isIntroductionCompleted
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              }`}
            >
              {buttonText}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="w-full">
            <div className="flex justify-between items-center text-xs text-slate-500 mb-1.5 px-1">
              <span className="font-medium">학습 방법 확인</span>
              <span className="font-semibold">
                {completedCards.size} / {methods.length}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5">
              <div
                className="bg-blue-500 h-2.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};
