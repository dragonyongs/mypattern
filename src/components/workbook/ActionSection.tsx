// src/components/workbook/ActionSection.tsx
import React, { memo } from "react";
import { Check, RotateCcw, Lightbulb } from "lucide-react";
import { WORKBOOK_MESSAGES } from "@/constants/workbook.constants";

interface ActionSectionProps {
  isAnswered: boolean;
  isCorrect: boolean;
  hasSelectedAnswer: boolean;
  correctAnswer: string;
  onCheck: () => void;
  onRetry: () => void;
  studyMode?: "immersive" | "assisted";
  showMeaningEnabled?: boolean;
  explanation?: string;
  showExplanation?: boolean;
  onToggleExplanation?: () => void;
}

export const ActionSection = memo<ActionSectionProps>(
  ({
    isAnswered,
    isCorrect,
    hasSelectedAnswer,
    correctAnswer,
    onCheck,
    onRetry,
    studyMode = "immersive",
    showMeaningEnabled = false,
    explanation,
    showExplanation = false,
    onToggleExplanation,
  }) => {
    return (
      <>
        {/* 결과 표시 */}
        {isAnswered && (
          <div
            className={`text-center p-4 rounded-lg mb-4 ${
              isCorrect
                ? "bg-green-50 text-green-800"
                : "bg-red-50 text-red-800"
            }`}
          >
            <p className="font-medium">
              {isCorrect
                ? WORKBOOK_MESSAGES.CORRECT
                : WORKBOOK_MESSAGES.INCORRECT(correctAnswer)}
            </p>
          </div>
        )}

        {/* 설명 토글 버튼 */}
        {isAnswered &&
          studyMode === "assisted" &&
          showMeaningEnabled &&
          explanation && (
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

        {/* 힌트 텍스트 */}
        {!isAnswered && (
          <div className="text-center text-gray-400 text-sm mt-4">
            {
              WORKBOOK_MESSAGES.STUDY_HINTS[
                studyMode.toUpperCase() as keyof typeof WORKBOOK_MESSAGES.STUDY_HINTS
              ]
            }
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="mt-4">
          {!isAnswered ? (
            <button
              onClick={onCheck}
              disabled={!hasSelectedAnswer}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all"
            >
              <Check className="w-4 h-4" />
              정답 확인
            </button>
          ) : (
            <button
              onClick={onRetry}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              다시 풀기
            </button>
          )}
        </div>
      </>
    );
  }
);

ActionSection.displayName = "ActionSection";
