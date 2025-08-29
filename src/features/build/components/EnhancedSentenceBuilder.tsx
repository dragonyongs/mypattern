// src/features/build/components/EnhancedSentenceBuilder.tsx
import React, { useState, useCallback, useEffect } from "react";
import { RotateCcw, CheckCircle, AlertCircle, Edit3 } from "lucide-react";
import type { SentenceCard, ConversationPattern } from "../types";
import { useDragAndDrop } from "../hooks/useDragAndDrop";

interface EnhancedSentenceBuilderProps {
  pattern: ConversationPattern;
  onComplete: (success: boolean) => void;
  onRetry: () => void;
}

export const EnhancedSentenceBuilder: React.FC<
  EnhancedSentenceBuilderProps
> = ({ pattern, onComplete, onRetry }) => {
  const [cards, setCards] = useState<SentenceCard[]>([]);
  const [attemptCount, setAttemptCount] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const { handleDragStart, handleDragEnd, handleDrop } = useDragAndDrop(
    cards,
    setCards
  );

  // 초기 카드 설정
  useEffect(() => {
    const initialCards = pattern.userSide.cards.map((card) => ({
      ...card,
      isPlaced: false,
      isCorrect: false,
      feedbackColor: "default" as const,
    }));

    // 사용자 입력이 필요한 카드가 아닌 것들만 섞기
    const userInputCards = initialCards.filter((card) => card.needsUserInput);
    const normalCards = initialCards.filter((card) => !card.needsUserInput);

    const shuffledNormalCards = normalCards.sort(() => Math.random() - 0.5);

    setCards([...userInputCards, ...shuffledNormalCards]);
  }, [pattern]);

  const handleEditCard = useCallback(
    (cardId: string) => {
      const card = cards.find((c) => c.id === cardId);
      if (card) {
        setEditingCard(cardId);
        setEditValue(card.text);
      }
    },
    [cards]
  );

  const handleSaveEdit = useCallback(() => {
    if (editingCard && editValue.trim()) {
      setCards((prevCards) =>
        prevCards.map((card) =>
          card.id === editingCard
            ? {
                ...card,
                text: editValue.trim(),
                korean: `[${editValue.trim()}]`,
              }
            : card
        )
      );
      setEditingCard(null);
      setEditValue("");
    }
  }, [editingCard, editValue]);

  const validateSentence = useCallback(() => {
    // 사용자 입력이 필요한 카드들이 모두 채워졌는지 확인
    const hasEmptyUserInputs = cards.some(
      (card) =>
        card.needsUserInput &&
        card.text.startsWith("[") &&
        card.text.endsWith("]")
    );

    if (hasEmptyUserInputs) {
      alert("빈 칸을 모두 채워주세요!");
      return;
    }

    // 간단한 어순 검증 (완벽하지 않지만 기본적인 검증)
    const sentence = cards.map((card) => card.text).join(" ");
    const hasBasicStructure = this.checkBasicStructure(sentence);

    const newCards = cards.map((card, index) => ({
      ...card,
      isCorrect: hasBasicStructure,
      feedbackColor: hasBasicStructure ? "success" : ("warning" as const),
    }));

    setCards(newCards);
    setAttemptCount((prev) => prev + 1);

    if (hasBasicStructure) {
      setIsComplete(true);
      onComplete(true);
    } else if (attemptCount >= 2) {
      setShowHint(true);
    } else if (attemptCount >= 4) {
      // 5번 실패시 완료 처리
      setIsComplete(true);
      onComplete(false);
    }
  }, [cards, attemptCount, onComplete]);

  const checkBasicStructure = (sentence: string): boolean => {
    const words = sentence.toLowerCase().split(" ");

    // 기본적인 영어 문장 구조 검증
    const hasQuestionWord = words.some((w) =>
      ["where", "how", "what", "when"].includes(w)
    );
    const hasVerb = words.some((w) =>
      ["is", "are", "do", "does", "can", "would"].includes(w)
    );
    const hasSubject =
      words.some((w) => ["i", "you", "we", "they", "it"].includes(w)) ||
      hasQuestionWord;

    // 질문문이면 의문사가 앞에 있어야 함
    if (hasQuestionWord) {
      return ["where", "how", "what", "when"].includes(words[0]);
    }

    // 평서문이면 주어 + 동사 구조
    return hasSubject && hasVerb;
  };

  const resetCards = useCallback(() => {
    const resetCards = pattern.userSide.cards
      .filter((card) => !card.needsUserInput)
      .map((card) => ({
        ...card,
        isPlaced: false,
        isCorrect: false,
        feedbackColor: "default" as const,
      }))
      .sort(() => Math.random() - 0.5);

    const userInputCards = cards.filter((card) => card.needsUserInput);

    setCards([...userInputCards, ...resetCards]);
    setAttemptCount(0);
    setShowHint(false);
    setIsComplete(false);
  }, [pattern, cards]);

  const getCardStyle = (card: SentenceCard) => {
    let baseStyle =
      "px-3 py-2 rounded-lg border-2 cursor-pointer transition-all duration-200 ";

    if (card.needsUserInput) {
      baseStyle += "border-dashed ";
    }

    switch (card.feedbackColor) {
      case "success":
        return baseStyle + "bg-green-100 border-green-300 text-green-800";
      case "warning":
        return baseStyle + "bg-yellow-100 border-yellow-300 text-yellow-800";
      case "error":
        return baseStyle + "bg-red-100 border-red-300 text-red-800";
      default:
        if (card.needsUserInput) {
          return baseStyle + "bg-blue-50 border-blue-300 hover:border-blue-400";
        }
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
          목표: {pattern.userSide.korean}
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
                draggable={!isComplete && !card.needsUserInput}
                onDragStart={() =>
                  !card.needsUserInput && handleDragStart(card)
                }
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(index)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{card.text}</span>
                  <span className="text-xs text-gray-500">({card.korean})</span>
                  {card.needsUserInput && !isComplete && (
                    <button
                      onClick={() => handleEditCard(card.id)}
                      className="ml-2 p-1 hover:bg-white rounded"
                      title="편집하기"
                    >
                      <Edit3 size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-2 text-xs text-gray-500">
          💡 파란색 점선 카드는 클릭해서 직접 입력하세요
        </div>
      </div>

      {/* 편집 모달 */}
      {editingCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h4 className="font-medium mb-4">단어 입력</h4>
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="영어 단어를 입력하세요"
              onKeyPress={(e) => e.key === "Enter" && handleSaveEdit()}
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setEditingCard(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                취소
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

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
                {cards.map((card) => card.text).join(" ")}
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
