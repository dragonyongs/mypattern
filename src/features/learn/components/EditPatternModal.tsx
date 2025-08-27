// src/features/learn/components/EditPatternModal.tsx
import React, { useState, useEffect } from "react";
import { Save, X } from "lucide-react";
import { useLearningStore } from "@/stores/learningStore";

interface Props {
  initialKorean: string;
  initialEnglish: string;
  patternId?: string; // 오늘의 패턴 수정
  userPatternId?: string; // 사용자 라이브러리 수정
  onClose: () => void;
}

export const EditPatternModal: React.FC<Props> = ({
  initialKorean,
  initialEnglish,
  patternId,
  userPatternId,
  onClose,
}) => {
  const { updateUserPattern, addUserPattern } = useLearningStore();
  const [ko, setKo] = useState(initialKorean);
  const [en, setEn] = useState(initialEnglish);

  // 오늘의 핵심 패턴 직접 수정은 권장하지 않으므로, 사용자 라이브러리에 복제-저장하는 흐름을 권장
  const handleSave = () => {
    if (userPatternId) {
      updateUserPattern(userPatternId, { korean: ko, english: en });
      onClose();
      return;
    }
    // 최초 편집 → 사용자 라이브러리로 복제 저장
    const id = addUserPattern({ korean: ko, english: en, category: "edited" });
    console.log("오늘의 패턴을 사용자 라이브러리로 복제 저장:", id);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">패턴 수정</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-sm text-gray-600">한국어</label>
            <textarea
              value={ko}
              onChange={(e) => setKo(e.target.value)}
              className="w-full border rounded p-2 mt-1"
              rows={2}
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">영어</label>
            <textarea
              value={en}
              onChange={(e) => setEn(e.target.value)}
              className="w-full border rounded p-2 mt-1"
              rows={2}
            />
          </div>
        </div>
        <div className="p-4 border-t flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
          >
            <Save className="h-4 w-4" /> 저장
          </button>
        </div>
      </div>
    </div>
  );
};
