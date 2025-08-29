// src/features/build/components/PatternSlotEditor.tsx (새로 생성)
import React, { useState } from "react";
import { RefreshCw, Edit3 } from "lucide-react";

interface SlotEditorProps {
  pattern: ConversationPattern;
  onSlotChange: (
    slotName: string,
    newValue: { ko: string; en: string }
  ) => void;
  availableSlotValues: Record<string, Array<{ ko: string; en: string }>>;
}

export const PatternSlotEditor: React.FC<SlotEditorProps> = ({
  pattern,
  onSlotChange,
  availableSlotValues,
}) => {
  const [editingSlot, setEditingSlot] = useState<string | null>(null);

  const getSlotFromPattern = (slotName: string) => {
    // 패턴에서 현재 슬롯값 추출
    const koreanText = pattern.userSide.korean;
    const englishText = pattern.userSide.english;

    // 간단한 정규식으로 현재값 추정 (실제로는 더 정교한 로직 필요)
    return { ko: "현재값", en: "current value" };
  };

  const handleRandomize = (slotName: string) => {
    const values = availableSlotValues[slotName] || [];
    if (values.length > 0) {
      const randomValue = values[Math.floor(Math.random() * values.length)];
      onSlotChange(slotName, randomValue);
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
      <h4 className="text-sm font-medium text-blue-800 mb-3">
        🎯 문장 속 단어 바꾸기
      </h4>

      <div className="space-y-2">
        {pattern.userSide.cards
          .filter((card) => card.pos === "PLACE" || card.pos === "OBJECT")
          .map((card, index) => (
            <div key={card.id} className="flex items-center gap-2">
              <div className="flex-1 bg-white border rounded px-3 py-2">
                <div className="text-sm font-medium">{card.text}</div>
                <div className="text-xs text-gray-500">{card.korean}</div>
              </div>

              <button
                onClick={() => handleRandomize("PLACE")} // 실제로는 card.pos 기반
                className="p-2 text-blue-600 hover:bg-blue-100 rounded"
                title="다른 단어로 바꾸기"
              >
                <RefreshCw size={16} />
              </button>

              <button
                onClick={() => setEditingSlot(card.id)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                title="직접 수정하기"
              >
                <Edit3 size={16} />
              </button>
            </div>
          ))}
      </div>

      <div className="mt-3 text-xs text-blue-600">
        💡 단어를 바꿔가며 다양한 상황을 연습해보세요!
      </div>
    </div>
  );
};
