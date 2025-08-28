// src/features/learn/components/shared/PatternSuggestions.tsx
import React from "react";
import { Volume2, Plus } from "lucide-react";
import { useLearningStore } from "@/stores/learningStore";
import type { Generated } from "../../services/patternEngine";

interface PatternSuggestionsProps {
  patterns: Generated[];
  title?: string;
}

export const PatternSuggestions: React.FC<PatternSuggestionsProps> = ({
  patterns,
  title = "추천 패턴",
}) => {
  const store = useLearningStore();

  const addToQueue = (pattern: Generated) => {
    const id = store.acceptSuggestionToQueue({
      text: pattern.text,
      korean: pattern.korean,
      templateId: pattern.schemaId,
      usedChunks: [],
    });
    store.fireUIIntent("voice", id);
  };

  if (patterns.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>추천할 패턴이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="font-medium text-gray-900">{title}</h4>
      <div className="grid grid-cols-1 gap-2">
        {patterns.map((pattern, i) => (
          <div
            key={`${pattern.text}-${i}`}
            className="border rounded p-3 bg-gray-50"
          >
            <div className="text-sm font-medium">{pattern.text}</div>
            <div className="text-xs text-gray-500 mt-1">{pattern.korean}</div>
            {pattern.confidence && (
              <div className="text-xs text-blue-500 mt-1">
                신뢰도: {Math.round(pattern.confidence * 100)}%
              </div>
            )}
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => addToQueue(pattern)}
                className="px-2 py-1 bg-blue-600 text-white rounded inline-flex items-center gap-1 text-xs hover:bg-blue-700"
              >
                <Volume2 size={14} />
                학습하기
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
