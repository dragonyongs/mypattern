// src/components/workbook/QuestionCard.tsx (수정됨)
import React, { memo } from "react";
import { Volume2, CheckCircle, XCircle } from "lucide-react";
import type { WorkbookItem } from "@/types/workbook.types";

interface QuestionCardProps {
  question: WorkbookItem;
  isAnswered: boolean;
  isCorrect: boolean;
  selectedAnswer?: string; // 🔥 선택한 답 추가
  onSpeak: (text: string) => void;
  isSpeaking: boolean;
  children: React.ReactNode;
}

export const QuestionCard = memo<QuestionCardProps>(
  ({
    question,
    isAnswered,
    isCorrect,
    selectedAnswer,
    onSpeak,
    isSpeaking,
    children,
  }) => {
    const questionText = question.question || question.sentence || "";

    // 🔥 빈칸을 선택한 답으로 교체하는 함수
    const getDisplayText = () => {
      if (!questionText) return "";

      // 빈칸 패턴들 (____, _____, etc.)
      const blankPattern = /_{2,}/g;

      if (selectedAnswer) {
        // 선택한 답이 있으면 빈칸을 답으로 교체
        return questionText.replace(blankPattern, selectedAnswer);
      } else {
        // 선택한 답이 없으면 원본 그대로
        return questionText;
      }
    };

    // 🔥 TTS용 완성된 텍스트
    const getCompleteTextForTTS = () => {
      const displayText = getDisplayText();

      // HTML 태그 제거 (있다면)
      return displayText.replace(/<[^>]*>/g, "");
    };

    // 🔥 UI 표시용 JSX (빈칸이 채워진 부분 강조)
    const renderDisplayText = () => {
      if (!selectedAnswer) {
        return <span>{questionText}</span>;
      }

      const blankPattern = /_{2,}/g;
      const parts = questionText.split(blankPattern);

      if (parts.length <= 1) {
        return <span>{questionText}</span>;
      }

      const result = [];
      for (let i = 0; i < parts.length - 1; i++) {
        result.push(<span key={`part-${i}`}>{parts[i]}</span>);
        result.push(
          <span
            key={`answer-${i}`}
            className={`font-bold ${
              isAnswered
                ? isCorrect
                  ? "text-green-600 bg-green-100"
                  : "text-red-600 bg-red-100"
                : "text-blue-600 bg-blue-100"
            } px-2 py-1 rounded`}
          >
            {selectedAnswer}
          </span>
        );
      }
      result.push(<span key={`part-final`}>{parts[parts.length - 1]}</span>);

      return <>{result}</>;
    };

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

        {/* 문제 텍스트 - 빈칸에 선택한 답이 채워진 상태로 표시 */}
        <div className="text-center mb-6">
          <p className="text-2xl font-medium text-gray-800 leading-relaxed mb-4">
            {renderDisplayText()}
          </p>

          {questionText && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                // 🔥 완성된 문장을 TTS로 재생
                onSpeak(getCompleteTextForTTS());
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
