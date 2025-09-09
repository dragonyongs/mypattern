// src/components/workbook/QuestionCard.tsx
import React, { memo } from "react";
import { Volume2, CheckCircle, XCircle } from "lucide-react";
import type { WorkbookItem } from "@/types/workbook.types";

interface QuestionCardProps {
  question: WorkbookItem;
  isAnswered: boolean;
  isCorrect: boolean;
  onSpeak: (text: string) => void;
  isSpeaking: boolean;
  children: React.ReactNode;
}

export const QuestionCard = memo<QuestionCardProps>(
  ({ question, isAnswered, isCorrect, onSpeak, isSpeaking, children }) => {
    const questionText = question.question || question.sentence || "";

    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 min-h-[500px] flex flex-col justify-center relative">
        {/* 상태 뱃지 */}
        {isAnswered && (
          <div
            className={`absolute top-4 right-4 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${
              isCorrect
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {isCorrect ? (
              <>
                <CheckCircle className="w-4 h-4" />
                정답
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                오답
              </>
            )}
          </div>
        )}

        {/* 문제 텍스트 */}
        <div className="text-center mb-6">
          <p className="text-2xl font-medium text-gray-800 leading-relaxed mb-4">
            {questionText}
          </p>

          {questionText && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSpeak(questionText);
              }}
              disabled={isSpeaking}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 text-gray-700 rounded-full text-sm font-medium transition-all disabled:opacity-50"
            >
              <Volume2 className="w-4 h-4" />
              {isSpeaking ? "재생중" : "발음 듣기"}
            </button>
          )}
        </div>

        {children}
      </div>
    );
  }
);

QuestionCard.displayName = "QuestionCard";
