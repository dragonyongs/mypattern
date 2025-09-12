// src/components/study-modes/VocabularyMode.tsx
import React, { useMemo, useState, useCallback, useEffect } from "react";
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
      autoProgressEnabled: true,
      autoPlayOnSelect: false,
      ...settings,
    }),
    [settings]
  );

  const { speak, isSpeaking } = useTTS();
  const { markModeCompleted } = useDayProgress(packId, dayNumber);
  const store = useStudyProgressStore();

  // 공용 네비게이션 훅 연결
  const nav = useStudyNavigation({
    items,
    initialIndex: initialItemIndex,
    settings: {
      studyMode: currentSettings.studyMode,
      autoProgressEnabled: currentSettings.autoProgressEnabled,
      autoPlay: currentSettings.autoPlayOnSelect,
      skipCompleted: false,
    },
    getProgress: (item) =>
      getItemProgress
        ? getItemProgress(item.id)
        : store.getItemProgress(packId, dayNumber, item.id),
    onItemComplete: (item, idx) => {
      setStudiedCards((s) => new Set(s).add(idx));
      store.setItemCompleted(packId, dayNumber, item.id, true);
      onItemCompleted?.(item.id, true);
    },
    onComplete,
    speak: (text) => speak(text, { lang: "en-US", rate: 0.8 }),
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

  // 완료 상태 복원
  useEffect(() => {
    const mastered = new Set<number>();
    const studied = new Set<number>();
    items.forEach((v, i) => {
      const p = getItemProgress
        ? getItemProgress(v.id)
        : store.getItemProgress(packId, dayNumber, v.id);
      if (p?.isCompleted) {
        mastered.add(i);
        studied.add(i);
      }
    });
    setMasteredCards(mastered);
    setStudiedCards(studied);
  }, [items, packId, dayNumber, getItemProgress, store]);

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
    store.setItemCompleted(packId, dayNumber, item.id, true);
    onItemCompleted?.(item.id, true);
    completeCurrent(); // 자동 진행 위임
  }, [
    currentItem,
    currentIndex,
    packId,
    dayNumber,
    store,
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
    store.setItemCompleted(packId, dayNumber, item.id, false);
    onItemCompleted?.(item.id, false);
  }, [currentItem, currentIndex, packId, dayNumber, store, onItemCompleted]);

  // 설정 핸들러
  const handleModeChange = (m: StudyModeType) =>
    onSettingsChange?.({ studyMode: m });
  const handleAutoProgressChange = (v: boolean) =>
    onSettingsChange?.({ autoProgressEnabled: v });
  const handleAutoPlayChange = (v: boolean) =>
    onSettingsChange?.({ autoPlayOnSelect: v });

  // 진행률/완료
  const progress = useMemo(
    () => (items.length ? (masteredCards.size / items.length) * 100 : 0),
    [items.length, masteredCards.size]
  );
  const isAllMastered = useMemo(
    () => items.length > 0 && masteredCards.size === items.length,
    [items.length, masteredCards.size]
  );
  const handleComplete = () => {
    markModeCompleted(packId, "vocab");
    onComplete?.();
  };

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

            {/* 현재 인덱스가 분명히 내려가도록 Pagination 유지 */}
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
        masteredCards={masteredCards}
        studiedCards={studiedCards}
        onSelectIndex={(i) => goToIndex(i, true)}
        settings={currentSettings}
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
