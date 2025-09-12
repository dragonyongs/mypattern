import React from "react";
import { CheckCircle2, XCircle, CheckCircle } from "lucide-react";
import { SpeakButton } from "@/shared/components/SpeakButton";

export interface WorkbookCardProps {
  // 문제 데이터
  question: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;

  // 상태
  selectedAnswer?: string;
  showResult?: boolean;
  showExplanation?: boolean;
  isSpeaking?: boolean;
  isAnswered?: boolean;

  // 이벤트
  onAnswerSelect: (answer: string) => void;
  onSpeak: (text: string) => void;
  onToggleExplanation?: () => void;
}

export const WorkbookCard: React.FC<WorkbookCardProps> = ({
  question,
  options,
  correctAnswer,
  explanation,
  selectedAnswer,
  showResult = false,
  showExplanation = false,
  isSpeaking = false,
  isAnswered = false,
  onAnswerSelect,
  onSpeak,
  onToggleExplanation,
}) => {
  const isCorrect = selectedAnswer === correctAnswer;

  // 🔥 빈칸을 선택한 답으로 교체하는 함수
  const renderQuestionWithAnswer = () => {
    if (!question) return "";

    const blankPattern = /_{2,}/g;

    if (!selectedAnswer) {
      return <span>{question}</span>;
    }

    // 빈칸을 선택한 답으로 교체하고 하이라이트
    const parts = question.split(blankPattern);
    if (parts.length <= 1) {
      return <span>{question}</span>;
    }

    const result = [];
    for (let i = 0; i < parts.length - 1; i++) {
      result.push(<span key={`text-${i}`}>{parts[i]}</span>);
      result.push(
        <span
          key={`answer-${i}`}
          className="font-bold text-blue-600 underline decoration-2"
        >
          {selectedAnswer}
        </span>
      );
    }
    result.push(<span key="final">{parts[parts.length - 1]}</span>);

    return <>{result}</>;
  };

  // 🔥 TTS용 완성된 텍스트 생성
  const getCompleteTextForTTS = () => {
    if (!selectedAnswer) return question;
    const blankPattern = /_{2,}/g;
    return question.replace(blankPattern, selectedAnswer);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 lg:p-8 w-full">
      <div className="text-center">
        {/* 🔥 학습 완료 뱃지 (기존 "문제 해결"에서 변경) */}
        {isAnswered && (
          <div
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mb-4 ${
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
                틀렸어요
              </>
            )}
          </div>
        )}

        {/* 질문 영역 */}
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-6 mb-6 border border-indigo-100">
          {/* 🔥 빈칸이 채워진 문제 문장 */}
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {renderQuestionWithAnswer()}
          </h2>

          {/* 🔥 공통 발음 듣기 버튼 (완성된 문장으로 TTS) */}
          <SpeakButton
            text={getCompleteTextForTTS()}
            onSpeak={onSpeak}
            isSpeaking={isSpeaking}
            className="bg-white/70"
          />
        </div>

        {/* 선택지 */}
        <div className="space-y-3 mb-4">
          {options.map((option, index) => (
            <button
              key={index}
              onClick={() => !isAnswered && onAnswerSelect(option)}
              disabled={isAnswered}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-300 hover:shadow-md disabled:cursor-not-allowed ${
                selectedAnswer === option
                  ? showResult && isCorrect
                    ? "border-green-500 bg-green-50 shadow-lg"
                    : showResult && !isCorrect
                    ? "border-red-500 bg-red-50 shadow-lg"
                    : "border-blue-500 bg-blue-50 shadow-md"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{option}</span>

                {/* 결과 아이콘 */}
                {showResult &&
                  selectedAnswer === option &&
                  (isCorrect ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  ))}

                {/* 정답 표시 (오답 선택시 정답 강조) */}
                {showResult &&
                  option === correctAnswer &&
                  selectedAnswer !== option && (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  )}
              </div>
            </button>
          ))}
        </div>

        {/* 힌트 텍스트 */}
        {!isAnswered && (
          <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
            <span>영어로 직접 문제를 해결해보세요</span>
          </div>
        )}
      </div>

      {/* 해설 영역 */}
      {showResult && explanation && (
        <div
          className={`mt-6 p-4 rounded-xl border transition-all duration-500 ${
            isCorrect
              ? "border-green-200 bg-green-50"
              : "border-red-200 bg-red-50"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <h3
              className={`font-bold ${
                isCorrect ? "text-green-800" : "text-red-800"
              }`}
            >
              {isCorrect ? "정답입니다!" : "아쉽네요"}
            </h3>

            {onToggleExplanation && (
              <button
                onClick={onToggleExplanation}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                {showExplanation ? "해설 숨기기" : "해설 보기"}
              </button>
            )}
          </div>

          {showExplanation && (
            <p className="text-sm text-gray-700 leading-relaxed">
              {explanation}
            </p>
          )}

          {!isCorrect && (
            <div className="mt-3 p-3 bg-white rounded-lg border">
              <div className="text-sm text-gray-600">정답:</div>
              <div className="font-semibold text-green-700">
                {correctAnswer}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WorkbookCard;
