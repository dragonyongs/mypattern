// src/features/dictation/ui/DictationCard.tsx
import React, { useState, useEffect, useCallback, memo } from "react";
import {
  Check,
  X,
  RotateCcw,
  Volume2,
  Lightbulb,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { VocaItem } from "@/entities";
import { useTTS } from "@/shared/hooks";
import {
  createBlankSentence,
  checkAnswer,
  type BlankSentence,
  type AnswerResult,
} from "../lib";

export interface DictationCardProps {
  item: VocaItem;
  onComplete: (correct: boolean) => void;
  onNext: () => void;
  onPrevious: () => void;
  showHint?: boolean;
  difficulty?: "easy" | "medium" | "hard";
}

export const DictationCard = memo<DictationCardProps>(
  ({
    item,
    onComplete,
    onNext,
    onPrevious,
    showHint = true,
    difficulty = "medium",
  }) => {
    const [blankSentence, setBlankSentence] = useState<BlankSentence | null>(
      null
    );
    const [userInput, setUserInput] = useState<string[]>([]);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [result, setResult] = useState<AnswerResult | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [allowNext, setAllowNext] = useState(false); // 🔥 새로운 상태 추가
    const { speak, isSpeaking } = useTTS();

    // 빈칸 문장 생성
    useEffect(() => {
      if (!item) return;

      const sentence = item.exampleEn || item.headword;
      const difficultySettings = {
        easy: {
          blankCount: 1,
          excludeWords: [
            "a",
            "an",
            "the",
            "is",
            "are",
            "was",
            "were",
            "in",
            "on",
            "at",
          ],
        },
        medium: { blankCount: 2, excludeWords: ["a", "an", "the"] },
        hard: { blankCount: 3, excludeWords: [] },
      };

      const settings = difficultySettings[difficulty];
      const blankSent = createBlankSentence(
        sentence,
        settings.blankCount,
        settings.excludeWords
      );

      setBlankSentence(blankSent);
      setUserInput(new Array(blankSent.blanks.length).fill(""));
      setIsSubmitted(false);
      setResult(null);
      setShowResult(false);
      setAllowNext(false); // 🔥 새 문제 시작 시 다음 이동 비허용
    }, [item, difficulty]);

    // 입력값 변경 핸들러
    const handleInputChange = useCallback((index: number, value: string) => {
      setUserInput((prev) => {
        const newInput = [...prev];
        newInput[index] = value;
        return newInput;
      });
    }, []);

    // 🔥 수정된 제출 핸들러 - 자동 다음 이동 제거
    const handleSubmit = useCallback(() => {
      if (!blankSentence) return;

      const correctAnswers = blankSentence.blanks.map((blank) => blank.word);
      const answerResult = checkAnswer(userInput, correctAnswers, false);

      setResult(answerResult);
      setIsSubmitted(true);
      setShowResult(true);
      setAllowNext(true); // 🔥 제출 후 다음 버튼 활성화

      // ❌ 자동 onComplete 호출 제거 - 사용자가 직접 "다음" 클릭 시에만 호출
    }, [blankSentence, userInput]);

    // 🔥 새로운 다음 버튼 핸들러
    const handleNext = useCallback(() => {
      if (!allowNext || !result) return;

      // 사용자가 "다음" 버튼을 클릭했을 때만 onComplete 호출
      onComplete(result.isCorrect);

      // 상태 초기화
      setAllowNext(false);
      setIsSubmitted(false);
      setResult(null);
      setShowResult(false);
    }, [allowNext, result, onComplete]);

    // 재시도 핸들러
    const handleReset = useCallback(() => {
      if (!blankSentence) return;

      setUserInput(new Array(blankSentence.blanks.length).fill(""));
      setIsSubmitted(false);
      setResult(null);
      setShowResult(false);
      setAllowNext(false); // 🔥 재시도 시 다음 이동 비허용
    }, [blankSentence]);

    // 오디오 재생 핸들러
    const handlePlayAudio = useCallback(() => {
      const text = item.exampleEn || item.headword;
      speak(text);
    }, [speak, item]);

    // 키보드 단축키
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter") {
          e.preventDefault();
          if (!isSubmitted && !userInput.some((input) => input.trim() === "")) {
            handleSubmit();
          } else if (allowNext) {
            handleNext(); // 🔥 Enter 키로도 다음 문제 이동 가능
          }
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [userInput, isSubmitted, allowNext, handleSubmit, handleNext]);

    if (!blankSentence) {
      return (
        <div className="dictation-card-loading flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">문제를 준비하고 있습니다...</p>
          </div>
        </div>
      );
    }

    // 문장을 단어별로 분리하여 렌더링
    const renderSentence = () => {
      const words = blankSentence.original.split(" ");
      const blanksMap = new Map(
        blankSentence.blanks.map((blank) => [blank.index, blank])
      );
      let blankIndex = 0;

      return words.map((word, wordIndex) => {
        const blank = blanksMap.get(wordIndex);

        if (blank) {
          const inputIndex = blankIndex++;
          const userAnswer = userInput[inputIndex] || "";
          const isCorrect = result
            ? result.correctAnswers[inputIndex]?.toLowerCase() ===
              userAnswer.toLowerCase()
            : null;

          return (
            <span key={wordIndex} className="inline-block mx-1 relative">
              <input
                type="text"
                value={userAnswer}
                onChange={(e) => handleInputChange(inputIndex, e.target.value)}
                disabled={isSubmitted}
                placeholder="___"
                className={`
                w-20 px-2 py-1 text-center border-b-2 bg-transparent focus:outline-none font-medium
                ${
                  isSubmitted
                    ? isCorrect
                      ? "border-green-500 text-green-700 bg-green-50"
                      : "border-red-500 text-red-700 bg-red-50"
                    : "border-gray-300 focus:border-blue-500 hover:border-blue-400"
                }
                transition-colors duration-200
              `}
                autoFocus={inputIndex === 0}
              />
              {isSubmitted && !isCorrect && (
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 text-xs text-red-600 font-medium whitespace-nowrap">
                  정답: {blank.word}
                </div>
              )}
            </span>
          );
        } else {
          return (
            <span key={wordIndex} className="mx-1 text-gray-800 font-medium">
              {word}
            </span>
          );
        }
      });
    };

    return (
      <div className="dictation-card max-w-4xl mx-auto p-6">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-2">
            빈칸을 채워주세요
          </h2>
          <p className="text-gray-600">
            문장을 듣고 빈칸에 알맞은 단어를 입력하세요
          </p>
        </div>

        {/* 오디오 재생 버튼 */}
        <div className="text-center mb-6">
          <button
            onClick={handlePlayAudio}
            className={`
            px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 mx-auto
            ${
              isSpeaking
                ? "bg-blue-100 text-blue-700 cursor-wait"
                : "bg-blue-500 text-white hover:bg-blue-600 active:scale-95"
            }
          `}
            disabled={isSpeaking}
          >
            <Volume2 size={20} className={isSpeaking ? "animate-pulse" : ""} />
            {isSpeaking ? "재생 중..." : "🔊 음성 듣기"}
          </button>
        </div>

        {/* 번역 힌트 */}
        {showHint && item.exampleKo && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-yellow-800">
              <Lightbulb size={18} />
              <span className="font-medium">힌트:</span>
              <span>{item.exampleKo}</span>
            </div>
          </div>
        )}

        {/* 딕테이션 문장 */}
        <div className="bg-white border-2 border-gray-200 rounded-xl p-8 mb-6 min-h-32 flex items-center justify-center">
          <div className="text-xl leading-relaxed text-center">
            {renderSentence()}
          </div>
        </div>

        {/* 결과 표시 */}
        {showResult && result && (
          <div
            className={`
          mb-6 p-6 rounded-lg border-2 transition-all duration-500
          ${
            result.isCorrect
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
          }
        `}
          >
            <div className="flex items-center gap-3 mb-3">
              {result.isCorrect ? (
                <>
                  <Check size={24} className="text-green-600" />
                  <span className="text-green-800 font-bold text-lg">
                    정답입니다! 🎉
                  </span>
                </>
              ) : (
                <>
                  <X size={24} className="text-red-600" />
                  <span className="text-red-800 font-bold text-lg">
                    틀렸습니다
                  </span>
                </>
              )}
            </div>

            <div className="text-sm text-gray-700">
              <p className="mb-2">
                점수: <strong>{result.score}점</strong>
              </p>
              {!result.isCorrect && (
                <div className="bg-white p-3 rounded border">
                  <p className="font-medium">정답:</p>
                  <p className="text-gray-800">{blankSentence.original}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 🔥 수정된 액션 버튼 부분 */}
        <div className="flex gap-4 justify-center">
          {!isSubmitted ? (
            // 제출 전 상태
            <>
              <button
                onClick={handleReset}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <RotateCcw size={18} />
                다시하기
              </button>
              <button
                onClick={handleSubmit}
                disabled={userInput.some((input) => input.trim() === "")}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-semibold flex items-center gap-2"
              >
                <Check size={18} />
                제출{" "}
                {userInput.some((input) => input.trim() === "")
                  ? "(빈칸을 채워주세요)"
                  : "(Enter)"}
              </button>
            </>
          ) : (
            // 제출 후 상태 - 사용자가 직접 "다음" 클릭해야 함
            <>
              <button
                onClick={handleReset}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <RotateCcw size={18} />
                다시 풀기
              </button>
              <button
                onClick={handleNext}
                disabled={!allowNext}
                className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-semibold flex items-center gap-2"
              >
                다음 문제
                <ArrowRight size={18} />
              </button>
            </>
          )}
        </div>

        {/* 네비게이션 */}
        <div className="flex justify-between mt-8">
          <button
            onClick={onPrevious}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
          >
            <ArrowLeft size={18} />
            이전
          </button>
        </div>

        {/* 키보드 단축키 안내 */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>
            키보드: Tab (다음 빈칸) | Enter
            {!isSubmitted ? " (제출)" : allowNext ? " (다음 문제)" : ""}
          </p>
        </div>
      </div>
    );
  }
);

DictationCard.displayName = "DictationCard";
