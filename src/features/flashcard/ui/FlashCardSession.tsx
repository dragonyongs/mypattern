import React, { useState, useCallback } from "react";
import { FlashCard } from "./FlashCard";
import { ProgressBar } from "@/shared/ui";
import { VocaItem } from "@/entities";
import { useFlashCardSession } from "../model";

interface FlashCardSessionProps {
  items: VocaItem[];
  onComplete: (results: { correct: number; total: number }) => void;
  className?: string;
}

export function FlashCardSession({
  items,
  onComplete,
  className,
}: FlashCardSessionProps) {
  const {
    currentIndex,
    currentItem,
    showTranslation,
    progress,
    goNext,
    goPrevious,
    toggleTranslation,
    markAsKnown,
    markAsUnknown,
  } = useFlashCardSession(items);

  const [isSessionComplete, setIsSessionComplete] = useState(false);

  const handleComplete = useCallback(() => {
    setIsSessionComplete(true);
    onComplete({ correct: progress.known, total: items.length });
  }, [progress.known, items.length, onComplete]);

  if (isSessionComplete) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold mb-4">1단계 완료!</h2>
        <p className="text-gray-600 mb-6">
          총 {items.length}개 중 {progress.known}개를 기억하셨습니다.
        </p>
        <button
          onClick={() =>
            onComplete({ correct: progress.known, total: items.length })
          }
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          다음 단계로
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 진행률 */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>
            {currentIndex + 1} / {items.length}
          </span>
          <span>알고 있음: {progress.known}</span>
        </div>
        <ProgressBar
          progress={(currentIndex / items.length) * 100}
          className="h-2"
        />
      </div>

      {/* 플래시카드 */}
      <FlashCard
        item={currentItem}
        showTranslation={showTranslation}
        onToggleTranslation={toggleTranslation}
        onNext={goNext}
        onPrevious={goPrevious}
      />

      {/* 액션 버튼 */}
      <div className="flex gap-3 justify-center">
        <button
          onClick={markAsUnknown}
          className="px-6 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
        >
          모르겠어요
        </button>
        <button
          onClick={markAsKnown}
          className="px-6 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
        >
          알고 있어요
        </button>
      </div>

      {/* 완료 버튼 */}
      {currentIndex === items.length - 1 && (
        <div className="text-center pt-4">
          <button
            onClick={handleComplete}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            1단계 완료
          </button>
        </div>
      )}
    </div>
  );
}
