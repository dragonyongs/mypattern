// src/features/learn/components/KeywordMode.tsx
import React, { useState, useCallback } from "react";
import { Plus, X, Sparkles } from "lucide-react";
import { PatternSuggestions } from "./shared/PatternSuggestions";
import { generatePatterns } from "../services/patternEngine";
import type { Generated } from "../services/patternEngine";
import type { UserInput } from "../types/userInput.types";

export const KeywordMode: React.FC = () => {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<Generated[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const addKeyword = useCallback(
    (keyword: string) => {
      const trimmed = keyword.trim();
      if (trimmed && !keywords.includes(trimmed)) {
        setKeywords([...keywords, trimmed]);
        setInputValue("");
      }
    },
    [keywords]
  );

  const removeKeyword = useCallback(
    (index: number) => {
      setKeywords(keywords.filter((_, i) => i !== index));
    },
    [keywords]
  );

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addKeyword(inputValue);
      }
    },
    [inputValue, addKeyword]
  );

  const handleGenerateFromKeywords = useCallback(async () => {
    if (keywords.length === 0) return;

    setIsGenerating(true);
    try {
      const userInput: UserInput = {
        type: "keyword",
        content: keywords.join(" "),
        targetLanguage: "en",
      };

      const patterns = generatePatterns({
        userInput,
        limit: 10,
      });

      setSuggestions(patterns);
    } catch (error) {
      console.error("패턴 생성 중 오류:", error);
    } finally {
      setIsGenerating(false);
    }
  }, [keywords]);

  return (
    <div className="bg-white border rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">키워드 기반 생성</h3>
        <span className="text-xs text-gray-500">
          {keywords.length}개 키워드
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="키워드를 입력하세요 (예: hospital, friend, today)"
            className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => addKeyword(inputValue)}
            disabled={!inputValue.trim()}
            className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
          >
            <Plus size={16} />
          </button>
        </div>

        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {keywords.map((word, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-blue-100 text-blue-800 rounded inline-flex items-center gap-1 text-sm"
              >
                {word}
                <button
                  onClick={() => removeKeyword(i)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        <button
          onClick={handleGenerateFromKeywords}
          disabled={keywords.length === 0 || isGenerating}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded inline-flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles size={16} />
          {isGenerating ? "생성 중..." : "패턴 생성하기"}
        </button>
      </div>

      {suggestions.length > 0 && (
        <div className="border-t pt-4">
          <PatternSuggestions
            patterns={suggestions}
            title="키워드 기반 추천 패턴"
          />
        </div>
      )}
    </div>
  );
};
