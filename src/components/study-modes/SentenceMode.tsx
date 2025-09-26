// src/components/study-modes/SentenceMode.tsx
import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
// import { useSwipeGesture } from "@/shared/hooks/useSwipeGesture";
import { useTTS } from "@/shared/hooks/useTTS";
import { useDayProgress } from "@/shared/hooks/useAppHooks";
import { StudySidebar } from "@/shared/components/StudySidebar";
import { useStudyProgressStore } from "@/stores/studyProgressStore";
import StudyCompleteButton from "@/shared/components/StudyCompleteButton";
import StudyPagination from "@/shared/components/StudyPagination";
import StudyCard from "@/shared/components/StudyCard";
import useStudyNavigation from "@/shared/hooks/useStudyNavigation"; // ✅ 추가
import type { StudySettings, StudyModeType } from "@/types";

interface SentenceItem {
  id: string;
  text: string;
  translation?: string;
  targetWords?: string[];
  situation?: string;
  usage?: string;
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
  isSettingOpen?: boolean;
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
  isSettingOpen,
}) => {
  // 상태 - VocabularyMode와 동일
  const [showTranslation, setShowTranslation] = useState(false);
  const [studiedCards, setStudiedCards] = useState<Set<number>>(new Set());
  const [masteredCards, setMasteredCards] = useState<Set<number>>(new Set());

  // ✅ 설정을 VocabularyMode와 동일하게 처리
  const currentSettings = useMemo(
    () => ({
      studyMode: "immersive" as const,
      autoProgressEnabled: false,
      autoPlayOnSelect: false,
      showMeaningEnabled: false,
      ...settings,
    }),
    [settings]
  );

  // console.log("🔍 SentenceMode Debug:", {
  //   showMeaningEnabled: currentSettings.showMeaningEnabled,
  //   showTranslation: showTranslation,
  //   studyMode: currentSettings.studyMode,
  //   receivedSettings: settings,
  // });

  // hooks
  const { speak, isSpeaking } = useTTS();
  const { markModeCompleted } = useDayProgress(packId, dayNumber);

  // ✅ Store 접근을 VocabularyMode와 동일하게 안정화
  const storeActions = useStudyProgressStore(
    useShallow((state) => ({
      getItemProgress: state.getItemProgress,
      setItemCompleted: state.setItemCompleted,
    }))
  );

  // ✅ 공용 네비게이션 훅 - VocabularyMode와 동일
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

  // ✅ 완료 상태 복원 - VocabularyMode와 동일
  useEffect(() => {
    const mastered = new Set<number>();
    const studied = new Set<number>();

    items.forEach((item, idx) => {
      const progress = getItemProgress
        ? getItemProgress(item.id)
        : storeActions.getItemProgress(packId, dayNumber, item.id);
      if (progress?.isCompleted) {
        mastered.add(idx);
        studied.add(idx);
      }
    });

    setMasteredCards(mastered);
    setStudiedCards(studied);
  }, [items, packId, dayNumber, getItemProgress, storeActions.getItemProgress]);

  // 번역 토글
  const handleToggleTranslation = useCallback(() => {
    if (currentSettings.studyMode === "immersive") return;

    setShowTranslation((prev) => {
      const next = !prev;
      if (!prev) {
        setStudiedCards((s) => new Set(s).add(currentIndex));
      }
      return next;
    });
  }, [currentSettings.studyMode, currentIndex]);

  // ✅ 완료 핸들러 - VocabularyMode와 동일한 구조
  const handleMarkAsMastered = useCallback(() => {
    const item = currentItem;
    if (!item?.id) return;

    setMasteredCards((s) => new Set(s).add(currentIndex));
    storeActions.setItemCompleted(packId, dayNumber, item.id, true);
    onItemCompleted?.(item.id, true);

    // ✅ VocabularyMode와 동일: completeCurrent()가 자동 진행 설정을 확인하여 처리
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
      const newSet = new Set(s);
      newSet.delete(currentIndex);
      return newSet;
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

  // 설정 핸들러들 - VocabularyMode와 동일
  const handleModeChange = useCallback(
    (mode: StudyModeType) => onSettingsChange?.({ studyMode: mode }),
    [onSettingsChange]
  );

  const handleAutoProgressChange = useCallback(
    (enabled: boolean) => onSettingsChange?.({ autoProgressEnabled: enabled }),
    [onSettingsChange]
  );

  const handleAutoPlayChange = useCallback(
    (enabled: boolean) => onSettingsChange?.({ autoPlayOnSelect: enabled }),
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
    markModeCompleted("sentence");
    onComplete?.();
  }, [markModeCompleted, onComplete]);

  // 로딩 처리
  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          학습할 문장이 없습니다
        </h2>
        <p className="text-gray-600">Day {dayNumber}의 문장을 확인해주세요</p>
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
              sentence={currentItem?.text}
              translation={
                showTranslation ? currentItem?.translation : undefined
              }
              targetWords={currentItem?.targetWords}
              mode="sentence"
              isMastered={masteredCards.has(currentIndex)}
              showMeaning={showTranslation}
              studyMode={currentSettings.studyMode}
              showMeaningEnabled={currentSettings.showMeaningEnabled}
              isSpeaking={isSpeaking}
              onToggleMeaning={handleToggleTranslation}
              onSpeak={(text) => speak(text, { lang: "en-US", rate: 0.8 })}
              onMarkAsMastered={handleMarkAsMastered}
              onMarkAsNotMastered={handleMarkAsNotMastered}
            />

            {/* StudyPagination */}
            <StudyPagination
              currentIndex={currentIndex}
              totalItems={items.length}
              completed={masteredCards}
              secondary={studiedCards}
              onPrev={() => goToPrev(true)}
              onNext={() => goToNext(true)}
              onIndexChange={(i) => goToIndex(i, true)}
            />

            {/* Complete */}
            <StudyCompleteButton
              isAllMastered={isAllMastered}
              onComplete={handleComplete}
            />
          </div>
        </main>
      </div>

      {/* Sidebar */}
      <StudySidebar
        category={category}
        dayNumber={dayNumber}
        progress={Math.round(progress)}
        items={items}
        currentIndex={currentIndex}
        masteredCards={masteredCards}
        studiedCards={studiedCards}
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

SentenceMode.displayName = "SentenceMode";
export default SentenceMode;
