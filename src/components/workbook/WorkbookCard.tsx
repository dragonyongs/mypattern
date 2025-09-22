import React from "react";
import { CheckCircle2, XCircle, CheckCircle } from "lucide-react";
import { SpeakButton } from "@/shared/components/SpeakButton";
import ActionButtons from "@/shared/components/ActionButtons";
import type { StudyModeType } from "@/types";

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

  studyMode: StudyModeType;

  // 이벤트
  onAnswerSelect: (answer: string) => void;
  onSpeak: (text: string) => void;
  onCheck?: () => void;
  onRetry?: () => void;
  onToggleExplanation?: () => void;

  // ✅ 여러 정답 지원
  acceptableAnswers?: string[];
}

export const WorkbookCard: React.FC<WorkbookCardProps> = ({
  question,
  options = [],
  correctAnswer,
  explanation,
  selectedAnswer,
  showResult = false,
  showExplanation = false,
  isSpeaking = false,
  isAnswered = false,
  onAnswerSelect,
  onSpeak,
  onCheck,
  onRetry,
  onToggleExplanation,
  studyMode,
  acceptableAnswers = [],
}) => {
  // ✅ 정답 여부 계산 (여러 정답 지원)
  const isCorrect = React.useMemo(() => {
    if (!selectedAnswer) return false;

    const validAnswers =
      acceptableAnswers.length > 0 ? acceptableAnswers : [correctAnswer];

    return validAnswers.some(
      (answer) =>
        answer.toLowerCase().trim() === selectedAnswer.toLowerCase().trim()
    );
  }, [selectedAnswer, correctAnswer, acceptableAnswers]);

  // ✅ 하이라이트된 문장 생성
  const renderQuestionWithHighlight = () => {
    if (!question) return "";
    const blankPattern = /_{2,}/g;

    if (!selectedAnswer) {
      return question; // 선택하지 않았으면 빈칸 그대로
    }

    // 빈칸을 선택한 답안으로 교체하면서 하이라이트 적용
    const highlightClass = showResult
      ? isCorrect
        ? "text-green-600"
        : "text-red-600"
      : "text-violet-600";

    const highlightedText = `<span class="${highlightClass} underline">${selectedAnswer}</span>`;

    return question.replace(blankPattern, highlightedText);
  };

  // 🔥 TTS용 완성된 텍스트 생성
  const getCompleteTextForTTS = () => {
    if (!selectedAnswer) return question;
    const blankPattern = /_{2,}/g;
    return question.replace(blankPattern, selectedAnswer);
  };

  // ✅ options가 배열인지 확인
  const safeOptions = Array.isArray(options) ? options : [];

  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 lg:p-8 w-full">
      <div className="text-center">
        {/* 학습 완료 뱃지 */}
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

        {/* ✅ 질문 영역 - HTML로 렌더링하여 하이라이트 표시 */}
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-6 mb-6 border border-indigo-100">
          <h2
            className="text-xl font-bold text-gray-900"
            dangerouslySetInnerHTML={{ __html: renderQuestionWithHighlight() }}
          />

          <div className="flex justify-center gap-x-2">
            {selectedAnswer && (
              <SpeakButton
                text={getCompleteTextForTTS()}
                onSpeak={onSpeak}
                isSpeaking={isSpeaking}
                className="mt-4 bg-white/70"
              />
            )}
            <ActionButtons
              isAnswered={isAnswered}
              canCheck={!!selectedAnswer}
              onCheck={onCheck}
              onRetry={onRetry}
            />
          </div>
        </div>

        {/* 선택지 */}
        <div className="space-y-3 mb-4">
          {safeOptions.map((option, index) => {
            // ✅ 선택지 상태 계산
            const isSelected = selectedAnswer === option;
            const isCorrectOption =
              showResult &&
              (acceptableAnswers.length > 0
                ? acceptableAnswers.some(
                    (ans) => ans.toLowerCase() === option.toLowerCase()
                  )
                : option.toLowerCase() === correctAnswer.toLowerCase());
            const isWrongSelected = showResult && isSelected && !isCorrect;

            return (
              <button
                key={index}
                onClick={() => !isAnswered && onAnswerSelect(option)}
                disabled={isAnswered}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-300 hover:shadow-md disabled:cursor-not-allowed ${
                  isWrongSelected
                    ? "border-red-500 bg-red-50 shadow-lg"
                    : isCorrectOption && showResult
                    ? "border-green-500 bg-green-50 shadow-lg"
                    : isSelected
                    ? "border-blue-500 bg-blue-50 shadow-md"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{option}</span>

                  {/* 결과 아이콘 */}
                  {showResult &&
                    isSelected &&
                    (isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    ))}

                  {/* 정답 표시 (오답 선택시 정답 강조) */}
                  {showResult &&
                    isCorrectOption &&
                    selectedAnswer !== option && (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    )}
                </div>
              </button>
            );
          })}
        </div>

        {/* 힌트 텍스트 */}
        {!isAnswered && (
          <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
            <span>영어로 직접 문제를 해결해보세요</span>
          </div>
        )}
      </div>

      {/* 해설 영역 */}
      {studyMode === "assisted" && showResult && explanation && (
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
