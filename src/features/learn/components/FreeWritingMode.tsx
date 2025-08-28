// src/features/learn/components/FreeWritingMode.tsx
import React, { useState, useCallback } from "react";
import { Send, RotateCcw } from "lucide-react";
import { FeedbackDisplay } from "./shared/FeedbackDisplay";
import {
  checkGrammar,
  findSimilarPatterns,
  generateImprovements,
} from "../services/userInputService";
import type {
  GrammarFeedback,
  PatternMatch,
  ImprovementSuggestion,
} from "../types/userInput.types";

interface FeedbackData {
  grammarCheck: GrammarFeedback;
  matchedPatterns: PatternMatch[];
  suggestions: ImprovementSuggestion[];
}

export const FreeWritingMode: React.FC = () => {
  const [userText, setUserText] = useState("");
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const handleCheck = useCallback(async () => {
    if (!userText.trim()) return;

    setIsChecking(true);
    try {
      // 1. 문법 검사
      const grammarCheck = await checkGrammar(userText);

      // 2. 패턴 매칭 - 기존 패턴과 유사한지 확인
      const matchedPatterns = findSimilarPatterns(userText);

      // 3. 개선 제안
      const suggestions = generateImprovements(userText, matchedPatterns);

      setFeedback({ grammarCheck, matchedPatterns, suggestions });
    } catch (error) {
      console.error("피드백 생성 중 오류:", error);
    } finally {
      setIsChecking(false);
    }
  }, [userText]);

  const handleReset = () => {
    setUserText("");
    setFeedback(null);
  };

  return (
    <div className="bg-white border rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">자유 영작</h3>
        <button
          onClick={handleReset}
          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      <div className="space-y-3">
        <textarea
          value={userText}
          onChange={(e) => setUserText(e.target.value)}
          placeholder="영어 문장을 자유롭게 작성해보세요..."
          className="w-full p-3 border rounded min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          onClick={handleCheck}
          disabled={!userText.trim() || isChecking}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded inline-flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={16} />
          {isChecking ? "검사 중..." : "검사하기"}
        </button>
      </div>

      {feedback && (
        <div className="border-t pt-4">
          <FeedbackDisplay feedback={feedback} />
        </div>
      )}
    </div>
  );
};
