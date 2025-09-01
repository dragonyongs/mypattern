// src/features/flashcard/ui/FlashCard.tsx
import React, { useState, useCallback, useEffect, memo } from "react";
import { ChevronLeft, ChevronRight, Eye, EyeOff, Volume2 } from "lucide-react";
import { VocaItem } from "@/entities";
import { useSwipeGesture, useTTS } from "@/shared/hooks";

export interface FlashCardProps {
  item: VocaItem;
  showTranslation: boolean;
  onToggleTranslation: () => void;
  onNext: () => void;
  onPrevious: () => void;
  className?: string;
  showControls?: boolean;
  autoPlayAudio?: boolean;
}

export const FlashCard = memo<FlashCardProps>(
  ({
    item,
    showTranslation,
    onToggleTranslation,
    onNext,
    onPrevious,
    className = "",
    showControls = true,
    autoPlayAudio = false,
  }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const { speak, isSpeaking } = useTTS();

    // 스와이프 제스처 핸들러
    const swipeHandlers = useSwipeGesture({
      onSwipeLeft: onNext,
      onSwipeRight: onPrevious,
    });

    // 키보드 이벤트 핸들러
    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent) => {
        switch (event.key) {
          case "ArrowLeft":
            event.preventDefault();
            onPrevious();
            break;
          case "ArrowRight":
            event.preventDefault();
            onNext();
            break;
          case " ":
          case "Enter":
            event.preventDefault();
            onToggleTranslation();
            break;
          case "p":
          case "P":
            event.preventDefault();
            handlePlayAudio();
            break;
        }
      },
      [onNext, onPrevious, onToggleTranslation]
    );

    // 오디오 재생 핸들러
    const handlePlayAudio = useCallback(() => {
      if (item.exampleEn || item.headword) {
        speak(item.exampleEn || item.headword);
      }
    }, [speak, item.exampleEn, item.headword]);

    // 자동 오디오 재생
    useEffect(() => {
      if (autoPlayAudio && (item.exampleEn || item.headword)) {
        const timer = setTimeout(() => {
          handlePlayAudio();
        }, 500);
        return () => clearTimeout(timer);
      }
    }, [item, autoPlayAudio, handlePlayAudio]);

    // 카드 플립 애니메이션
    const handleCardClick = useCallback(() => {
      setIsFlipped((prev) => !prev);
      setTimeout(() => {
        onToggleTranslation();
        setIsFlipped(false);
      }, 150);
    }, [onToggleTranslation]);

    return (
      <div
        className={`flashcard-container ${className}`}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="application"
        aria-label="플래시카드"
        {...swipeHandlers}
      >
        <div className="relative max-w-lg mx-auto">
          {/* 메인 카드 */}
          <div
            className={`
            flashcard-content min-h-96 bg-white rounded-2xl shadow-xl 
            border border-gray-200 p-8 cursor-pointer transition-all duration-300
            hover:shadow-2xl hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300
            ${isFlipped ? "transform rotateY-180" : ""}
          `}
            onClick={handleCardClick}
            tabIndex={0}
            role="button"
            aria-label={showTranslation ? "번역 숨기기" : "번역 보기"}
          >
            {/* 앞면 - 영어 단어 */}
            <div className="text-center h-full flex flex-col justify-center">
              <div className="mb-6">
                <h2 className="text-4xl font-bold text-gray-800 mb-4">
                  {item.headword}
                </h2>

                {item.pos && (
                  <span className="inline-block px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full mb-4">
                    {item.pos}
                  </span>
                )}

                {/* 예문 (영어) */}
                {item.exampleEn && !showTranslation && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <p className="text-gray-700 italic">"{item.exampleEn}"</p>
                  </div>
                )}
              </div>

              {/* 번역 표시 */}
              {showTranslation && (
                <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-lg animate-fadeIn">
                  <h3 className="text-2xl font-bold text-green-800 mb-3">
                    {item.definition}
                  </h3>

                  {item.exampleKo && (
                    <p className="text-green-700 italic">"{item.exampleKo}"</p>
                  )}

                  {item.exampleEn && (
                    <p className="text-gray-600 text-sm mt-2">
                      "{item.exampleEn}"
                    </p>
                  )}
                </div>
              )}

              {/* 힌트 텍스트 */}
              {!showTranslation && (
                <div className="mt-6 text-gray-400 text-sm">
                  <p>카드를 클릭하거나 스페이스바를 눌러 번역 보기</p>
                </div>
              )}
            </div>
          </div>

          {/* 오디오 재생 버튼 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePlayAudio();
            }}
            className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
            aria-label="발음 듣기"
            title="발음 듣기 (P)"
          >
            <Volume2
              size={20}
              className={`${
                isSpeaking ? "text-blue-500 animate-pulse" : "text-gray-600"
              }`}
            />
          </button>

          {/* 번역 토글 버튼 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleTranslation();
            }}
            className="absolute bottom-4 right-4 p-3 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300"
            aria-label={showTranslation ? "번역 숨기기" : "번역 보기"}
            title={
              showTranslation
                ? "번역 숨기기 (스페이스)"
                : "번역 보기 (스페이스)"
            }
          >
            {showTranslation ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>

          {/* 네비게이션 버튼 */}
          {showControls && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPrevious();
                }}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 p-3 bg-white rounded-full shadow-md hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
                aria-label="이전 카드"
                title="이전 카드 (←)"
              >
                <ChevronLeft size={24} className="text-gray-600" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNext();
                }}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 p-3 bg-white rounded-full shadow-md hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
                aria-label="다음 카드"
                title="다음 카드 (→)"
              >
                <ChevronRight size={24} className="text-gray-600" />
              </button>
            </>
          )}
        </div>

        {/* 키보드 단축키 안내 */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>키보드: ← → (이동) | 스페이스/Enter (번역) | P (발음)</p>
        </div>
      </div>
    );
  }
);

FlashCard.displayName = "FlashCard";
