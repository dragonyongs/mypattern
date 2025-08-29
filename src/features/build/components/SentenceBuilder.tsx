// src/features/build/components/SentenceBuilder.tsx
import React, { useState, useCallback, useEffect } from "react";
import { RotateCcw, CheckCircle, AlertCircle } from "lucide-react";
import type { SentenceCard, ConversationPattern } from "../types";
import { useDragAndDrop } from "../hooks/useDragAndDrop";

interface SentenceBuilderProps {
  pattern: ConversationPattern;
  onComplete: (success: boolean) => void;
  onRetry: () => void;
}

export const SentenceBuilder: React.FC<SentenceBuilderProps> = ({
  pattern,
  onComplete,
  onRetry,
}) => {
  const [cards, setCards] = useState<SentenceCard[]>([]);
  const [attemptCount, setAttemptCount] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const { handleDragStart, handleDragEnd, handleDrop } = useDragAndDrop(
    cards,
    setCards
  );

  // 초기 카드 섞기
  useEffect(() => {
    const shuffledCards = [...pattern.userSide.cards]
      .sort(() => Math.random() - 0.5)
      .map((card) => ({
        ...card,
        isPlaced: false,
        isCorrect: false,
        feedbackColor: "default" as const,
      }));
    setCards(shuffledCards);
  }, [pattern]);

  const validateSentence = useCallback(() => {
    const correctOrder = pattern.userSide.cards;
    const newCards = cards.map((card, index) => ({
      ...card,
      isCorrect: correctOrder[index]?.id === card.id,
      feedbackColor:
        correctOrder[index]?.id === card.id ? "success" : ("error" as const),
    }));

    setCards(newCards);
    setAttemptCount((prev) => prev + 1);

    const isAllCorrect = newCards.every((card) => card.isCorrect);

    if (isAllCorrect) {
      setIsComplete(true);
      onComplete(true);
    } else if (attemptCount >= 2) {
      setShowHint(true);
    } else if (attemptCount >= 4) {
      // 5번 실패시 정답 제시
      const correctCards = correctOrder.map((card) => ({
        ...card,
        isCorrect: true,
        feedbackColor: "success" as const,
      }));
      setCards(correctCards);
      setIsComplete(true);
      onComplete(false);
    }
  }, [cards, pattern, attemptCount, onComplete]);

  const resetCards = useCallback(() => {
    const shuffledCards = [...pattern.userSide.cards]
      .sort(() => Math.random() - 0.5)
      .map((card) => ({
        ...card,
        isPlaced: false,
        isCorrect: false,
        feedbackColor: "default" as const,
      }));
    setCards(shuffledCards);
    setAttemptCount(0);
    setShowHint(false);
    setIsComplete(false);
  }, [pattern]);

  const getCardStyle = (card: SentenceCard) => {
    const baseStyle =
      "px-3 py-2 rounded-lg border-2 cursor-pointer transition-all duration-200 ";

    switch (card.feedbackColor) {
      case "success":
        return baseStyle + "bg-green-100 border-green-300 text-green-800";
      case "error":
        return baseStyle + "bg-red-100 border-red-300 text-red-800";
      default:
        return (
          baseStyle +
          "bg-white border-gray-300 hover:border-blue-300 hover:shadow-sm"
        );
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">
          문장을 올바른 순서로 배열해보세요
        </h3>
        <div className="text-sm text-gray-600 mb-4">
          {pattern.userSide.korean}
        </div>

        {showHint && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 text-blue-800">
              <AlertCircle size={16} />
              <span className="text-sm font-medium">구조 힌트</span>
            </div>
            <div className="text-sm text-blue-700 mt-1">
              {pattern.userSide.structure}
            </div>
          </div>
        )}
      </div>

      {/* 드래그 앤 드롭 영역 */}
      <div className="mb-6">
        <div className="min-h-16 p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
          <div className="flex flex-wrap gap-2">
            {cards.map((card, index) => (
              <div
                key={`${card.id}-${index}`}
                className={getCardStyle(card)}
                draggable={!isComplete}
                onDragStart={() => handleDragStart(card)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(index)}
              >
                <span className="text-sm font-medium">{card.text}</span>
                <span className="text-xs text-gray-500 ml-2">
                  ({card.korean})
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 액션 버튼들 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={resetCards}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800"
            disabled={isComplete}
          >
            <RotateCcw size={16} />
            다시 섞기
          </button>
          <span className="text-sm text-gray-500">
            시도 횟수: {attemptCount}/5
          </span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onRetry}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            다른 패턴 선택
          </button>
          <button
            onClick={validateSentence}
            disabled={isComplete}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isComplete ? (
              <div className="flex items-center gap-2">
                <CheckCircle size={16} />
                완료
              </div>
            ) : (
              "확인"
            )}
          </button>
        </div>
      </div>

      {/* 완료 후 대화 예시 */}
      {isComplete && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="font-medium mb-3">💬 실제 대화 예시</h4>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex">
              <div className="bg-blue-500 text-white px-3 py-2 rounded-lg rounded-bl-none max-w-xs">
                {pattern.userSide.english}
              </div>
            </div>
            <div className="flex justify-end">
              <div className="bg-gray-300 text-gray-800 px-3 py-2 rounded-lg rounded-br-none max-w-xs">
                {pattern.responseSide.english}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm font-medium mb-2">다른 표현들:</div>
            <div className="text-sm text-gray-600 space-y-1">
              {pattern.responseSide.variations.map((variation, index) => (
                <div key={index}>• {variation}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
