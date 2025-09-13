// src/components/study-modes/VocabularyMode.tsx
import React, { useMemo, useState, useCallback, useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { Target } from "lucide-react";
import useStudyNavigation from "@/shared/hooks/useStudyNavigation";
import { useTTS } from "@/shared/hooks/useTTS";
import { useDayProgress } from "@/shared/hooks/useAppHooks";
import { useStudyProgressStore } from "@/stores/studyProgressStore";

import { StudySidebar } from "@/shared/components/StudySidebar";
import StudyCard from "@/shared/components/StudyCard";
import StudyPagination from "@/shared/components/StudyPagination";
import StudyCompleteButton from "@/shared/components/StudyCompleteButton";

export type StudyModeType = "immersive" | "assisted";

interface VocabularyItem {
  id: string;
  word: string;
  meaning: string;
  pronunciation?: string;
  usage?: string;
  emoji?: string;
}

export interface StudySettings {
  studyMode?: StudyModeType;
  autoProgressEnabled?: boolean;
  autoPlayOnSelect?: boolean;
}

interface Props {
  items: VocabularyItem[];
  dayNumber: number;
  packId: string;
  initialItemIndex?: number;
  category?: string;
  settings?: StudySettings;
  getItemProgress?: (id: string) => {
    isCompleted: boolean;
    lastStudied?: string | null;
  };
  onItemCompleted?: (id: string, done: boolean) => void;
  onComplete?: () => void;
  onSettingsChange?: (next: StudySettings) => void;
  isSettingOpen?: boolean;
}

const VocabularyMode: React.FC<Props> = ({
  items,
  dayNumber,
  packId,
  initialItemIndex = 0,
  category = "단어 학습",
  settings = {},
  getItemProgress,
  onItemCompleted,
  onComplete,
  onSettingsChange,
  isSettingOpen,
}) => {
  const [showMeaning, setShowMeaning] = useState(false);
  const [studiedCards, setStudiedCards] = useState<Set<number>>(new Set());
  const [masteredCards, setMasteredCards] = useState<Set<number>>(new Set());

  const currentSettings = useMemo<Required<StudySettings>>(
    () => ({
      studyMode: "immersive",
      autoProgressEnabled: false, // 🔥 강제 비활성화
      autoPlayOnSelect: false,
      ...settings,
    }),
    [settings]
  );

  const { speak, isSpeaking } = useTTS();
  const { markModeCompleted } = useDayProgress(packId, dayNumber);

  // 🔥 Store 접근을 안정화
  const storeActions = useStudyProgressStore(
    useShallow((state) => ({
      getItemProgress: state.getItemProgress,
      setItemCompleted: state.setItemCompleted,
    }))
  );

  // 🔥 공용 네비게이션 훅 - 안정화된 설정 전달
  const navSettings = useMemo(
    () => ({
      studyMode: currentSettings.studyMode,
      autoProgressEnabled: currentSettings.autoProgressEnabled,
      autoPlay: currentSettings.autoPlayOnSelect,
      skipCompleted: false,
    }),
    [currentSettings]
  );

  const nav = useStudyNavigation({
    items,
    initialIndex: initialItemIndex,
    settings: navSettings,
    getProgress: useCallback(
      (item) =>
        getItemProgress
          ? getItemProgress(item.id)
          : storeActions.getItemProgress(packId, dayNumber, item.id),
      [getItemProgress, storeActions.getItemProgress, packId, dayNumber]
    ),
    onItemComplete: useCallback(
      (item, idx) => {
        setStudiedCards((s) => new Set(s).add(idx));
        storeActions.setItemCompleted(packId, dayNumber, item.id, true);
        onItemCompleted?.(item.id, true);
      },
      [storeActions.setItemCompleted, packId, dayNumber, onItemCompleted]
    ),
    onComplete,
    speak: useCallback(
      (text) => speak(text, { lang: "en-US", rate: 0.8 }),
      [speak]
    ),
  });

  const {
    index: currentIndex,
    currentItem,
    swipeHandlers,
    prev: goToPrev,
    next: goToNext,
    goTo: goToIndex,
    completeCurrent,
  } = nav;

  // 🔥 완료 상태 복원 - 안정화
  useEffect(() => {
    const mastered = new Set<number>();
    const studied = new Set<number>();

    items.forEach((v, i) => {
      const progress = getItemProgress
        ? getItemProgress(v.id)
        : storeActions.getItemProgress(packId, dayNumber, v.id);
      if (progress?.isCompleted) {
        mastered.add(i);
        studied.add(i);
      }
    });

    setMasteredCards(mastered);
    setStudiedCards(studied);
  }, [items, packId, dayNumber, getItemProgress, storeActions.getItemProgress]);

  // 의미 토글
  const handleToggleMeaning = useCallback(() => {
    if (currentSettings.studyMode === "immersive") return;
    setShowMeaning((prev) => {
      const next = !prev;
      if (!prev) setStudiedCards((s) => new Set(s).add(currentIndex));
      return next;
    });
  }, [currentSettings.studyMode, currentIndex]);

  // 완료·미완료
  const handleMarkAsMastered = useCallback(() => {
    const item = currentItem;
    if (!item?.id) return;
    setMasteredCards((s) => new Set(s).add(currentIndex));
    storeActions.setItemCompleted(packId, dayNumber, item.id, true);
    onItemCompleted?.(item.id, true);
    completeCurrent();
  }, [
    currentItem,
    currentIndex,
    packId,
    dayNumber,
    storeActions.setItemCompleted,
    onItemCompleted,
    completeCurrent,
  ]);

  const handleMarkAsNotMastered = useCallback(() => {
    const item = currentItem;
    if (!item?.id) return;
    setMasteredCards((s) => {
      const n = new Set(s);
      n.delete(currentIndex);
      return n;
    });
    storeActions.setItemCompleted(packId, dayNumber, item.id, false);
    onItemCompleted?.(item.id, false);
  }, [
    currentItem,
    currentIndex,
    packId,
    dayNumber,
    storeActions.setItemCompleted,
    onItemCompleted,
  ]);

  // 설정 핸들러들
  const handleModeChange = useCallback(
    (m: StudyModeType) => onSettingsChange?.({ studyMode: m }),
    [onSettingsChange]
  );
  const handleAutoProgressChange = useCallback(
    (v: boolean) => onSettingsChange?.({ autoProgressEnabled: v }),
    [onSettingsChange]
  );
  const handleAutoPlayChange = useCallback(
    (v: boolean) => onSettingsChange?.({ autoPlayOnSelect: v }),
    [onSettingsChange]
  );

  // 진행률/완료
  const progress = useMemo(
    () => (items.length ? (masteredCards.size / items.length) * 100 : 0),
    [items.length, masteredCards.size]
  );

  const isAllMastered = useMemo(
    () => items.length > 0 && masteredCards.size === items.length,
    [items.length, masteredCards.size]
  );

  const handleComplete = useCallback(() => {
    markModeCompleted(packId, "vocab");
    onComplete?.();
  }, [markModeCompleted, packId, onComplete]);

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
    <div className="flex h-full min-h-[calc(100vh-217px)] lg:min-h-[calc(100vh-130px)] bg-gray-50 font-sans pb-20 lg:pb-0">
      <div className="flex-1 flex flex-col overflow-hidden">
        <main
          className="flex-1 flex flex-col justify-center items-center p-4 overflow-y-auto"
          {...swipeHandlers}
        >
          <div className="w-full max-w-xl">
            <StudyCard
              mode="vocabulary"
              word={currentItem.word}
              pronunciation={currentItem.pronunciation}
              meaning={currentItem.meaning}
              usage={currentItem.usage}
              emoji={currentItem.emoji}
              isMastered={masteredCards.has(currentIndex)}
              showMeaning={showMeaning}
              isSpeaking={isSpeaking}
              studyMode={currentSettings.studyMode}
              showMeaningEnabled={currentSettings.studyMode === "assisted"}
              onToggleMeaning={handleToggleMeaning}
              onSpeak={(t) => speak(t, { lang: "en-US", rate: 0.85 })}
              onMarkAsMastered={handleMarkAsMastered}
              onMarkAsNotMastered={handleMarkAsNotMastered}
            />

            <StudyPagination
              currentIndex={currentIndex}
              totalItems={items.length}
              completed={masteredCards}
              secondary={studiedCards}
              onPrev={() => goToPrev(true)}
              onNext={() => goToNext(true)}
              onIndexChange={(i) => goToIndex(i, true)}
            />

            <StudyCompleteButton
              isAllMastered={isAllMastered}
              onComplete={handleComplete}
            />
          </div>
        </main>
      </div>

      <StudySidebar
        category={category}
        dayNumber={dayNumber}
        progress={progress}
        items={items}
        currentIndex={currentIndex}
        studiedCards={studiedCards}
        masteredCards={masteredCards}
        onSelectIndex={(i) => goToIndex(i, true)}
        settings={currentSettings}
        handleModeChange={handleModeChange}
        handleAutoProgressChange={handleAutoProgressChange}
        handleAutoPlayChange={handleAutoPlayChange}
        isSettingOpen={isSettingOpen ?? false}
      />
    </div>
  );
};

VocabularyMode.displayName = "VocabularyMode";
export default VocabularyMode;
