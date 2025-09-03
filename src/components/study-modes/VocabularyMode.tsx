// src/components/study-modes/VocabularyMode.tsx
import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Volume2,
  CheckCircle,
  RotateCcw,
  Eye,
  EyeOff,
  Settings,
  Brain,
  Lightbulb,
} from "lucide-react";
import { useSwipeGesture } from "@/shared/hooks/useSwipeGesture";
import { useTTS } from "@/shared/hooks/useTTS";
// import { useAppStore } from "@/stores/appStore";
import { useDayProgress } from "@/shared/hooks/useAppHooks";
import { useStudySettings } from "@/shared/hooks/useAppHooks";

interface VocabItem {
  id?: string;
  word: string;
  meaning: string;
  emoji: string;
  pronunciation?: string;
  usage?: string;
}

interface VocabularyModeProps {
  vocabularies: VocabItem[];
  dayNumber: number;
  category: string;
  onComplete?: () => void;
}

// interface StudySettings {
//   showMeaningEnabled: boolean;
//   autoProgressEnabled: boolean;
//   studyMode: "immersive" | "assisted"; // immersive = 의미 없이, assisted = 의미 도움
// }

export const VocabularyMode: React.FC<VocabularyModeProps> = ({
  vocabularies,
  dayNumber,
  category,
  packId,
  onComplete,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);
  const [studiedCards, setStudiedCards] = useState<Set<number>>(new Set()); // 의미를 본 카드
  const [masteredCards, setMasteredCards] = useState<Set<number>>(new Set()); // 학습 완료한 카드
  const [showCompletion, setShowCompletion] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { settings, updateSetting } = useStudySettings(packId);

  const { speak, isSpeaking } = useTTS();
  const { markModeCompleted } = useDayProgress(packId, dayNumber);

  const currentItem = useMemo(
    () => vocabularies[currentIndex],
    [vocabularies, currentIndex]
  );

  const progress = useMemo(() => {
    return vocabularies.length > 0
      ? (masteredCards.size / vocabularies.length) * 100
      : 0;
  }, [masteredCards.size, vocabularies.length]);

  const isAllMastered = useMemo(() => {
    return (
      masteredCards.size === vocabularies.length && vocabularies.length > 0
    );
  }, [masteredCards.size, vocabularies.length]);

  // 🎯 의미 보기 (학습 완료와 별개)
  const handleToggleMeaning = useCallback(() => {
    if (!settings.showMeaningEnabled) return;

    setShowMeaning((prev) => !prev);

    // 의미를 본 카드로 기록 (완료 아님!)
    if (!showMeaning) {
      const newStudied = new Set(studiedCards);
      newStudied.add(currentIndex);
      setStudiedCards(newStudied);
    }
  }, [settings.showMeaningEnabled, showMeaning, studiedCards, currentIndex]);

  const handleModeChange = useCallback(
    (mode: "immersive" | "assisted") => {
      console.log("🎯 학습 모드 변경:", mode); // 디버깅
      updateSetting("studyMode", mode);
      updateSetting("showMeaningEnabled", mode === "assisted");
    },
    [updateSetting]
  );

  const handleAutoProgressChange = useCallback(
    (enabled: boolean) => {
      console.log("🎯 자동 진행 설정 변경:", enabled); // 디버깅
      updateSetting("autoProgressEnabled", enabled);
    },
    [updateSetting]
  );

  const handleShowMeaningChange = useCallback(
    (enabled: boolean) => {
      console.log("🎯 의미 표시 설정 변경:", enabled); // 디버깅
      updateSetting("showMeaningEnabled", enabled);
    },
    [updateSetting]
  );

  // 🎯 실시간 설정값 사용
  const showMeaningEnabled = settings.showMeaningEnabled;
  const autoProgressEnabled = settings.autoProgressEnabled;
  const studyMode = settings.studyMode;

  // 🎯 명시적 학습 완료 표시
  const handleMarkAsMastered = useCallback(() => {
    const newMastered = new Set(masteredCards);
    newMastered.add(currentIndex);
    setMasteredCards(newMastered);

    // 자동 진행이 활성화된 경우 다음 카드로
    if (
      settings.autoProgressEnabled &&
      currentIndex < vocabularies.length - 1
    ) {
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
        setShowMeaning(false);
      }, 800);
    }
  }, [
    masteredCards,
    currentIndex,
    settings.autoProgressEnabled,
    vocabularies.length,
  ]);

  // 🎯 학습 미완료로 표시
  const handleMarkAsNotMastered = useCallback(() => {
    const newMastered = new Set(masteredCards);
    newMastered.delete(currentIndex);
    setMasteredCards(newMastered);
  }, [masteredCards, currentIndex]);

  // 네비게이션
  const goToNext = useCallback(() => {
    if (currentIndex < vocabularies.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setShowMeaning(false);
    }
  }, [currentIndex, vocabularies.length]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setShowMeaning(false);
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
        speak(text, { lang: "en-US", rate: 0.8 });
      }
    },
    [speak]
  );

  // 완료 처리
  const handleComplete = useCallback(() => {
    markModeCompleted(dayNumber, "vocab");
    onComplete?.();
  }, [markModeCompleted, dayNumber, onComplete]);

  // 완료 조건 체크
  useEffect(() => {
    if (isAllMastered && !showCompletion) {
      handleComplete();
    }
  }, [isAllMastered, showCompletion, handleComplete]);

  if (!vocabularies.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            Day {dayNumber}에 학습할 단어가 없습니다
          </h3>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* 헤더 & 설정 */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-center flex-1">
            <h1 className="text-xl font-bold text-gray-800 mb-2">
              Day {dayNumber} - {category}
            </h1>
            <p className="text-sm text-gray-600">
              {settings.studyMode === "immersive"
                ? "🧠 영어적 사고로 단어를 익혀보세요"
                : "💡 필요시 의미를 확인하며 학습하세요"}
            </p>
          </div>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* 설정 패널 */}
        {showSettings && (
          <div className="bg-white rounded-xl p-4 mb-6 shadow-lg border">
            <h3 className="font-semibold text-gray-800 mb-3">학습 설정</h3>

            <div className="space-y-3">
              {/* 학습 모드 */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  학습 모드
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleModeChange("immersive")}
                    className={`flex-1 flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                      settings.studyMode === "immersive"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Brain className="w-4 h-4" />
                    <div className="text-left">
                      <div className="font-medium text-sm">몰입 모드</div>
                      <div className="text-xs opacity-70">
                        의미 없이 영어로만
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleModeChange("assisted")}
                    className={`flex-1 flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                      settings.studyMode === "assisted"
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Lightbulb className="w-4 h-4" />
                    <div className="text-left">
                      <div className="font-medium text-sm">도움 모드</div>
                      <div className="text-xs opacity-70">의미 확인 가능</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* 자동 진행 */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  학습 완료 시 자동 진행
                </span>
                <button
                  onClick={() => handleAutoProgressChange(!autoProgressEnabled)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.autoProgressEnabled ? "bg-blue-500" : "bg-gray-300"
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      settings.autoProgressEnabled
                        ? "translate-x-6"
                        : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              {/* 의미 표시 토글 (도움 모드일 때만) */}
              {studyMode === "assisted" && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    한글 의미 표시 허용
                  </span>
                  <button
                    onClick={() => handleShowMeaningChange(!showMeaningEnabled)} // 🔥 이벤트 핸들러 연결
                    className={`w-12 h-6 rounded-full transition-colors ${
                      showMeaningEnabled ? "bg-green-500" : "bg-gray-300"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        showMeaningEnabled ? "translate-x-6" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 진행률 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              학습 진행률
            </span>
            <span className="text-sm text-gray-500">
              {masteredCards.size} / {vocabularies.length} 완료
            </span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="text-center text-xs text-gray-500">
            현재: {currentIndex + 1} / {vocabularies.length}
          </div>
        </div>

        {/* 단어 카드 */}
        <div className="flex justify-center mb-8">
          <div
            className={`bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm mx-auto transition-all duration-200 ${
              settings.showMeaningEnabled
                ? "cursor-pointer hover:shadow-xl active:scale-95"
                : ""
            }`}
            onClick={
              showMeaningEnabled
                ? () => setShowMeaning(!showMeaning)
                : undefined
            }
            {...(settings.showMeaningEnabled ? swipeHandlers : {})}
          >
            <div className="text-center">
              {/* 이모지 */}
              <div className="text-7xl mb-6 select-none">
                {currentItem.emoji}
              </div>

              {/* 단어 */}
              <div className="relative mb-4">
                <h2 className="text-3xl font-bold text-gray-800 mb-2">
                  {currentItem.word}
                </h2>

                {/* 발음 기호 */}
                {currentItem.pronunciation && (
                  <p className="text-sm text-gray-500 mb-3">
                    {currentItem.pronunciation}
                  </p>
                )}

                {/* TTS 버튼 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSpeak(currentItem.word);
                  }}
                  disabled={isSpeaking}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition-colors disabled:opacity-50"
                >
                  {isSpeaking ? (
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">발음 듣기</span>
                </button>
              </div>

              {/* 의미 (조건부 표시) */}
              {settings.showMeaningEnabled && (
                <div
                  className={`transition-all duration-300 ${
                    showMeaning
                      ? "opacity-100 max-h-32 mb-4"
                      : "opacity-0 max-h-0 overflow-hidden"
                  }`}
                >
                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-lg text-gray-700 font-medium mb-2">
                      {currentItem.meaning}
                    </p>
                    {currentItem.usage && (
                      <p className="text-sm text-gray-500 italic">
                        {currentItem.usage}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* 상태 표시 */}
              <div className="mt-6 space-y-2">
                {/* 학습 완료 상태 */}
                {masteredCards.has(currentIndex) ? (
                  <div className="flex items-center justify-center gap-2 text-green-600 mb-3">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">학습 완료</span>
                  </div>
                ) : studiedCards.has(currentIndex) ? (
                  <div className="flex items-center justify-center gap-2 text-blue-600 mb-3">
                    <Eye className="w-5 h-5" />
                    <span className="font-medium">의미 확인됨</span>
                  </div>
                ) : null}

                {/* 의미 표시 (설정에 따라) */}
                {showMeaningEnabled && showMeaning && (
                  <div className="transition-all duration-300 opacity-100 max-h-32 mb-4">
                    <div className="border-t border-gray-200 pt-4">
                      <p className="text-lg text-gray-700 font-medium mb-2">
                        {currentItem.meaning}
                      </p>
                    </div>
                  </div>
                )}

                {/* 힌트 */}
                {!showMeaning && showMeaningEnabled && (
                  <p className="text-sm text-gray-400 mt-6">
                    터치하여 의미 보기
                  </p>
                )}

                {studyMode === "immersive" && (
                  <p className="text-sm text-gray-400 mt-6">
                    🧠 영어로 의미를 생각해보세요
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 학습 액션 버튼 */}
        <div className="flex justify-center gap-3 mb-6">
          {masteredCards.has(currentIndex) ? (
            <button
              onClick={handleMarkAsNotMastered}
              className="flex items-center gap-2 px-6 py-3 bg-gray-500 text-white rounded-xl font-medium hover:bg-gray-600 transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
              다시 학습하기
            </button>
          ) : (
            <button
              onClick={handleMarkAsMastered}
              className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors"
            >
              <CheckCircle className="w-5 h-5" />
              학습 완료
            </button>
          )}
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
          <div className="flex gap-2">
            {vocabularies.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentIndex(index);
                  setShowMeaning(false);
                }}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentIndex
                    ? "bg-blue-500 scale-110"
                    : masteredCards.has(index)
                    ? "bg-green-500"
                    : studiedCards.has(index)
                    ? "bg-blue-300"
                    : "bg-gray-300"
                }`}
              />
            ))}
          </div>

          <button
            onClick={goToNext}
            disabled={currentIndex === vocabularies.length - 1}
            className="flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-md disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-lg transition-all"
          >
            <ArrowRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* 전체 완료 버튼 */}
        {isAllMastered && (
          <div className="text-center">
            <button
              onClick={handleComplete}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl font-medium hover:from-green-600 hover:to-blue-600 transition-all transform hover:scale-105"
            >
              <CheckCircle className="w-6 h-6" />
              단어 학습 완료하기
            </button>
          </div>
        )}

        {/* 도움말 */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">학습 팁</p>
              <ul className="space-y-1 text-xs opacity-90">
                <li>• 먼저 영어로 의미를 생각해보세요</li>
                <li>• 확실히 알 때만 "학습 완료"를 눌러주세요</li>
                <li>• 발음을 들으며 소리내어 읽어보세요</li>
                <li>
                  •{" "}
                  {settings.studyMode === "immersive"
                    ? "몰입 모드에서는 영어적 사고를 기르세요"
                    : "필요시 의미를 확인하며 학습하세요"}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 완료 모달은 기존과 동일 */}
    </>
  );
};
