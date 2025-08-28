// src/features/learn/components/shared/FeedbackDisplay.tsx
import React from "react";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import type {
  GrammarFeedback,
  PatternMatch,
  ImprovementSuggestion,
} from "../../types/userInput.types";

interface FeedbackDisplayProps {
  feedback: {
    grammarCheck: GrammarFeedback;
    matchedPatterns: PatternMatch[];
    suggestions: ImprovementSuggestion[];
  };
}

export const FeedbackDisplay: React.FC<FeedbackDisplayProps> = ({
  feedback,
}) => {
  const { grammarCheck, matchedPatterns, suggestions } = feedback;

  return (
    <div className="space-y-4">
      {/* 문법 검사 결과 */}
      <div className="border rounded p-4">
        <div className="flex items-center gap-2 mb-3">
          {grammarCheck.isCorrect ? (
            <CheckCircle className="text-green-500" size={20} />
          ) : (
            <XCircle className="text-red-500" size={20} />
          )}
          <h4 className="font-medium">
            문법 검사 결과 ({Math.round(grammarCheck.score * 100)}점)
          </h4>
        </div>

        {grammarCheck.errors.length > 0 && (
          <div className="space-y-2 mb-3">
            <h5 className="text-sm font-medium text-red-600">발견된 오류:</h5>
            {grammarCheck.errors.map((error, i) => (
              <div key={i} className="bg-red-50 p-2 rounded text-sm">
                <div className="font-medium text-red-800">{error.type}</div>
                <div className="text-red-700">{error.message}</div>
                <div className="text-red-600 mt-1">
                  제안: {error.suggestion}
                </div>
              </div>
            ))}
          </div>
        )}

        {grammarCheck.suggestions.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-sm font-medium text-blue-600">개선 제안:</h5>
            {grammarCheck.suggestions.map((suggestion, i) => (
              <div
                key={i}
                className="bg-blue-50 p-2 rounded text-sm text-blue-700"
              >
                {suggestion}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 패턴 매칭 결과 */}
      {matchedPatterns.length > 0 && (
        <div className="border rounded p-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <AlertCircle className="text-blue-500" size={20} />
            유사한 패턴
          </h4>
          <div className="space-y-2">
            {matchedPatterns.map((match, i) => (
              <div key={i} className="bg-blue-50 p-2 rounded text-sm">
                <div className="font-medium">
                  {match.matched} ({Math.round(match.similarity * 100)}% 유사)
                </div>
                <div className="text-gray-600">패턴: {match.schemaId}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 개선 제안 */}
      {suggestions.length > 0 && (
        <div className="border rounded p-4">
          <h4 className="font-medium mb-3">개선 제안</h4>
          <div className="space-y-3">
            {suggestions.map((suggestion, i) => (
              <div key={i} className="bg-green-50 p-3 rounded">
                <div className="text-sm font-medium text-green-800 mb-1">
                  {suggestion.type}
                </div>
                <div className="text-sm text-gray-600 mb-1">
                  원문: <span className="font-mono">{suggestion.original}</span>
                </div>
                <div className="text-sm text-green-700 mb-1">
                  개선:{" "}
                  <span className="font-mono font-medium">
                    {suggestion.improved}
                  </span>
                </div>
                <div className="text-xs text-gray-500">{suggestion.reason}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
