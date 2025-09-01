import React, { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react";
import { VocaItem } from "@/entities";
import { useSwipeGesture } from "@/shared/hooks";

interface FlashCardProps {
  item: VocaItem;
  showTranslation: boolean;
  onToggleTranslation: () => void;
  onNext: () => void;
  onPrevious: () => void;
  className?: string;
}

export function FlashCard({
  item,
  showTranslation,
  onToggleTranslation,
  onNext,
  onPrevious,
  className = "",
}: FlashCardProps) {
  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: onNext,
    onSwipeRight: onPrevious,
  });

  return (
    <div
      {...swipeHandlers}
      className={`relative bg-white rounded-lg shadow-lg p-6 min-h-[400px] flex flex-col justify-center ${className}`}
    >
      {/* 이미지 영역 */}
      <div className="flex-1 flex items-center justify-center mb-4">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.headword}
            className="max-w-full max-h-64 object-contain rounded-lg"
          />
        ) : (
          <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
            <span className="text-gray-400">이미지 없음</span>
          </div>
        )}
      </div>

      {/* 단어 영역 */}
      <div className="text-center space-y-3">
        <h2 className="text-2xl font-bold text-gray-900">{item.headword}</h2>

        {/* 예문 (핵심 단어만 강조) */}
        <div className="text-lg text-gray-600 leading-relaxed">
          {item.exampleEn?.split(item.headword).map((part, index) => (
            <React.Fragment key={index}>
              {part}
              {index < item.exampleEn!.split(item.headword).length - 1 && (
                <span className="font-bold text-black">{item.headword}</span>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* 번역 토글 버튼 */}
        <button
          onClick={onToggleTranslation}
          className="flex items-center gap-2 mx-auto px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
        >
          {showTranslation ? (
            <EyeOff className="size-4" />
          ) : (
            <Eye className="size-4" />
          )}
          {showTranslation ? "번역 숨기기" : "번역 보기"}
        </button>

        {/* 번역 */}
        {showTranslation && (
          <div className="pt-2 border-t border-gray-100">
            <p className="text-gray-700">{item.exampleKo}</p>
            {item.definition && (
              <p className="text-sm text-gray-500 mt-1">{item.definition}</p>
            )}
          </div>
        )}
      </div>

      {/* 네비게이션 버튼 */}
      <div className="flex justify-between items-center mt-6">
        <button
          onClick={onPrevious}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="size-6" />
        </button>
        <button
          onClick={onNext}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <ChevronRight className="size-6" />
        </button>
      </div>
    </div>
  );
}
