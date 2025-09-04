// src/components/study-modes/VocabularyMode.tsx

import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Volume2,
  CheckCircle,
  RotateCcw,
  Brain,
  Lightbulb,
  Eye,
  EyeOff,
  Zap,
  Target,
  X,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";
import { useSwipeGesture } from "@/shared/hooks/useSwipeGesture";
import { useTTS } from "@/shared/hooks/useTTS";
import { useDayProgress, useStudySettings } from "@/shared/hooks/useAppHooks";
import { StudySettingsPanel } from "@/shared/components/StudySettingsPanel"; // 수정된 패널 임포트
import { useStudyProgressStore } from "@/stores/studyProgressStore";

interface VocabItem {
  id?: string;
  word: string;
  meaning: string;
  emoji: string;
  pronunciation?: string;
  usage?: string;
}

interface VocabularyModeProps {
  items: VocabItem[];
  dayNumber: number;
  category: string;
  packId: string;
  onComplete?: () => void;
}

export const VocabularyMode: React.FC<VocabularyModeProps> = ({
  items,
  dayNumber,
  category,
  packId,
  onComplete,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);
  const [studiedCards, setStudiedCards] = useState<Set<number>>(new Set());
  const [masteredCards, setMasteredCards] = useState<Set<number>>(new Set());

  const { settings, updateSetting } = useStudySettings(packId);
  const { speak, isSpeaking } = useTTS();
  const { markModeCompleted } = useDayProgress(packId, dayNumber);
  const { setItemCompleted, getItemProgress } = useStudyProgressStore();

  const currentItem = useMemo(() => items[currentIndex], [items, currentIndex]);
  const progress = useMemo(
    () => (items.length ? (masteredCards.size / items.length) * 100 : 0),
    [masteredCards.size, items.length]
  );
  const isAllMastered = useMemo(
    () => items.length > 0 && masteredCards.size === items.length,
    [masteredCards.size, items.length]
  );

  useEffect(() => {
    const masteredSet = new Set<number>();
    const studiedSet = new Set<number>();
    items.forEach((vocab, index) => {
      if (vocab.id) {
        const progress = getItemProgress(packId, dayNumber, vocab.id);
        if (progress?.completed) {
          masteredSet.add(index);
          studiedSet.add(index);
        }
      }
    });
    setMasteredCards(masteredSet);
    setStudiedCards(studiedSet);
    console.debug("[VocabularyMode] 완료 상태 복원:", {
      packId,
      dayNumber,
      masteredCount: masteredSet.size,
      studiedCount: studiedSet.size,
    });
  }, [items, getItemProgress, packId, dayNumber]);

  const handleModeChange = useCallback(
    (mode: "immersive" | "assisted") => {
      updateSetting("studyMode", mode);
      updateSetting("showMeaningEnabled", mode === "assisted");
    },
    [updateSetting]
  );

  const handleAutoProgressChange = useCallback(
    (enabled: boolean) => {
      updateSetting("autoProgressEnabled", enabled);
    },
    [updateSetting]
  );

  const handleSpeak = useCallback(
    (text: string) => {
      if (text) speak(text, { lang: "en-US", rate: 0.8 });
    },
    [speak]
  );

  const handleToggleMeaning = useCallback(() => {
    if (!settings.showMeaningEnabled) return;
    setShowMeaning((prev) => !prev);
    if (!showMeaning) {
      const s = new Set(studiedCards);
      s.add(currentIndex);
      setStudiedCards(s);
    }
  }, [settings.showMeaningEnabled, showMeaning, studiedCards, currentIndex]);

  const handleMarkAsMastered = useCallback(() => {
    const currentVocab = items[currentIndex];
    if (!currentVocab?.id) {
      console.warn("[VocabularyMode] 단어 ID가 없습니다:", currentVocab);
      return;
    }
    const m = new Set(masteredCards);
    m.add(currentIndex);
    setMasteredCards(m);
    const s = new Set(studiedCards);
    s.add(currentIndex);
    setStudiedCards(s);
    setItemCompleted(packId, dayNumber, currentVocab.id, true);
    console.debug("[VocabularyMode] 단어 완료 처리:", {
      packId,
      dayNumber,
      vocabId: currentVocab.id,
      word: currentVocab.word,
    });
    if (settings.autoProgressEnabled && currentIndex < items.length - 1) {
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
        setShowMeaning(false);
      }, 300);
    }
  }, [
    items,
    currentIndex,
    masteredCards,
    studiedCards,
    setItemCompleted,
    packId,
    dayNumber,
    settings.autoProgressEnabled,
  ]);

  const handleMarkAsNotMastered = useCallback(() => {
    const currentVocab = items[currentIndex];
    if (!currentVocab?.id) return;
    const m = new Set(masteredCards);
    m.delete(currentIndex);
    setMasteredCards(m);
    setItemCompleted(packId, dayNumber, currentVocab.id, false);
    console.debug("[VocabularyMode] 단어 완료 취소:", {
      packId,
      dayNumber,
      vocabId: currentVocab.id,
      word: currentVocab.word,
    });
  }, [items, currentIndex, masteredCards, setItemCompleted, packId, dayNumber]);

  const goToNext = useCallback(() => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setShowMeaning(false);
    }
  }, [currentIndex, items.length]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setShowMeaning(false);
    }
  }, [currentIndex]);

  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: goToNext,
    onSwipeRight: goToPrev,
  });

  const handleComplete = useCallback(() => {
    markModeCompleted(packId, "vocab");
    onComplete?.();
  }, [markModeCompleted, onComplete]);

  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <Target className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-700">
          학습할 단어가 없습니다
        </h2>
        <p className="text-gray-500 mt-2">
          Day {dayNumber}의 단어를 확인해주세요
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[calc(100vh-129px)] bg-gray-50 font-sans">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200 bg-white">
          <button className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h1 className="font-bold text-gray-800">{category}</h1>
            <p className="text-xs text-gray-500">Day {dayNumber}</p>
          </div>
          <div className="w-8"></div>
        </header>

        {/* Mobile Progress Bar */}
        <div className="lg:hidden p-4 bg-white">
          <div className="flex justify-between items-center text-xs text-gray-500 mb-1.5">
            <span className="font-medium">진행률</span>
            <span className="font-semibold">
              {masteredCards.size}/{items.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Main Content Area */}
        <main
          className="flex-1 flex flex-col justify-center items-center p-4 overflow-y-auto"
          {...swipeHandlers}
        >
          <div className="w-full max-w-xl">
            <div className="flex items-center justify-center gap-1.5 mb-4">
              {items.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setShowMeaning(false);
                  }}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    idx === currentIndex
                      ? "w-8 bg-indigo-600"
                      : masteredCards.has(idx)
                      ? "w-1.5 bg-indigo-600"
                      : "w-1.5 bg-gray-300 hover:bg-gray-400"
                  }`}
                />
              ))}
            </div>

            <div
              className="relative bg-white rounded-2xl shadow-lg p-8 text-center cursor-pointer transition-transform active:scale-95"
              onClick={handleToggleMeaning}
            >
              {masteredCards.has(currentIndex) && (
                <div className="absolute top-4 right-4 bg-indigo-100 text-indigo-600 px-2.5 py-1 rounded-full text-xs font-bold">
                  학습 완료
                </div>
              )}
              <div className="text-6xl mb-4">{currentItem.emoji}</div>
              <h2 className="text-3xl font-bold text-gray-800">
                {currentItem.word}
              </h2>
              {currentItem.pronunciation && (
                <p className="text-gray-500 mt-1">
                  [{currentItem.pronunciation}]
                </p>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSpeak(currentItem.word);
                }}
                disabled={isSpeaking}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 text-gray-700 rounded-full text-sm font-medium transition-all disabled:opacity-50 mt-4"
              >
                <Volume2 className="w-4 h-4" />
                {isSpeaking ? "재생중..." : "발음 듣기"}
              </button>

              <div className="h-20 mt-6 pt-6 border-t border-gray-200 flex flex-col justify-center">
                {settings.showMeaningEnabled && showMeaning ? (
                  <div className="animate-in fade-in">
                    <p className="text-xl font-semibold text-gray-800">
                      {currentItem.meaning}
                    </p>
                    {currentItem.usage && (
                      <p className="text-sm text-gray-500 mt-2 italic">
                        "{currentItem.usage}"
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">
                    {settings.studyMode === "immersive"
                      ? "영어로 의미를 생각해보세요"
                      : "탭하여 의미 확인"}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={goToPrev}
                disabled={currentIndex === 0}
                className="p-3 bg-white border border-gray-200 rounded-xl disabled:opacity-30"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex-1 text-center text-sm font-medium text-gray-500">
                {currentIndex + 1} / {items.length}
              </div>
              <button
                onClick={goToNext}
                disabled={currentIndex === items.length - 1}
                className="p-3 bg-white border border-gray-200 rounded-xl disabled:opacity-30"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4">
              {masteredCards.has(currentIndex) ? (
                <button
                  onClick={handleMarkAsNotMastered}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gray-200 text-gray-700 rounded-xl font-medium transition-all hover:bg-gray-300"
                >
                  <RotateCcw className="w-4 h-4" /> 다시 학습
                </button>
              ) : (
                <button
                  onClick={handleMarkAsMastered}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 text-white rounded-xl font-medium transition-all hover:bg-indigo-700"
                >
                  <Check className="w-4 h-4" /> 학습 완료
                </button>
              )}
            </div>

            {isAllMastered && (
              <button
                onClick={handleComplete}
                className="w-full mt-4 py-3 px-4 bg-green-500 text-white rounded-xl font-bold transition-all hover:bg-green-600"
              >
                🎉 모든 학습 완료!
              </button>
            )}
          </div>
        </main>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-80 bg-white shadow-md">
        <div className="p-6 h-full flex flex-col space-y-6">
          <div>
            <h3 className="text-lg font-bold text-gray-800">{category}</h3>
            <p className="text-sm text-gray-500">Day {dayNumber}</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-medium text-gray-700">학습 진행률</h4>
              <span className="text-sm font-bold text-indigo-600">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-right text-gray-500">
              {masteredCards.size}/{items.length} 완료
            </p>
          </div>

          <div className="space-y-3 flex-1">
            <h4 className="text-sm font-medium text-gray-700">학습 카드</h4>
            <div className="grid grid-cols-7 gap-2">
              {items.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setShowMeaning(false);
                  }}
                  className={`aspect-square rounded-lg text-xs font-semibold transition-all ${
                    idx === currentIndex
                      ? "bg-indigo-600 text-white shadow-md scale-110"
                      : masteredCards.has(idx)
                      ? "bg-indigo-100 text-indigo-600 hover:bg-indigo-200"
                      : studiedCards.has(idx)
                      ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-gray-200">
            <StudySettingsPanel
              settings={settings}
              handleModeChange={handleModeChange}
              handleAutoProgressChange={handleAutoProgressChange}
            />
          </div>
        </div>
      </aside>
    </div>
  );
};

export default VocabularyMode;
