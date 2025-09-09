// src/components/workbook/CompletionCard.tsx
import React, { memo } from "react";
import {
  WORKBOOK_CONSTANTS,
  WORKBOOK_MESSAGES,
} from "@/constants/workbook.constants";

interface CompletionCardProps {
  score: number;
  totalQuestions: number;
  onComplete: () => void;
}

export const CompletionCard = memo<CompletionCardProps>(
  ({ score, totalQuestions, onComplete }) => {
    const accuracy = totalQuestions > 0 ? score / totalQuestions : 0;

    // 성과에 따른 이모지와 메시지 결정
    const getResultData = () => {
      if (accuracy === WORKBOOK_CONSTANTS.SCORE_THRESHOLDS.PERFECT) {
        return {
          emoji: "🎉",
          message: WORKBOOK_MESSAGES.PERFECT,
        };
      } else if (accuracy >= WORKBOOK_CONSTANTS.SCORE_THRESHOLDS.GOOD) {
        return {
          emoji: "👍",
          message: WORKBOOK_MESSAGES.GOOD,
        };
      } else {
        return {
          emoji: "💪",
          message: WORKBOOK_MESSAGES.RETRY,
        };
      }
    };

    const { emoji, message } = getResultData();
    const accuracyPercentage = Math.round(accuracy * 100);

    return (
      <div className="mt-4">
        <div className="bg-white rounded-xl p-6 text-center border-2 border-green-200">
          <div className="text-4xl mb-2">{emoji}</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {message}
          </h3>
          <p className="text-gray-600 mb-4">
            총 {totalQuestions}문제 중 {score}문제 정답 ({accuracyPercentage}%)
          </p>
          <button
            onClick={onComplete}
            className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-lg transition-all shadow-lg"
          >
            워크북 학습 완료하기
          </button>
        </div>
      </div>
    );
  }
);

CompletionCard.displayName = "CompletionCard";
