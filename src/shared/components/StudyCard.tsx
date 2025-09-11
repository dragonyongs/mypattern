import React, { useEffect, useCallback } from "react";
import { Volume2, CheckCircle2, Check } from "lucide-react";
import { SpeakButton } from "./SpeakButton";

export interface StudyCardProps {
  // 범용
  word?: string;
  sentence?: string;

  // SentenceMode
  targetWords?: string[];

  // 공통
  pronunciation?: string;
  meaning?: string;
  usage?: string;
  emoji?: string;

  // 모드 구분
  mode: "vocabulary" | "sentence";

  // 상태
  isMastered: boolean;
  showMeaning: boolean;
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
  sentence,
  pronunciation,
  meaning,
  usage,
  emoji,
  targetWords,
  mode,
  isMastered,
  showMeaning,
  studyMode,
  showMeaningEnabled,
  onToggleMeaning,
  onSpeak,
}) => {
  // 표시할 주요 텍스트 결정
  const mainText = mode === "vocabulary" ? word : sentence;
  const speakText = mode === "vocabulary" ? word : sentence;

  // 문장에서 타겟 단어 하이라이트 함수
  const renderHighlightedSentence = (text: string, targets: string[] = []) => {
    if (mode !== "sentence" || !targets.length) return text;

    let highlightedText = text;
    targets.forEach((target) => {
      const regex = new RegExp(`\\b${target}\\b`, "gi");
      highlightedText = highlightedText.replace(
        regex,
        `<span class="font-bold underline text-blue-600">${target}</span>`
      );
    });

    return <span dangerouslySetInnerHTML={{ __html: highlightedText }} />;
  };

  return (
    <div
      className="relative bg-white rounded-2xl shadow-lg p-8 text-center cursor-pointer transition-transform active:scale-95"
      onClick={onToggleMeaning}
    >
      {isMastered && (
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium mb-4">
          <CheckCircle2 className="w-4 h-4" />
          학습 완료
        </div>
      )}

      <div className="text-center">
        {/* 이모지 (단어 모드에만) */}
        {mode === "vocabulary" && emoji && (
          <div className="text-6xl mb-6">{emoji}</div>
        )}

        {/* 메인 텍스트 */}
        <h2
          className={`font-bold text-gray-800 mb-4 ${
            mode === "vocabulary" ? "text-3xl" : "text-xl leading-relaxed"
          }`}
        >
          {mode === "vocabulary"
            ? mainText
            : renderHighlightedSentence(sentence!, targetWords)}
        </h2>

        {/* 발음 (단어 모드에만) */}
        {mode === "vocabulary" && pronunciation && (
          <p className="text-gray-500 mb-4">[{pronunciation}]</p>
        )}

        {/* 발음 듣기 버튼 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSpeak(speakText!);
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm font-medium transition-all mb-6"
        >
          <Volume2 className="w-4 h-4" />
          발음 듣기
        </button>

        {/* 의미/번역 영역 */}
        {showMeaningEnabled && showMeaning ? (
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-lg text-gray-600">{meaning}</p>
            {usage && (
              <p className="text-sm text-gray-500 mt-2 italic">"{usage}"</p>
            )}
          </div>
        ) : (
          <div className="text-gray-400 text-sm py-4">
            {studyMode === "immersive"
              ? mode === "vocabulary"
                ? "영어로 의미를 생각해보세요"
                : "영어로 의미를 생각해보세요"
              : "탭하여 의미 확인"}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyCard;
