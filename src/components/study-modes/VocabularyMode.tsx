// src/components/study-modes/VocabularyMode.tsx
import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import {
  ArrowLeft,
  Volume2,
  Target,
  ChevronLeft,
  ChevronRight,
  Check,
  RotateCcw,
} from "lucide-react";

import { useSwipeGesture } from "@/shared/hooks/useSwipeGesture";
import { useTTS } from "@/shared/hooks/useTTS";
import { useDayProgress } from "@/shared/hooks/useAppHooks";
import { useStudyProgressStore } from "@/stores/studyProgressStore";
import { StudySidebar } from "@/shared/components/StudySidebar";

import StudyCard from "@/shared/components/StudyCard";
import StudyNavigation from "@/shared/components/StudyNavigation";
import StudyCompleteButton from "@/shared/components/StudyCompleteButton";
import ActionButtons from "@/shared/components/ActionButtons";
import ProgressDots from "@/shared/components/ProgressDots";

interface VocabularyItem {
  id: string;
  word: string;
  pronunciation?: string;
  meaning: string;
  usage?: string;
  emoji?: string;
}

export type StudyModeType = "immersive" | "assisted";

export interface StudySettings {
  studyMode?: StudyModeType;
  showMeaningEnabled?: boolean;
  autoProgressEnabled?: boolean;
  autoPlayOnSelect?: boolean;
}

interface VocabularyModeProps {
  items: VocabularyItem[];
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
  /**
   * settings 변경을 상위로 전달
   * (예: 사용자 설정 저장, 상위 상태 동기화 등에 사용)
   */
  onSettingsChange?: (newSettings: StudySettings) => void;
}

export const VocabularyMode: React.FC<VocabularyModeProps> = ({
  items,
  dayNumber,
  category = "단어 학습",
  packId,
  settings = {},
  getItemProgress,
  onItemCompleted,
  onComplete,
  initialItemIndex = 0,
  onSettingsChange,
  isSettingOpen,
}) => {
  // 상태
  const [currentIndex, setCurrentIndex] = useState<number>(initialItemIndex);
  const [showMeaning, setShowMeaning] = useState<boolean>(false);
  const [studiedCards, setStudiedCards] = useState<Set<number>>(new Set());
  const [masteredCards, setMasteredCards] = useState<Set<number>>(new Set());

  // 로컬 설정 상태 (이걸 바꿀 때 상위로 통지)
  const [localSettings, setLocalSettings] = useState<StudySettings>(() => ({
    studyMode: "immersive",
    showMeaningEnabled: false,
    autoProgressEnabled: true,
    autoPlayOnSelect: false,
    isSettingOpen: false,
    ...settings,
  }));

  const autoProgressTimeoutRef = useRef<number | null>(null);
  const currentIndexRef = useRef<number>(initialItemIndex);

  const masteredRef = useRef<Set<number>>(new Set());
  const studiedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    masteredRef.current = masteredCards;
  }, [masteredCards]);

  useEffect(() => {
    studiedRef.current = studiedCards;
  }, [studiedCards]);

  useEffect(() => {
    return () => {
      if (autoProgressTimeoutRef.current) {
        window.clearTimeout(autoProgressTimeoutRef.current);
        autoProgressTimeoutRef.current = null;
      }
    };
  }, []);

  const navigateTo = useCallback(
    (index: number) => {
      if (autoProgressTimeoutRef.current) {
        window.clearTimeout(autoProgressTimeoutRef.current);
        autoProgressTimeoutRef.current = null;
      }

      const safeIndex = Math.max(0, Math.min(index, items.length - 1));
      currentIndexRef.current = safeIndex;
      setCurrentIndex(safeIndex);
      setShowMeaning(false);
    },
    [items.length]
  );

  useEffect(() => {
    return () => {
      if (autoProgressTimeoutRef.current) {
        window.clearTimeout(autoProgressTimeoutRef.current);
        autoProgressTimeoutRef.current = null;
      }
    };
  }, []);

  // 부모로부터 settings prop이 바뀌면 동기화
  useEffect(() => {
    setLocalSettings((prev) => ({ ...prev, ...settings }));
  }, [settings]);

  // 훅들
  const { speak, isSpeaking } = useTTS();
  const { markModeCompleted } = useDayProgress(packId, dayNumber);
  const { setItemCompleted, getItemProgress: storeGetItemProgress } =
    useStudyProgressStore();

  // 초기 인덱스 동기화
  useEffect(() => {
    navigateTo(initialItemIndex);
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

  // 안전한 진행 상태 확인 (prop 또는 store)
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
    const masteredSet = new Set<number>();
    const studiedSet = new Set<number>();
    items.forEach((vocab, index) => {
      if (vocab.id) {
        const progress = safeGetItemProgress(vocab.id);
        if (progress?.isCompleted) {
          masteredSet.add(index);
          studiedSet.add(index);
        }
      }
    });
    setMasteredCards(masteredSet);
    setStudiedCards(studiedSet);
  }, [items, safeGetItemProgress]);

  // 발음 재생
  const handleSpeak = useCallback(
    (text: string) => {
      if (!text) return;
      speak(text, { lang: "en-US", rate: 0.8 });
    },
    [speak]
  );

  // 설정 변경 핸들러들 (로컬 상태 업데이트 + 상위 콜백)
  const handleModeChange = useCallback(
    (mode: StudyModeType) => {
      // 🔥 즉시 로컬 상태 업데이트
      setLocalSettings((prev) => ({
        ...prev,
        studyMode: mode,
        showMeaningEnabled: mode === "assisted", // 🔥 자동 연동
      }));

      // 🔥 상위 컴포넌트 업데이트는 다음 틱에서 실행
      setTimeout(() => {
        onSettingsChange?.({
          studyMode: mode,
          showMeaningEnabled: mode === "assisted",
        });
      }, 0);
    },
    [onSettingsChange]
  );

  const handleAutoProgressChange = useCallback(
    (enabled: boolean) => {
      setLocalSettings((prev) => ({
        ...prev,
        autoProgressEnabled: enabled,
      }));

      setTimeout(() => {
        onSettingsChange?.({ autoProgressEnabled: enabled });
      }, 0);
    },
    [onSettingsChange]
  );

  const handleAutoPlayChange = useCallback(
    (enabled: boolean) => {
      setLocalSettings((prev) => ({
        ...prev,
        autoPlayOnSelect: enabled,
      }));

      setTimeout(() => {
        onSettingsChange?.({ autoPlayOnSelect: enabled });
      }, 0);
    },
    [onSettingsChange]
  );

  // 🔥 설정 동기화 useEffect 수정
  useEffect(() => {
    setLocalSettings((prev) => {
      const newSettings = {
        ...prev,
        ...settings,
        // studyMode에 따른 showMeaningEnabled 강제 동기화
        showMeaningEnabled: settings.studyMode === "assisted",
      };
      return newSettings;
    });
  }, [settings]);

  // 의미 토글 (showMeaningEnabled에 따라 동작)
  const handleToggleMeaning = useCallback(() => {
    // 몰입 모드이거나 showMeaningEnabled가 false면 아무것도 하지 않음
    if (
      localSettings.studyMode === "immersive" ||
      !localSettings.showMeaningEnabled
    ) {
      console.log(
        "🚫 Toggle blocked - immersive mode or showMeaningEnabled=false"
      );
      return;
    }

    setShowMeaning((prev) => {
      const next = !prev;
      if (!prev) {
        setStudiedCards((s) => {
          const newSet = new Set(s);
          newSet.add(currentIndex);
          return newSet;
        });
      }
      return next;
    });
  }, [localSettings.studyMode, localSettings.showMeaningEnabled, currentIndex]);

  // 완료/미완료 핸들러
  const handleMarkAsMastered = useCallback(() => {
    const idx = currentIndexRef.current;
    const currentVocab = items[idx];
    if (!currentVocab?.id) return;

    // 1) 새 Set을 만들어 즉시 반영하고 ref에 업데이트
    const newMastered = new Set(masteredRef.current);
    newMastered.add(idx);
    setMasteredCards(newMastered);
    masteredRef.current = newMastered;

    const newStudied = new Set(studiedRef.current);
    newStudied.add(idx);
    setStudiedCards(newStudied);
    studiedRef.current = newStudied;

    // 2) 저장
    setItemCompleted(packId, dayNumber, currentVocab.id, true);
    onItemCompleted?.(currentVocab.id, true);

    // 3) 다음 미완료 인덱스 결정 (newMastered 기준)
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

        if (localSettings.autoPlayOnSelect && items[nextIdx]?.word) {
          setTimeout(
            () => speak(items[nextIdx].word, { lang: "en-US", rate: 0.8 }),
            80
          );
        }

        autoProgressTimeoutRef.current = null;
      }, 300);
    }
  }, [
    items,
    setItemCompleted,
    packId,
    dayNumber,
    onItemCompleted,
    localSettings.autoProgressEnabled,
    localSettings.autoPlayOnSelect,
    navigateTo,
    speak,
  ]);

  const handleMarkAsNotMastered = useCallback(() => {
    const currentVocab = items[currentIndex];
    if (!currentVocab?.id) return;

    setMasteredCards((prev) => {
      const newSet = new Set(prev);
      newSet.delete(currentIndex);
      return newSet;
    });

    setItemCompleted(packId, dayNumber, currentVocab.id, false);
    onItemCompleted?.(currentVocab.id, false);
  }, [
    items,
    currentIndex,
    setItemCompleted,
    packId,
    dayNumber,
    onItemCompleted,
  ]);

  // 내비게이션 (함수형 업데이트)
  const goToNext = useCallback(() => {
    const nextIndex = Math.min(currentIndexRef.current + 1, items.length - 1);

    // cancel pending auto timeout
    if (autoProgressTimeoutRef.current) {
      window.clearTimeout(autoProgressTimeoutRef.current);
      autoProgressTimeoutRef.current = null;
    }

    navigateTo(nextIndex);

    if (localSettings.autoPlayOnSelect && items[nextIndex]?.word) {
      setTimeout(
        () => speak(items[nextIndex].word, { lang: "en-US", rate: 0.8 }),
        80
      );
    }
  }, [items, localSettings.autoPlayOnSelect, navigateTo, speak]);

  const goToPrev = useCallback(() => {
    if (autoProgressTimeoutRef.current) {
      window.clearTimeout(autoProgressTimeoutRef.current);
      autoProgressTimeoutRef.current = null;
    }

    const nextIndex = Math.max(currentIndexRef.current - 1, 0);
    navigateTo(nextIndex);
    if (localSettings.autoPlayOnSelect && items[nextIndex]?.word) {
      setTimeout(
        () => speak(items[nextIndex].word, { lang: "en-US", rate: 0.8 }),
        80
      );
    }
  }, [items, localSettings.autoPlayOnSelect, navigateTo, speak]);

  const goToIndex = useCallback(
    (index: number) => {
      const safeIndex = Math.max(0, Math.min(index, items.length - 1));
      console.log(`👆 Manual select: ${currentIndex} → ${safeIndex}`);
      navigateTo(safeIndex);
      setShowMeaning(false);
      if (localSettings.autoPlayOnSelect && items[safeIndex]?.word) {
        setTimeout(
          () => speak(items[safeIndex].word, { lang: "en-US", rate: 0.8 }),
          80
        );
      }
    },
    [items, currentIndex, localSettings.autoPlayOnSelect, speak]
  );

  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: goToNext,
    onSwipeRight: goToPrev,
  });

  const handleComplete = useCallback(() => {
    markModeCompleted(packId, "vocab");
    onComplete?.();
  }, [markModeCompleted, packId, onComplete]);

  // 로딩 처리
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
    <div className="flex h-full min-h-[calc(100vh-217px)] lg:min-h-[calc(100vh-152px)] bg-gray-50 font-sans pb-20 lg:pb-0">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Main Content Area */}
        <main
          className="flex-1 flex flex-col justify-center items-center p-4 overflow-y-auto"
          {...swipeHandlers}
        >
          <div className="w-full max-w-xl">
            {/* Word Card (분리된 컴포넌트 사용) */}
            <StudyCard
              word={currentItem.word}
              pronunciation={currentItem.pronunciation}
              meaning={currentItem.meaning}
              usage={currentItem.usage}
              emoji={currentItem.emoji}
              isMastered={masteredCards.has(currentIndex)}
              isSpeaking={isSpeaking}
              showMeaning={showMeaning}
              studyMode={localSettings.studyMode} // 🔥 로컬 설정 사용
              showMeaningEnabled={localSettings.showMeaningEnabled} // 🔥 로컬 설정 사용
              onToggleMeaning={handleToggleMeaning}
              onSpeak={handleSpeak}
              // onMarkAsMastered={handleMarkAsMastered}
              // onMarkAsNotMastered={handleMarkAsNotMastered}
              isAllMastered={isAllMastered}
              handleComplete={handleComplete}
            />
            {/* Progress Dots */}
            {/* <div className="flex items-center justify-center gap-1.5 mt-6 mb-4">
              {items.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => goToIndex(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    idx === currentIndex
                      ? "w-8 bg-indigo-600"
                      : masteredCards.has(idx)
                      ? "w-1.5 bg-indigo-600"
                      : "w-1.5 bg-gray-300 hover:bg-gray-400"
                  }`}
                />
              ))}
            </div> */}
            <ProgressDots
              total={items.length}
              currentIndex={currentIndex}
              completed={masteredCards} // 완료(숙달)된 카드
              // 필요시 studied 등 보조 상태가 있으면 secondary로 전달
              onIndexChange={goToIndex}
            />

            {/* Action */}
            <div className="mt-6">
              <ActionButtons
                isAnswered={masteredCards.has(currentIndex)}
                canCheck={true} // 단어 모드에서는 항상 가능
                onCheck={handleMarkAsMastered}
                onRetry={handleMarkAsNotMastered}
                checkText="학습 완료"
                retryText="다시 학습"
              />
            </div>

            {/* Complete Button */}
            <StudyCompleteButton
              isAllMastered={isAllMastered}
              onComplete={handleComplete}
            />

            {/* Navigation */}
            <div className="mt-6">
              <StudyNavigation
                currentIndex={currentIndex}
                total={items.length}
                onPrev={goToPrev}
                onNext={goToNext}
              />
            </div>
          </div>
        </main>
      </div>

      <StudySidebar
        category={category}
        dayNumber={dayNumber}
        progress={progress}
        items={items}
        currentIndex={currentIndex}
        masteredCards={masteredCards}
        studiedCards={studiedCards}
        onSelectIndex={goToIndex}
        settings={localSettings} // 🔥 로컬 설정 전달
        handleModeChange={handleModeChange}
        handleAutoProgressChange={handleAutoProgressChange}
        handleAutoPlayChange={handleAutoPlayChange}
        isSettingOpen={isSettingOpen}
      />
    </div>
  );
};

VocabularyMode.displayName = "VocabularyMode";
export default VocabularyMode;
