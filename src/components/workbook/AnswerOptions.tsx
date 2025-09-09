// src/components/workbook/AnswerOptions.tsx
import React, { memo } from "react";
import { CheckCircle, XCircle } from "lucide-react";

interface AnswerOptionsProps {
  options: string[];
  selectedAnswer?: string;
  correctAnswer: string;
  showResult: boolean;
  isAnswered: boolean;
  onSelect: (answer: string) => void;
}

export const AnswerOptions = memo<AnswerOptionsProps>(
  ({
    options,
    selectedAnswer,
    correctAnswer,
    showResult,
    isAnswered,
    onSelect,
  }) => {
    return (
      <div className="space-y-3 mb-6">
        {options.map((option, index) => {
          const isSelected = selectedAnswer === option;
          const isCorrect = option === correctAnswer;

          let buttonClass =
            "w-full p-4 text-left border-2 rounded-xl transition-all ";

          if (showResult) {
            if (isCorrect) {
              buttonClass += "border-green-500 bg-green-50 text-green-700";
            } else if (isSelected && !isCorrect) {
              buttonClass += "border-red-500 bg-red-50 text-red-700";
            } else {
              buttonClass += "border-gray-200 bg-gray-50 text-gray-500";
            }
          } else if (isSelected) {
            buttonClass += "border-blue-500 bg-blue-50 text-blue-700";
          } else {
            buttonClass +=
              "border-gray-300 hover:border-blue-400 hover:bg-blue-50";
          }

          if (isAnswered) {
            buttonClass += " cursor-not-allowed";
          }

          return (
            <button
              key={index}
              onClick={() => onSelect(option)}
              disabled={isAnswered}
              className={buttonClass}
            >
              <div className="flex items-center justify-between">
                <span>{option}</span>
                {showResult && (
                  <div className="flex-shrink-0 ml-2">
                    {isCorrect ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : isSelected ? (
                      <XCircle className="w-5 h-5 text-red-500" />
                    ) : null}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    );
  }
);

AnswerOptions.displayName = "AnswerOptions";
