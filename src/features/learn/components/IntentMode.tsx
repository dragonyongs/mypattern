// src/features/learn/components/IntentMode.tsx
import React, { useState, useCallback } from "react";
import { MessageSquare, Lightbulb } from "lucide-react";
import { PatternSuggestions } from "./shared/PatternSuggestions";
import { generatePatterns } from "../services/patternEngine";
import type { Generated } from "../services/patternEngine";
import type { UserInput } from "../types/userInput.types";

export const IntentMode: React.FC = () => {
  const [intent, setIntent] = useState("");
  const [suggestions, setSuggestions] = useState<Generated[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateFromIntent = useCallback(async () => {
    if (!intent.trim()) return;

    setIsGenerating(true);
    try {
      const userInput: UserInput = {
        type: "intent",
        content: intent,
        targetLanguage: "ko",
      };

      const patterns = generatePatterns({
        userInput,
        limit: 5,
      });

      setSuggestions(patterns);
    } catch (error) {
      console.error("패턴 생성 중 오류:", error);
    } finally {
      setIsGenerating(false);
    }
  }, [intent]);

  const exampleIntents = [
    "친구와 병원에서 만날 예정이라고 말하고 싶어요",
    "오늘 학교에 갈 거라고 표현하고 싶어요",
    "어디에 있는지 물어보고 싶어요",
  ];

  return (
    <div className="bg-white border rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">의도 기반 생성</h3>
        <MessageSquare size={20} className="text-gray-400" />
      </div>

      <div className="space-y-3">
        <textarea
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
          placeholder="하고 싶은 말을 한국어로 자세히 입력하세요..."
          className="w-full p-3 border rounded min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          onClick={handleGenerateFromIntent}
          disabled={!intent.trim() || isGenerating}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded inline-flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Lightbulb size={16} />
          {isGenerating ? "생성 중..." : "영어 패턴 추천받기"}
        </button>
      </div>

      {/* 예시 의도들 */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">예시:</h4>
        <div className="space-y-1">
          {exampleIntents.map((example, i) => (
            <button
              key={i}
              onClick={() => setIntent(example)}
              className="block w-full text-left text-xs text-gray-600 hover:text-blue-600 p-2 hover:bg-blue-50 rounded"
            >
              "{example}"
            </button>
          ))}
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="border-t pt-4">
          <PatternSuggestions
            patterns={suggestions}
            title="의도 기반 추천 패턴"
          />
        </div>
      )}
    </div>
  );
};
