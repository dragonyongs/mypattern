// src/components/study-modes/SentenceMode.tsx
import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Volume2,
  CheckCircle,
  RotateCcw,
  Eye,
} from "lucide-react";
import { useSwipeGesture } from "@/shared/hooks/useSwipeGesture";
import { useTTS } from "@/shared/hooks/useTTS";
import { useDayProgress } from "@/shared/hooks/useAppHooks";

interface SentenceItem {
  id?: string;
  text?: string;
  sentence?: string; // 호환성
  translation: string;
  targetWords: string[];
  situation?: string;
}

interface SentenceModeProps {
  sentences: SentenceItem[];
  dayNumber: number;
  category: string;
  onComplete?: () => void;
}

interface CompletionModalProps {
  isOpen: boolean;
  totalSentences: number;
  onReview: () => void;
  onNext: () => void;
  onClose: () => void;
}

const CompletionModal: React.FC<CompletionModalProps> = ({
  isOpen,
  totalSentences,
  onReview,
  onNext,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-auto shadow-xl">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>

          <h3 className="text-xl font-bold text-gray-800 mb-2">
            문장 학습 완료!
          </h3>

          <p className="text-gray-600 mb-6">
            총 {totalSentences}개 문장을 학습했습니다.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onReview}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              다시 학습
            </button>

            <button
              onClick={onNext}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              워크북 풀기
            </button>
          </div>

          <button
            onClick={onClose}
            className="mt-3 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            달력으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
};

export const SentenceMode: React.FC<SentenceModeProps> = ({
  sentences,
  dayNumber,
  category,
  onComplete,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showTranslation, setShowTranslation] = useState(false);
  const [readSentences, setReadSentences] = useState<Set<number>>(new Set());
  const [showCompletion, setShowCompletion] = useState(false);

  const { speak, isSpeaking } = useTTS();
  const { markModeCompleted } = useDayProgress(dayNumber);

  const currentItem = useMemo(
    () => sentences[currentIndex],
    [sentences, currentIndex]
  );

  const progress = useMemo(() => {
    return sentences.length > 0
      ? ((currentIndex + 1) / sentences.length) * 100
      : 0;
  }, [currentIndex, sentences.length]);

  const isAllRead = useMemo(() => {
    return readSentences.size === sentences.length && sentences.length > 0;
  }, [readSentences.size, sentences.length]);

  // Target Words 하이라이팅
  const renderHighlightedSentence = useCallback(
    (text: string, targetWords: string[]) => {
      if (!targetWords || targetWords.length === 0) {
        return <span>{text}</span>;
      }

      let highlightedText = text;
      targetWords.forEach((word) => {
        const regex = new RegExp(
          `\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
          "gi"
        );
        highlightedText = highlightedText.replace(
          regex,
          `<mark class="bg-blue-200 text-blue-800 font-semibold px-1 rounded">${word}</mark>`
        );
      });

      return <span dangerouslySetInnerHTML={{ __html: highlightedText }} />;
    },
    []
  );

  // 문장 보기 추적
  const handleSentenceView = useCallback(() => {
    const newRead = new Set(readSentences);
    newRead.add(currentIndex);
    setReadSentences(newRead);
    setShowTranslation(!showTranslation);
  }, [currentIndex, readSentences, showTranslation]);

  // 네비게이션
  const goToNext = useCallback(() => {
    if (currentIndex < sentences.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setShowTranslation(false);
    }
  }, [currentIndex, sentences.length]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setShowTranslation(false);
    }
  }, [currentIndex]);

  // 스와이프 제스처
  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: goToNext,
    onSwipeRight: goToPrev,
  });

  // TTS 재생
  const handleSpeak = useCallback(
    (text: string) => {
      if (text) {
        speak(text, { lang: "en-US", rate: 0.9 });
        const newRead = new Set(readSentences);
        newRead.add(currentIndex);
        setReadSentences(newRead);
      }
    },
    [speak, readSentences, currentIndex]
  );

  // 완료 처리
  const handleComplete = useCallback(() => {
    markModeCompleted(dayNumber, "sentence");
    setShowCompletion(true);
  }, [markModeCompleted, dayNumber]);

  // 완료 조건 체크
  useEffect(() => {
    if (isAllRead && !showCompletion) {
      handleComplete();
    }
  }, [isAllRead, showCompletion, handleComplete]);

  // 모달 핸들러
  const handleReview = useCallback(() => {
    setCurrentIndex(0);
    setShowTranslation(false);
    setReadSentences(new Set());
    setShowCompletion(false);
  }, []);

  const handleNext = useCallback(() => {
    setShowCompletion(false);
    onComplete?.();
  }, [onComplete]);

  const handleClose = useCallback(() => {
    setShowCompletion(false);
  }, []);

  if (!sentences.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            Day {dayNumber}에 학습할 문장이 없습니다
          </h3>
          <p className="text-gray-500">다른 날짜를 선택해주세요</p>
        </div>
      </div>
    );
  }

  if (!currentItem) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  const sentenceText = currentItem.text || currentItem.sentence || "";

  return (
    <>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* 헤더 */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-gray-800 mb-2">
            Day {dayNumber} - {category}
          </h1>
          <p className="text-sm text-gray-600 mb-4">
            문장을 읽고 Target Words를 확인하세요
          </p>

          {/* 진행률 바 */}
          <div className="w-full max-w-md mx-auto bg-gray-200 rounded-full h-2 mb-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">
            {currentIndex + 1} / {sentences.length}
          </p>
        </div>

        {/* 문장 카드 */}
        <div className="flex justify-center mb-8">
          <div
            className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-2xl mx-auto cursor-pointer transition-all duration-200 active:scale-98 hover:shadow-xl"
            onClick={handleSentenceView}
            {...swipeHandlers}
          >
            <div className="text-center">
              {/* 영어 문장 */}
              <div className="mb-6">
                <p className="text-xl md:text-2xl font-medium text-gray-800 leading-relaxed mb-4">
                  {renderHighlightedSentence(
                    sentenceText,
                    currentItem.targetWords
                  )}
                </p>

                {/* 상황 설명 */}
                {currentItem.situation && (
                  <p className="text-sm text-gray-500 italic mb-4 bg-gray-50 px-3 py-2 rounded-lg">
                    상황: {currentItem.situation}
                  </p>
                )}

                {/* TTS 버튼 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSpeak(sentenceText);
                  }}
                  disabled={isSpeaking}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors disabled:opacity-50"
                >
                  {isSpeaking ? (
                    <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                  문장 듣기
                </button>
              </div>

              {/* 한글 번역 (조건부 표시) */}
              <div
                className={`transition-all duration-300 ${
                  showTranslation
                    ? "opacity-100 max-h-32 mb-4"
                    : "opacity-0 max-h-0 overflow-hidden"
                }`}
              >
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-lg text-gray-700 leading-relaxed">
                    {currentItem.translation}
                  </p>
                </div>
              </div>

              {/* 힌트 */}
              {!showTranslation && (
                <div className="mt-6">
                  <div className="flex items-center justify-center gap-2 text-gray-400 mb-2">
                    <Eye className="w-4 h-4" />
                    <span className="text-sm">터치하여 해석 보기</span>
                  </div>
                </div>
              )}

              {/* Target Words 표시 */}
              {currentItem.targetWords &&
                currentItem.targetWords.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-2">Target Words</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {currentItem.targetWords.map((word, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded-full"
                        >
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {/* 학습 완료 표시 */}
              {readSentences.has(currentIndex) && (
                <div className="mt-4 flex items-center justify-center gap-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">학습 완료</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 네비게이션 */}
        <div className="flex items-center justify-center gap-6 mb-6">
          <button
            onClick={goToPrev}
            disabled={currentIndex === 0}
            className="flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-md disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-lg transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>

          {/* 인디케이터 */}
          <div className="flex gap-2 flex-wrap justify-center max-w-xs">
            {sentences.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentIndex(index);
                  setShowTranslation(false);
                }}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentIndex
                    ? "bg-green-500 scale-110"
                    : readSentences.has(index)
                    ? "bg-green-400"
                    : "bg-gray-300"
                }`}
              />
            ))}
          </div>

          <button
            onClick={goToNext}
            disabled={currentIndex === sentences.length - 1}
            className="flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-md disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-lg transition-all"
          >
            <ArrowRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* 스와이프 힌트 */}
        <div className="text-center text-xs text-gray-400 mb-4">
          <p className="hidden sm:block">좌우 스와이프 또는 화살표로 이동</p>
          <p className="sm:hidden">좌우 스와이프로 이동</p>
        </div>

        {/* 학습 완료 버튼 (모든 문장 확인 시) */}
        {isAllRead && (
          <div className="text-center">
            <button
              onClick={handleComplete}
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors"
            >
              <CheckCircle className="w-5 h-5" />
              문장 학습 완료
            </button>
          </div>
        )}
      </div>

      {/* 완료 모달 */}
      <CompletionModal
        isOpen={showCompletion}
        totalSentences={sentences.length}
        onReview={handleReview}
        onNext={handleNext}
        onClose={handleClose}
      />
    </>
  );
};
