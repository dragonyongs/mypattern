import React, { useEffect, useCallback } from "react";
import { Volume2, RotateCcw, Check } from "lucide-react";
export interface StudyCardProps {
  // 현재 카드 데이터
  word: string;
  pronunciation?: string;
  meaning?: string;
  usage?: string;
  emoji?: string;

  // 상태
  isMastered: boolean;
  isSpeaking: boolean;
  showMeaning: boolean;

  // 설정 (UI 텍스트 제어용)
  studyMode: "immersive" | "assisted";
  showMeaningEnabled: boolean;

  // 이벤트
  onToggleMeaning: () => void;
  onSpeak: (text: string) => void;
  onMarkAsMastered: () => void;
  onMarkAsNotMastered: () => void;
}

export const StudyCard: React.FC<StudyCardProps> = ({
  word,
  pronunciation,
  meaning,
  usage,
  emoji,
  isMastered,
  isSpeaking,
  showMeaning,
  studyMode,
  showMeaningEnabled,
  onToggleMeaning,
  onSpeak,
  // onMarkAsMastered,
  // onMarkAsNotMastered,
}) => {
  // 🔥 디버깅용 로그 추가
  useEffect(() => {
    console.log("StudyCard settings:", {
      studyMode,
      showMeaningEnabled,
      showMeaning,
    });
  }, [studyMode, showMeaningEnabled, showMeaning]);

  return (
    <div
      className="relative bg-white rounded-2xl shadow-lg p-8 text-center cursor-pointer transition-transform active:scale-95"
      onClick={onToggleMeaning}
    >
      {isMastered && (
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="inline-block bg-green-100 text-green-600  px-3 py-1 rounded-full text-sm font-bold">
            학습 완료
          </div>
        </div>
      )}

      {emoji && <div className="text-6xl mb-4">{emoji}</div>}

      <h2 className="text-3xl font-bold text-gray-800 mb-2">{word}</h2>

      {pronunciation && <p className="text-gray-500 mb-4">[{pronunciation}]</p>}

      <button
        onClick={(e) => {
          e.stopPropagation();
          onSpeak(word);
        }}
        disabled={isSpeaking}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 text-gray-700 rounded-full text-sm font-medium transition-all disabled:opacity-50 mb-6"
      >
        <Volume2 className="w-4 h-4" />
        {isSpeaking ? "재생중..." : "발음 듣기"}
      </button>

      <div className="h-20 pt-6 border-t border-gray-200 flex flex-col justify-center">
        {showMeaningEnabled && showMeaning ? (
          <div className="animate-in fade-in">
            <p className="text-xl font-semibold text-gray-800">{meaning}</p>
            {usage && (
              <p className="text-sm text-gray-500 mt-2 italic">"{usage}"</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400">
            {studyMode === "immersive"
              ? "영어로 의미를 생각해보세요"
              : "탭하여 의미 확인"}
          </p>
        )}
      </div>
    </div>
  );
};

export default StudyCard;
