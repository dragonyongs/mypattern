// src/features/learn/components/EnhancedVocabMode.tsx
import React, { useState, useCallback, useEffect } from "react";
import { Palette, Image } from "lucide-react";
import DrawingCanvas from "@/features/drawing/components/DrawingCanvas";
import { useDrawingStore } from "@/features/drawing/stores/drawingStore";
import { useAuthStore } from "@/stores/authStore";

interface EnhancedVocabModeProps {
  content: VocabItem[];
  packId: string;
  currentIndex: number;
}

const EnhancedVocabMode: React.FC<EnhancedVocabModeProps> = ({
  content,
  packId,
  currentIndex,
}) => {
  const { user } = useAuthStore();
  const { getDrawing, loadUserDrawings } = useDrawingStore();
  const [showDrawing, setShowDrawing] = useState(false);

  const currentItem = content[currentIndex];
  const existingDrawing = getDrawing(packId, currentItem?.id || "");

  // 학습팩 변경시 그림 데이터 로드
  useEffect(() => {
    if (user && packId) {
      loadUserDrawings(user.id, packId);
    }
  }, [user, packId, loadUserDrawings]);

  const handleDrawingSave = useCallback((saved: boolean) => {
    if (saved) {
      // 저장 성공시 드로잉 모드 닫기
      setShowDrawing(false);
    }
  }, []);

  if (!currentItem) return null;

  return (
    <div className="space-y-6">
      {/* 기존 단어 카드 */}
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
        {/* 이모지 또는 사용자 그림 표시 */}
        <div className="text-6xl mb-6">
          {existingDrawing ? (
            <div
              dangerouslySetInnerHTML={{ __html: existingDrawing.svg_data }}
              className="w-24 h-24 mx-auto border rounded bg-gray-50 p-2"
              title="내가 그린 그림"
            />
          ) : (
            currentItem.emoji
          )}
        </div>

        <h2 className="text-3xl font-bold text-gray-800 mb-4">
          {currentItem.word}
        </h2>

        <p className="text-lg text-gray-600">{currentItem.meaning}</p>

        {/* 그리기/그림보기 버튼 */}
        <div className="flex gap-2 justify-center mt-6">
          <button
            onClick={() => setShowDrawing(!showDrawing)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              existingDrawing
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "bg-purple-100 text-purple-700 hover:bg-purple-200"
            }`}
          >
            {existingDrawing ? (
              <Image className="w-4 h-4" />
            ) : (
              <Palette className="w-4 h-4" />
            )}
            {existingDrawing ? "그림 수정하기" : "그림으로 암기하기"}
          </button>
        </div>
      </div>

      {/* 그림 그리기 영역 */}
      {showDrawing && (
        <DrawingCanvas
          packId={packId}
          itemId={currentItem.id}
          itemType="vocab"
          itemWord={currentItem.word}
          onSave={handleDrawingSave}
        />
      )}
    </div>
  );
};

export default React.memo(EnhancedVocabMode);
