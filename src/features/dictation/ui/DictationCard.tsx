import React, { useState, useEffect, useCallback } from "react";
import { Check, X, RotateCcw } from "lucide-react";
import { VocaItem } from "@/entities";
import { useTTS } from "@/shared/hooks";
import { createBlankSentence, checkAnswer } from "../lib";

interface DictationCardProps {
  item: VocaItem;
  onComplete: (correct: boolean) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function DictationCard({
  item,
  onComplete,
  onNext,
  onPrevious,
}: DictationCardProps) {
  const [userInput, setUserInput] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [blanks, setBlanks] = useState<
    Array<{ word: string; isBlank: boolean }>
  >([]);

  const { speak } = useTTS();

  useEffect(() => {
    // 문장에서 핵심 단어를 빈칸으로 만들기
    const sentence = item.exampleEn || item.headword;
    const blankSentence = createBlankSentence(sentence, [item.headword]);
    setBlanks(blankSentence);
    setUserInput(blankSentence.filter((b) => b.isBlank).map(() => ""));
  }, [item]);

  const handleInputChange = useCallback(
    (index: number, value: string) => {
      const newInput = [...userInput];
      newInput[index] = value;
      setUserInput(newInput);
    },
    [userInput]
  );

  const handleSubmit = useCallback(() => {
    const correct = checkAnswer(blanks, userInput, item.headword);
    setIsCorrect(correct);
    setIsSubmitted(true);
    onComplete(correct);
  }, [blanks, userInput, item.headword, onComplete]);

  const handleReset = useCallback(() => {
    setUserInput(blanks.filter((b) => b.isBlank).map(() => ""));
    setIsSubmitted(false);
    setIsCorrect(null);
  }, [blanks]);

  const handlePlayAudio = useCallback(() => {
    speak(item.exampleEn || item.headword);
  }, [speak, item]);

  let blankIndex = 0;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
      {/* 제목 */}
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">빈칸을 채워주세요</h3>
        <button
          onClick={handlePlayAudio}
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          🔊 음성 듣기
        </button>
      </div>

      {/* 번역 힌트 */}
      {item.exampleKo && (
        <div className="text-center text-gray-600 text-sm border-l-4 border-blue-200 pl-4 bg-blue-50 py-2">
          💡 {item.exampleKo}
        </div>
      )}

      {/* 딕테이션 문장 */}
      <div className="text-center space-y-4">
        <div className="text-lg leading-relaxed flex flex-wrap justify-center gap-2">
          {blanks.map((blank, index) => {
            if (blank.isBlank) {
              const inputIndex = blankIndex++;
              const isInputCorrect = isSubmitted && isCorrect !== null;
              const inputValue = userInput[inputIndex] || "";

              return (
                <div key={index} className="relative">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) =>
                      handleInputChange(inputIndex, e.target.value)
                    }
                    disabled={isSubmitted}
                    className={`w-24 px-2 py-1 text-center border-b-2 bg-transparent focus:outline-none ${
                      isSubmitted
                        ? isCorrect
                          ? "border-green-500 text-green-700"
                          : "border-red-500 text-red-700"
                        : "border-gray-300 focus:border-blue-500"
                    }`}
                    placeholder="___"
                  />
                  {isSubmitted && !isCorrect && (
                    <div className="absolute -bottom-6 left-0 right-0 text-xs text-green-600">
                      {blank.word}
                    </div>
                  )}
                </div>
              );
            }
            return (
              <span key={index} className="text-gray-700">
                {blank.word}
              </span>
            );
          })}
        </div>
      </div>

      {/* 결과 표시 */}
      {isSubmitted && (
        <div
          className={`text-center p-4 rounded-lg ${
            isCorrect ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
          }`}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            {isCorrect ? (
              <>
                <Check className="size-5" />
                정답입니다!
              </>
            ) : (
              <>
                <X className="size-5" />
                틀렸습니다
              </>
            )}
          </div>
          {!isCorrect && <p className="text-sm">정답: {item.exampleEn}</p>}
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="flex justify-center gap-3">
        {!isSubmitted ? (
          <>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <RotateCcw className="size-4" />
              다시하기
            </button>
            <button
              onClick={handleSubmit}
              disabled={userInput.some((input) => input.trim() === "")}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              제출
            </button>
          </>
        ) : (
          <button
            onClick={onNext}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            다음 문제
          </button>
        )}
      </div>

      {/* 네비게이션 */}
      <div className="flex justify-between pt-4 border-t">
        <button
          onClick={onPrevious}
          className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          이전
        </button>
        {isSubmitted && (
          <button
            onClick={handleReset}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            다시 풀기
          </button>
        )}
      </div>
    </div>
  );
}
