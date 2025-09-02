// src/pages/VocabularyPage.tsx - 기존 UI 유지, AppStore 연동
import React, { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Volume2,
  CheckCircle,
  RotateCcw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCurrentDayData } from "@/shared/hooks/usePackData";
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
          단어 학습 완료! 🎉
        </h2>
        <p className="text-gray-600 mb-8">
          모든 단어를 학습했습니다.
          <br />
          다음 단계로 진행하시겠어요?
        </p>
        <div className="space-y-3">
          <button
            onClick={onNext}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
            문장 학습하기
          </button>
          <button
            onClick={onReview}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
            단어 복습하기
          </button>
        </div>
      </div>
    </div>
  );
};

export default function VocabularyPage() {
  const navigate = useNavigate();
  const { vocabularies, category } = useCurrentDayData();
  const { currentDay, markModeCompleted } = useAppStore();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  if (vocabularies.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Day {currentDay}에 학습할 단어가 없습니다.
          </p>
          <button
            onClick={() => navigate("/calendar")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            달력으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const currentItem = vocabularies[currentIndex];
  const isLastCard = currentIndex === vocabularies.length - 1;

  const handleNext = () => {
    if (isLastCard) {
      setShowCompletionModal(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
      setShowMeaning(false);
    }
  };

  const handleComplete = () => {
    markModeCompleted(currentDay, "vocab");
    setShowCompletionModal(false);
    navigate("/sentences");
  };

  const handleReview = () => {
    setCurrentIndex(0);
    setShowMeaning(false);
    setShowCompletionModal(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto p-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate("/calendar")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            달력으로
          </button>
          <div className="text-center">
            <h1 className="text-xl font-bold">{category}</h1>
            <p className="text-sm text-gray-500">
              Day {currentDay} - 단어 학습
            </p>
          </div>
          <div className="text-right">
            <span className="text-sm font-medium">
              {currentIndex + 1}/{vocabularies.length}
            </span>
          </div>
        </div>

        {/* 카드 */}
        <div className="flex items-center justify-center">
          <div
            className="bg-white rounded-3xl shadow-xl p-12 max-w-2xl w-full min-h-[500px] cursor-pointer"
            onClick={() => setShowMeaning(!showMeaning)}
          >
            <div className="text-center flex flex-col justify-center h-full">
              <div className="text-8xl mb-8">{currentItem.emoji}</div>
              <h2 className="text-5xl font-bold text-gray-800 mb-6">
                {currentItem.word}
              </h2>
              {currentItem.pronunciation && (
                <p className="text-gray-500 text-lg mb-6">
                  {currentItem.pronunciation}
                </p>
              )}

              {showMeaning ? (
                <div className="border-t pt-6">
                  <p className="text-2xl text-gray-600">
                    {currentItem.meaning}
                  </p>
                </div>
              ) : (
                <p className="text-gray-400 mt-8">터치하여 뜻 보기</p>
              )}
            </div>
          </div>
        </div>

        {/* 네비게이션 */}
        <div className="flex items-center justify-between mt-8">
          <button
            onClick={() => {
              if (currentIndex > 0) {
                setCurrentIndex((prev) => prev - 1);
                setShowMeaning(false);
              }
            }}
            disabled={currentIndex === 0}
            className="flex items-center gap-2 px-6 py-3 text-gray-600 disabled:opacity-50"
          >
            <ArrowLeft className="w-5 h-5" />
            이전
          </button>

          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
          >
            {isLastCard ? "완료" : "다음"}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <CompletionModal
        isOpen={showCompletionModal}
        onReview={handleReview}
        onNext={handleComplete}
        onClose={() => setShowCompletionModal(false)}
      />
    </div>
  );
}
