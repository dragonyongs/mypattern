// src/components/workbook/ActionSection.tsx
import React, { memo } from "react";
import { Lightbulb } from "lucide-react";
import { WORKBOOK_MESSAGES } from "@/constants/workbook.constants";

interface ActionSectionProps {
  isCorrect: boolean;
  correctAnswer: string;
  studyMode?: "immersive" | "assisted";
  showMeaningEnabled?: boolean;
  explanation?: string;
  showExplanation?: boolean;
  onToggleExplanation?: () => void;
}

export const ActionSection = memo<ActionSectionProps>(
  ({
    isCorrect,
    correctAnswer,
    studyMode = "immersive",
    showMeaningEnabled = false,
    explanation,
    showExplanation = false,
    onToggleExplanation,
  }) => {
    return (
      <>
        {/* 결과 표시 */}
        <div
          className={`text-center p-4 rounded-lg mb-4 ${
            isCorrect ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
          }`}
        >
          <p className="font-medium">
            {isCorrect
              ? WORKBOOK_MESSAGES.CORRECT
              : WORKBOOK_MESSAGES.INCORRECT(correctAnswer)}
          </p>
        </div>

        {/* 설명 토글 버튼 - 도움 모드일 때만 */}
        {studyMode === "assisted" && showMeaningEnabled && explanation && (
          <div className="mt-4">
            <button
              onClick={onToggleExplanation}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-all"
            >
              <Lightbulb className="w-4 h-4" />
              설명 {showExplanation ? "숨기기" : "보기"}
            </button>

            {showExplanation && (
              <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">{explanation}</p>
              </div>
            )}
          </div>
        )}
      </>
    );
  }
);

ActionSection.displayName = "ActionSection";
