// src/features/build/components/IntentInput.tsx
import React, { useState, useCallback } from "react";
import { Search } from "lucide-react";
import type { UserIntent } from "../types";

interface IntentInputProps {
  onIntentSubmit: (intent: UserIntent) => void;
  isLoading?: boolean;
}

export const IntentInput: React.FC<IntentInputProps> = ({
  onIntentSubmit,
  isLoading = false,
}) => {
  const [input, setInput] = useState("");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (input.trim()) {
        onIntentSubmit({
          korean: input.trim(),
          category: "question", // 임시값, 실제로는 분석 결과
          confidence: 0.8,
        });
      }
    },
    [input, onIntentSubmit]
  );

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <h2 className="text-lg font-semibold mb-4">무엇을 말하고 싶으신가요?</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="예: 강남역으로 가는 버스 정류장이 어디에 있나요?"
            className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-blue-500 hover:bg-blue-50 rounded-md disabled:opacity-50"
          >
            <Search size={20} />
          </button>
        </div>
        <div className="text-sm text-gray-500">
          💡 일상에서 외국인과 대화할 때 하고 싶은 말을 자연스럽게 입력해보세요
        </div>
      </form>
    </div>
  );
};
