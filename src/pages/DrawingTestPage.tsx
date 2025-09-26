// src/pages/DrawingTestPage.tsx
import React, { useState } from "react";
import { ArrowLeft, TestTube } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DrawingErrorBoundary from "@/features/drawing/components/DrawingErrorBoundary";
import DrawingCanvas from "@/features/drawing/components/DrawingCanvas";
import { useUser, useIsAuthenticated } from "@/shared/hooks/useAppHooks";

const DrawingTestPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useUser();
  const isAuthenticated = useIsAuthenticated();
  const [savedCount, setSavedCount] = useState(0);

  const [currentItemIndex, setCurrentItemIndex] = useState(0);

  // 테스트용 샘플 데이터
  const sampleItems = [
    {
      id: "test-vocab-1",
      word: "apple",
      meaning: "사과",
      type: "vocab" as const,
    },
    {
      id: "test-vocab-2",
      word: "house",
      meaning: "집",
      type: "vocab" as const,
    },
    {
      id: "test-sentence-1",
      word: "I love you",
      meaning: "나는 당신을 사랑합니다",
      type: "sentence" as const,
    },
  ];

  const currentItem = sampleItems[currentItemIndex];

  // 인증되지 않은 경우 처리
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 text-center shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            그림 그리기 테스트
          </h2>
          <p className="text-gray-600 mb-6">
            그림 그리기 기능을 테스트하려면 로그인이 필요합니다.
          </p>
          <button
            onClick={() => navigate("/")}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600"
          >
            로그인하러 가기
          </button>
        </div>
      </div>
    );
  }

  const handleSave = (saved: boolean) => {
    if (saved) {
      setSavedCount((prev) => prev + 1);
    }
  };

  const nextItem = () => {
    if (currentItemIndex < sampleItems.length - 1) {
      setCurrentItemIndex((prev) => prev + 1);
    }
  };

  const prevItem = () => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex((prev) => prev - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pb-20">
      {/* 헤더 */}
      <div className="bg-white shadow-sm p-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-5 h-5" />
            뒤로
          </button>

          <div className="flex items-center gap-2">
            <TestTube className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-800">Drawing 테스트</h1>
          </div>

          <div className="text-sm text-gray-600">저장됨: {savedCount}개</div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* 현재 아이템 정보 */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {currentItem.word}
            </h2>
            <p className="text-lg text-gray-600 mb-4">{currentItem.meaning}</p>
            <div className="flex justify-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  currentItem.type === "vocab"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-green-100 text-green-700"
                }`}
              >
                {currentItem.type === "vocab" ? "단어" : "문장"}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                {currentItemIndex + 1} / {sampleItems.length}
              </span>
            </div>
          </div>
        </div>

        {/* Drawing 컴포넌트 */}
        <DrawingErrorBoundary>
          <DrawingCanvas
            packId="test-pack"
            itemId={currentItem.id}
            itemType={currentItem.type}
            itemWord={currentItem.word}
            onSave={handleSave}
          />
        </DrawingErrorBoundary>

        {/* 네비게이션 */}
        <div className="flex justify-between">
          <button
            onClick={prevItem}
            disabled={currentItemIndex === 0}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            이전
          </button>

          <button
            onClick={nextItem}
            disabled={currentItemIndex === sampleItems.length - 1}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            다음
          </button>
        </div>
      </div>
    </div>
  );
};

export default DrawingTestPage;
