// src/pages/SentencePage.tsx
import React, { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Volume2,
  CheckCircle,
  RotateCcw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSentenceData } from "@/shared/hooks/usePackData";
import { useCurrentDay, useLearningProgress } from "@/shared/hooks/useAppHooks";
import { useAppStore } from "@/stores/appStore";

const CompletionModal = ({
  isOpen,
  onReview,
  onNext,
  onClose,
}: {
  isOpen: boolean;
  onReview: () => void;
  onNext: () => void;
  onClose: () => void;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          문장 학습 완료! 🎉
        </h2>
        <p className="text-gray-600 mb-8">
          모든 문장을 학습했습니다.
          <br />
          워크북으로 연습해보시겠어요?
        </p>
        <div className="space-y-3">
          <button
            onClick={onNext}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 transition-colors"
          >
            <CheckCircle className="w-5 h-5" />
            워크북 풀기
          </button>
          <button
            onClick={onReview}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
            문장 복습하기
          </button>
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default function SentencePage() {
  const navigate = useNavigate();
  const { sentences, category } = useCurrentDayData();
  const { currentDay } = useCurrentDay();
  const { markModeCompleted } = useAppStore();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // 스와이프 로직
  const minSwipeDistance = 50;

  const handleComplete = () => {
    markModeCompleted(currentDay, "sentence");
    setShowCompletionModal(false);
    navigate("/workbook");
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) goToNext();
    if (isRightSwipe) goToPrevious();
  };

  // 로딩 상태
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">데이터 로드 실패: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  // 데이터 없음
  if (sentences.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Day {currentDay}에 학습할 문장이 없습니다.
          </p>
          <button
            onClick={() => navigate("/app/calendar")}
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            달력으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const currentItem = sentences[currentIndex];
  const progress = ((currentIndex + 1) / sentences.length) * 100;
  const isLastSentence = currentIndex === sentences.length - 1;

  // 타겟 단어 하이라이트 렌더링
  const renderHighlightedSentence = (
    sentence: string,
    targetWords: string[]
  ) => {
    if (!targetWords || targetWords.length === 0) {
      return sentence;
    }

    // 모든 타겟 워드를 하나의 정규식으로 처리
    const regex = new RegExp(`\\b(${targetWords.join("|")})\\b`, "gi");
    const parts = sentence.split(regex);

    return parts.map((part, index) => {
      const isTargetWord = targetWords.some(
        (word) => word.toLowerCase() === part.toLowerCase()
      );

      return (
        <span
          key={index}
          className={
            isTargetWord ? "font-bold text-blue-600 underline decoration-2" : ""
          }
        >
          {part}
        </span>
      );
    });
  };

  const goToNext = () => {
    if (showTranslation) {
      setCompletedSentences((prev) => new Set([...prev, currentIndex]));
    }

    if (currentIndex < sentences.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setShowTranslation(false);
    } else {
      setShowCompletionModal(true);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setShowTranslation(false);
    }
  };

  const handleReview = () => {
    setShowCompletionModal(false);
    setCurrentIndex(0);
    setShowTranslation(false);
    setCompletedSentences(new Set());
  };

  const handleNext = () => {
    markDayCompleted(currentDay);
    setShowCompletionModal(false);
    navigate("/app/workbook");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="w-full max-w-none">
        {/* 헤더 */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-xl font-bold text-gray-900">
                {category} - Sentence Study
              </h1>
              <div className="text-lg font-semibold text-gray-700">
                {currentIndex + 1}/{sentences.length}
              </div>
            </div>

            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-500 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>

            <p className="text-sm text-gray-500 mt-2">
              Real VOCA Basic - Day {currentDay}
            </p>
          </div>
        </div>

        {/* 메인 카드 */}
        <div className="flex items-center justify-center py-8 px-4">
          <div className="w-full max-w-3xl">
            <div
              className="bg-white rounded-3xl shadow-xl p-8 md:p-12 min-h-[400px] md:min-h-[500px] cursor-pointer transition-all duration-200 hover:shadow-2xl active:scale-[0.98] flex items-center justify-center"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              onClick={() => setShowTranslation(!showTranslation)}
            >
              <div className="text-center h-full flex flex-col justify-center">
                {/* 상황 설명 */}
                {currentItem.situation && (
                  <div className="mb-8">
                    <span className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                      {currentItem.situation}
                    </span>
                  </div>
                )}

                {/* 영어 문장 */}
                <p className="text-2xl md:text-3xl font-medium text-gray-800 leading-relaxed mb-8">
                  {renderHighlightedSentence(
                    currentItem.sentence,
                    currentItem.targetWords
                  )}
                </p>

                {/* 한글 번역 */}
                <div
                  className={`transition-all duration-300 ${
                    showTranslation
                      ? "opacity-100 max-h-32"
                      : "opacity-0 max-h-0 overflow-hidden"
                  }`}
                >
                  <div className="border-t border-gray-200 pt-6">
                    <p className="text-xl md:text-2xl text-gray-600 leading-relaxed">
                      {currentItem.translation}
                    </p>
                  </div>
                </div>

                {/* 터치 힌트 */}
                {!showTranslation && (
                  <div className="mt-8">
                    <p className="text-gray-400 text-lg">터치하여 해석 보기</p>
                  </div>
                )}

                {/* 발음 버튼 */}
                {showTranslation && (
                  <div className="mt-8">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // TTS 기능
                      }}
                      className="flex items-center gap-2 px-6 py-3 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors mx-auto"
                    >
                      <Volume2 className="w-5 h-5" />
                      <span className="font-medium">발음 듣기</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 네비게이션 */}
            <div className="flex items-center justify-between mt-8 px-4">
              <button
                onClick={goToPrevious}
                disabled={currentIndex === 0}
                className="flex items-center gap-2 px-6 py-3 text-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors rounded-xl hover:bg-white hover:shadow-md"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">이전</span>
              </button>

              <div className="flex items-center gap-2">
                {sentences.map((_, index) => (
                  <div
                    key={index}
                    className={`w-3 h-3 rounded-full transition-all duration-200 ${
                      index === currentIndex
                        ? "bg-green-500 scale-125"
                        : completedSentences.has(index)
                        ? "bg-blue-400"
                        : "bg-gray-300"
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={goToNext}
                className={`flex items-center gap-2 px-6 py-3 font-medium rounded-xl transition-colors ${
                  isLastSentence && showTranslation
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "text-gray-600 hover:bg-white hover:shadow-md"
                }`}
              >
                <span>{isLastSentence ? "완료" : "다음"}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center mt-6">
              <p className="text-gray-500 text-sm mb-2">
                {currentIndex + 1} / {sentences.length}
              </p>
              <p className="text-gray-400 text-xs">
                좌우 스와이프로 이동 • 카드 터치로 해석 보기
              </p>
            </div>
          </div>
        </div>
      </div>

      <CompletionModal
        isOpen={showCompletionModal}
        onReview={handleReview}
        onNext={handleNext}
        onClose={() => setShowCompletionModal(false)}
      />
    </div>
  );
}
