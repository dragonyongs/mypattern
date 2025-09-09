// src/components/LearningMethodIntro.tsx
import React, { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import type { LearningMethod } from "@/types";
import { DynamicIcon } from "@/shared/components/DynamicIcon";
import { useStudyProgressStore } from "@/stores/studyProgressStore";

interface LearningMethodIntroProps {
  methods: LearningMethod[];
  onComplete: () => void;
  packId: string;
}

export const LearningMethodIntro: React.FC<LearningMethodIntroProps> = ({
  methods,
  onComplete,
  packId,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedCards, setCompletedCards] = useState<Set<number>>(new Set());

  // 스토어에서 상태와 액션 가져오기
  const getDayProgress = useStudyProgressStore((state) => state.getDayProgress);
  const completeDay1Introduction = useStudyProgressStore(
    (state) => state.completeDay1Introduction
  );

  // Day1 완료 상태 확인
  const day1Progress = getDayProgress(packId, 1);
  const isIntroductionCompleted =
    day1Progress?.completedModes["introduction"] ?? false;

  // console.log("🔍 LearningMethodIntro - day1Progress:", day1Progress);
  // console.log(
  //   "🔍 LearningMethodIntro - isIntroductionCompleted:",
  //   isIntroductionCompleted
  // );

  useEffect(() => {
    if (isIntroductionCompleted && methods.length > 0) {
      setCurrentIndex(methods.length - 1);
      const allCards = new Set(
        Array.from({ length: methods.length }, (_, i) => i)
      );
      setCompletedCards(allCards);
      console.log("🔥 Day 1 already completed, showing final page");
    }
  }, [isIntroductionCompleted, methods.length]);

  // [중요] packId 검증 및 로깅
  console.log("🔍 LearningMethodIntro - Received packId:", packId);

  // [수정] packId 유효성 검사
  if (!packId || packId === "undefined") {
    console.error("❌ LearningMethodIntro received invalid packId:", packId);
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800">
            학습팩 정보 오류
          </h2>
          <p className="text-gray-500 mt-2">올바르지 않은 학습팩 ID입니다.</p>
          <button
            onClick={onComplete}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (!methods || methods.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-700">
            학습 방법 데이터를 불러오는 중...
          </p>
        </div>
      </div>
    );
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
      console.log("🔥 About to complete Day 1 introduction");
      console.log("📋 packId:", packId);

      if (!isIntroductionCompleted) {
        completeDay1Introduction(packId);

        // 완료 후 상태 확인
        setTimeout(() => {
          const updatedProgress = getDayProgress(packId, 1);
          console.log("📊 Updated Day 1 progress:", updatedProgress);
        }, 100);
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

  const isLastPageAndCompleted =
    currentIndex === methods.length - 1 && isAllCompleted;

  const buttonText = isLastPageAndCompleted
    ? isIntroductionCompleted
      ? "학습 시작"
      : "완료"
    : "다음";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 p-4">
      {/* 진행률 표시 */}
      <div className="w-full max-w-md mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-600">
            {currentIndex + 1} / {methods.length}
          </span>
          <span className="text-sm font-medium text-indigo-600">
            {Math.round(progressPercentage)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* 메인 카드 */}
      <div
        onClick={handleCardView}
        className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full cursor-pointer transform transition-transform hover:scale-105 mb-8"
      >
        <div className="text-center">
          <div className="mb-4">
            <DynamicIcon
              name={currentMethod.icon}
              className="w-16 h-16 mx-auto text-indigo-600"
            />
          </div>
          <div className="mb-2">
            <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold">
              {currentMethod.phase}단계
            </span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            {currentMethod.name}
          </h2>
          <p className="text-gray-600 leading-relaxed mb-6">
            {currentMethod.description}
          </p>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-500 mb-1">적용 일수</p>
            <p className="font-semibold text-gray-800">Day 1-14</p>
          </div>
        </div>

        {completedCards.has(currentIndex) ? (
          <div className="mt-6 flex items-center justify-center text-green-600">
            <CheckCircle className="w-5 h-5 mr-2" />
            <span className="font-medium">확인 완료</span>
          </div>
        ) : (
          <div className="mt-6 text-center text-gray-400 text-sm">
            카드를 터치하여 확인하세요
          </div>
        )}
      </div>

      {/* 네비게이션 */}
      <div className="flex items-center gap-4">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="w-4 h-4" />
          이전
        </button>

        <button
          onClick={handleNext}
          disabled={!isAllCompleted && currentIndex === methods.length - 1}
          className="flex items-center gap-2 px-6 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {buttonText}
          {!isLastPageAndCompleted && <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
