// src/components/study-modes/SentenceMode.tsx
import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import { Volume2, MessageSquare } from "lucide-react";

import { useSwipeGesture } from "@/shared/hooks/useSwipeGesture";
import { useTTS } from "@/shared/hooks/useTTS";
import { useDayProgress } from "@/shared/hooks/useAppHooks";
import { StudySidebar } from "@/shared/components/StudySidebar";
import { useStudyProgressStore } from "@/stores/studyProgressStore";
import StudyCompleteButton from "@/shared/components/StudyCompleteButton";
import ActionButtons from "@/shared/components/ActionButtons";
import StudyPagination from "@/shared/components/StudyPagination";
import StudyCard from "@/shared/components/StudyCard";

interface SentenceItem {
  id: string;
  text: string;
  translation?: string;
  targetWords?: string[];
  situation?: string;
  usage?: string;
}

export type StudyModeType = "immersive" | "assisted";

export interface StudySettings {
  studyMode?: StudyModeType;
  showMeaningEnabled?: boolean;
  autoProgressEnabled?: boolean;
  autoPlayOnSelect?: boolean;
}

interface SentenceModeProps {
  items: SentenceItem[];
  initialItemIndex?: number;
  dayNumber: number;
  category?: string;
  packId: string;
  settings?: StudySettings;
  getItemProgress?: (itemId: string) => {
    isCompleted: boolean;
    lastStudied?: string | null;
  };
  onItemCompleted?: (itemId: string, completed: boolean) => void;
  onComplete?: () => void;
  onSettingsChange?: (newSettings: StudySettings) => void;
}

export const SentenceMode: React.FC<SentenceModeProps> = ({
  items,
  dayNumber,
  category = "문장 학습",
  packId,
  settings = {},
  getItemProgress,
  onItemCompleted,
  onComplete,
  initialItemIndex = 0,
  onSettingsChange,
}) => {
  // 상태
  const [currentIndex, setCurrentIndex] = useState<number>(initialItemIndex);
  const [showTranslation, setShowTranslation] = useState<boolean>(false);
  const [studiedCards, setStudiedCards] = useState<Set<number>>(new Set());
  const [masteredCards, setMasteredCards] = useState<Set<number>>(new Set());

  // 로컬 설정
  const [localSettings, setLocalSettings] = useState<StudySettings>(() => ({
    studyMode: "immersive",
    showMeaningEnabled: false,
    autoProgressEnabled: true,
    autoPlayOnSelect: false,
    ...settings,
  }));

  // refs for safety
  const autoProgressTimeoutRef = useRef<number | null>(null);
  const currentIndexRef = useRef<number>(initialItemIndex);
  const masteredRef = useRef<Set<number>>(new Set());
  const studiedRef = useRef<Set<number>>(new Set());

  // hooks
  const { speak, isSpeaking } = useTTS();
  const { markModeCompleted } = useDayProgress(packId, dayNumber);
  const { setItemCompleted, getItemProgress: storeGetItemProgress } =
    useStudyProgressStore();

  // settings → localSettings 동기화 (+ 정합 보장)
  useEffect(() => {
    setLocalSettings((prev) => {
      const next = { ...prev, ...settings };
      if (typeof next.studyMode !== "undefined") {
        next.showMeaningEnabled = next.studyMode === "assisted";
      }
      return next;
    });
  }, [settings]);

  // sync refs when state changes
  useEffect(() => {
    masteredRef.current = masteredCards;
  }, [masteredCards]);

  useEffect(() => {
    studiedRef.current = studiedCards;
  }, [studiedCards]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoProgressTimeoutRef.current) {
        window.clearTimeout(autoProgressTimeoutRef.current);
        autoProgressTimeoutRef.current = null;
      }
    };
  }, []);

  // navigateTo: 숫자 인덱스만 허용, 모든 이동은 이걸 통해
  const navigateTo = useCallback(
    (index: number) => {
      if (autoProgressTimeoutRef.current) {
        window.clearTimeout(autoProgressTimeoutRef.current);
        autoProgressTimeoutRef.current = null;
      }
      const safeIndex = Math.max(0, Math.min(index, items.length - 1));
      currentIndexRef.current = safeIndex;
      setCurrentIndex(safeIndex);
      setShowTranslation(false);
    },
    [items.length]
  );

  // 초기 인덱스 동기화
  useEffect(() => {
    navigateTo(initialItemIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialItemIndex]);

  // 현재 아이템
  const currentItem = useMemo(() => items[currentIndex], [items, currentIndex]);

  // 진행률
  const progress = useMemo(
    () => (items.length ? (masteredCards.size / items.length) * 100 : 0),
    [masteredCards.size, items.length]
  );

  const isAllMastered = useMemo(
    () => items.length > 0 && masteredCards.size === items.length,
    [masteredCards.size, items.length]
  );

  // 안전한 진행 상태 확인
  const safeGetItemProgress = useCallback(
    (itemId: string) => {
      if (getItemProgress) return getItemProgress(itemId);
      if (storeGetItemProgress)
        return storeGetItemProgress(packId, dayNumber, itemId);
      return { isCompleted: false };
    },
    [getItemProgress, storeGetItemProgress, packId, dayNumber]
  );

  // 완료 상태 복원
  useEffect(() => {
    const mastered = new Set<number>();
    const studied = new Set<number>();
    items.forEach((it, idx) => {
      const pr = safeGetItemProgress(it.id);
      if (pr?.isCompleted) {
        mastered.add(idx);
        studied.add(idx);
      }
    });
    setMasteredCards(mastered);
    setStudiedCards(studied);
  }, [items, safeGetItemProgress]);

  // 발음 재생
  const handleSpeak = useCallback(
    (text: string) => {
      if (!text) return;
      speak(text, { lang: "en-US", rate: 0.8 });
    },
    [speak]
  );

  // 설정 변경 핸들러들
  const handleModeChange = useCallback(
    (mode: StudyModeType) => {
      setLocalSettings((prev) => {
        const next = {
          ...prev,
          studyMode: mode,
          showMeaningEnabled: mode === "assisted",
        };
        onSettingsChange?.(next);
        return next;
      });
    },
    [onSettingsChange]
  );

  const handleAutoProgressChange = useCallback(
    (enabled: boolean) => {
      setLocalSettings((prev) => {
        const next = { ...prev, autoProgressEnabled: enabled };
        onSettingsChange?.(next);
        return next;
      });
    },
    [onSettingsChange]
  );

  const handleAutoPlayChange = useCallback(
    (enabled: boolean) => {
      setLocalSettings((prev) => {
        const next = { ...prev, autoPlayOnSelect: enabled };
        onSettingsChange?.(next);
        return next;
      });
    },
    [onSettingsChange]
  );

  // 번역 토글
  const handleToggleTranslation = useCallback(() => {
    if (!localSettings.showMeaningEnabled) return;

    setShowTranslation((prev) => {
      const next = !prev;
      if (!prev) {
        setStudiedCards((s) => {
          const newSet = new Set(s);
          newSet.add(currentIndexRef.current);
          studiedRef.current = newSet;
          return newSet;
        });
      }
      return next;
    });
  }, [localSettings.showMeaningEnabled]);

  // goToNext/goToPrev/goToIndex
  const goToNext = useCallback(() => {
    const nextIndex = Math.min(currentIndexRef.current + 1, items.length - 1);

    if (autoProgressTimeoutRef.current) {
      window.clearTimeout(autoProgressTimeoutRef.current);
      autoProgressTimeoutRef.current = null;
    }

    navigateTo(nextIndex);

    if (localSettings.autoPlayOnSelect && items[nextIndex]?.text) {
      setTimeout(() => handleSpeak(items[nextIndex].text), 80);
    }
  }, [items, localSettings.autoPlayOnSelect, navigateTo, handleSpeak]);

  const goToPrev = useCallback(() => {
    if (autoProgressTimeoutRef.current) {
      window.clearTimeout(autoProgressTimeoutRef.current);
      autoProgressTimeoutRef.current = null;
    }

    const nextIndex = Math.max(currentIndexRef.current - 1, 0);
    navigateTo(nextIndex);

    if (localSettings.autoPlayOnSelect && items[nextIndex]?.text) {
      setTimeout(() => handleSpeak(items[nextIndex].text), 80);
    }
  }, [items, localSettings.autoPlayOnSelect, navigateTo, handleSpeak]);

  const goToIndex = useCallback(
    (index: number) => {
      const safeIndex = Math.max(0, Math.min(index, items.length - 1));
      navigateTo(safeIndex);
      if (localSettings.autoPlayOnSelect && items[safeIndex]?.text) {
        setTimeout(() => handleSpeak(items[safeIndex].text), 80);
      }
    },
    [items, localSettings.autoPlayOnSelect, navigateTo, handleSpeak]
  );

  // 완료/미완료 핸들러
  const handleMarkAsMastered = useCallback(() => {
    const idx = currentIndexRef.current;
    const currentSentence = items[idx];
    if (!currentSentence?.id) return;

    // immediate local sets & refs
    const newMastered = new Set(masteredRef.current);
    newMastered.add(idx);
    setMasteredCards(newMastered);
    masteredRef.current = newMastered;

    const newStudied = new Set(studiedRef.current);
    newStudied.add(idx);
    setStudiedCards(newStudied);
    studiedRef.current = newStudied;

    // 저장
    setItemCompleted(packId, dayNumber, currentSentence.id, true);
    onItemCompleted?.(currentSentence.id, true);

    // 다음 미완료 인덱스 결정
    if (localSettings.autoProgressEnabled) {
      if (autoProgressTimeoutRef.current) {
        window.clearTimeout(autoProgressTimeoutRef.current);
        autoProgressTimeoutRef.current = null;
      }

      let nextIdx = -1;
      for (let i = idx + 1; i < items.length; i++) {
        if (!newMastered.has(i)) {
          nextIdx = i;
          break;
        }
      }
      if (nextIdx === -1) nextIdx = Math.min(idx + 1, items.length - 1);

      autoProgressTimeoutRef.current = window.setTimeout(() => {
        navigateTo(nextIdx);

        if (localSettings.autoPlayOnSelect && items[nextIdx]?.text) {
          setTimeout(() => handleSpeak(items[nextIdx].text), 80);
        }
        autoProgressTimeoutRef.current = null;
      }, 300) as unknown as number;
    }
  }, [
    items,
    packId,
    dayNumber,
    onItemCompleted,
    localSettings.autoProgressEnabled,
    localSettings.autoPlayOnSelect,
    navigateTo,
    handleSpeak,
    setItemCompleted,
  ]);

  const handleMarkAsNotMastered = useCallback(() => {
    const idx = currentIndexRef.current;
    const currentSentence = items[idx];
    if (!currentSentence?.id) return;

    setMasteredCards((prev) => {
      const newSet = new Set(prev);
      newSet.delete(idx);
      masteredRef.current = newSet;
      return newSet;
    });

    setItemCompleted(packId, dayNumber, currentSentence.id, false);
    onItemCompleted?.(currentSentence.id, false);
  }, [items, packId, dayNumber, onItemCompleted, setItemCompleted]);

  const handleComplete = useCallback(() => {
    markModeCompleted(packId, "sentence");
    onComplete?.();
  }, [markModeCompleted, packId, onComplete]);

  // 문장 하이라이트
  const renderHighlightedSentence = useCallback(
    (text: string, targetWords: string[] = []) => {
      if (!targetWords.length) return text;

      let highlightedText = text;
      targetWords.forEach((word) => {
        const regex = new RegExp(`\\b(${word})\\b`, "gi");
        highlightedText = highlightedText.replace(
          regex,
          '<mark class="bg-indigo-50 text-indigo-800 px-1 py-0.5 rounded">$1</mark>'
        );
      });

      return <span dangerouslySetInnerHTML={{ __html: highlightedText }} />;
    },
    []
  );

  // swipe handlers
  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: goToNext,
    onSwipeRight: goToPrev,
  });

  // 로딩 처리
  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <MessageSquare className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-700">
          학습할 문장이 없습니다
        </h2>
        <p className="text-gray-500 mt-2">
          Day {dayNumber}의 문장을 확인해주세요
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[calc(100vh-217px)] lg:min-h-[calc(100vh-130px)] bg-gray-50 font-sans pb-20 lg:pb-0">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Main */}
        <main
          className="flex-1 flex flex-col justify-center items-center p-4 overflow-y-auto"
          {...swipeHandlers}
        >
          <div className="w-full max-w-xl">
            {/* Sentence Card */}
            <StudyCard
              mode="sentence"
              sentence={currentItem.text}
              meaning={currentItem.translation}
              usage={currentItem.usage}
              targetWords={currentItem.targetWords}
              isMastered={masteredCards.has(currentIndex)}
              isSpeaking={isSpeaking}
              showMeaning={showTranslation}
              studyMode={localSettings.studyMode}
              showMeaningEnabled={localSettings.showMeaningEnabled}
              onToggleMeaning={handleToggleTranslation}
              onSpeak={handleSpeak}
              onMarkAsMastered={handleMarkAsMastered}
              onMarkAsNotMastered={handleMarkAsNotMastered}
            />
            {/* <div
              className="relative bg-white rounded-2xl shadow-lg p-8 text-center cursor-pointer transition-transform active:scale-95"
              onClick={handleToggleTranslation}
            >
              {masteredCards.has(currentIndex) && (
                <div className="absolute top-4 right-4 bg-green-100 text-green-600 px-2.5 py-1 rounded-full text-xs font-bold">
                  학습 완료
                </div>
              )}

              {currentItem.situation && (
                <div className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-full inline-block mb-4">
                  [{currentItem.situation}]
                </div>
              )}

              <h2 className="text-2xl font-bold text-gray-400 leading-relaxed mb-6">
                {renderHighlightedSentence(
                  currentItem.text,
                  currentItem.targetWords
                )}
              </h2>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSpeak(currentItem.text);
                }}
                disabled={isSpeaking}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 text-gray-700 rounded-full text-sm font-medium transition-all disabled:opacity-50 mb-6"
              >
                <Volume2 className="w-4 h-4" />
                {isSpeaking ? "재생중..." : "발음 듣기"}
              </button>

              <div className="h-20 pt-6 border-t border-gray-200 flex flex-col justify-center">
                {localSettings.showMeaningEnabled && showTranslation ? (
                  <div className="animate-in fade-in">
                    <p className="text-xl font-semibold text-gray-800">
                      {currentItem.translation}
                    </p>
                    {currentItem.usage && (
                      <p className="text-sm text-gray-500 mt-2 italic">
                        "{currentItem.usage}"
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">
                    {localSettings.studyMode === "immersive"
                      ? "영어로 의미를 생각해보세요"
                      : "탭하여 번역 보기"}
                  </p>
                )}
              </div>
            </div> */}

            {/* StudyPagination */}
            <StudyPagination
              currentIndex={currentIndex}
              totalItems={items.length}
              completed={masteredCards} // Set<number>
              secondary={studiedCards} // Set<number>
              // correct={correctAnswers} // Set<number>
              // answered={answeredQuestions} // Set<number>
              onPrev={goToPrev}
              onNext={goToNext}
              onIndexChange={goToIndex}
            />

            {/* Action */}
            {/* <div className="mt-6">
              <ActionButtons
                isAnswered={masteredCards.has(currentIndex)}
                canCheck={true}
                onCheck={handleMarkAsMastered}
                onRetry={handleMarkAsNotMastered}
                checkText="학습 완료"
                retryText="다시 학습"
              />
            </div> */}

            {/* Complete */}
            <StudyCompleteButton
              isAllMastered={isAllMastered}
              onComplete={handleComplete}
            />

            {/* Navigation */}
            {/* <div className="mt-6">
              <StudyNavigation
                currentIndex={currentIndex}
                total={items.length}
                onPrev={goToPrev}
                onNext={goToNext}
              />
            </div> */}
          </div>
        </main>
      </div>

      {/* Sidebar */}
      <StudySidebar
        category={category}
        dayNumber={dayNumber}
        progress={progress}
        items={items}
        currentIndex={currentIndex}
        studiedCards={studiedCards}
        masteredCards={masteredCards}
        onSelectIndex={goToIndex}
        settings={localSettings}
        handleModeChange={handleModeChange}
        handleAutoProgressChange={handleAutoProgressChange}
        handleAutoPlayChange={handleAutoPlayChange}
      />
    </div>
  );
};

SentenceMode.displayName = "SentenceMode";
export default SentenceMode;
