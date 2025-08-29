// src/features/build/components/PatternSelector.tsx
import React from "react";
import { ArrowRight, MessageCircle } from "lucide-react";
import type { ConversationPattern } from "../types";

interface PatternSelectorProps {
  patterns: ConversationPattern[];
  onPatternSelect: (pattern: ConversationPattern) => void;
}

export const PatternSelector: React.FC<PatternSelectorProps> = ({
  patterns,
  onPatternSelect,
}) => {
  if (patterns.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl p-8 text-center">
        <MessageCircle size={48} className="mx-auto mb-4 text-gray-400" />
        <p className="text-gray-600">관련된 대화 패턴을 찾을 수 없습니다.</p>
        <p className="text-sm text-gray-500 mt-2">
          다른 표현으로 다시 시도해보세요.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">추천 대화 패턴</h3>
      <div className="grid gap-4">
        {patterns.map((pattern) => (
          <div
            key={pattern.id}
            className="bg-white border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onPatternSelect(pattern)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-sm text-blue-600 font-medium mb-2">
                  {pattern.scenario}
                </div>
                <div className="mb-3">
                  <div className="text-gray-600 text-sm mb-1">
                    {pattern.userSide.korean}
                  </div>
                  <div className="font-medium">{pattern.userSide.english}</div>
                </div>
                <div className="text-xs text-gray-500">
                  구조: {pattern.userSide.structure}
                </div>
              </div>
              <ArrowRight size={20} className="text-gray-400 ml-4" />
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="text-xs text-gray-500 mb-1">예상 응답:</div>
              <div className="text-sm text-gray-700">
                {pattern.responseSide.english}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
