// src/components/study-modes/VocabularyMode.tsx

import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Volume2,
  CheckCircle,
  RotateCcw,
  Settings,
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
import { useDayProgress } from "@/shared/hooks/useAppHooks";
import { useStudySettings } from "@/shared/hooks/useAppHooks";
import { StudySettingsPanel } from "@/shared/components/StudySettingsPanel";
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
  vocabularies: VocabItem[];
  dayNumber: number;
  category: string;
  packId: string;
  onComplete?: () => void;
}

export const VocabularyMode: React.FC<VocabularyModeProps> = ({
  vocabularies,
  dayNumber,
  category,
  packId,
  onComplete,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);
  const [studiedCards, setStudiedCards] = useState<Set<number>>(new Set());
  const [masteredCards, setMasteredCards] = useState<Set<number>>(new Set());
  const [isSettingOpen, setIsSettingOpen] = useState(false);

  const { settings, updateSetting } = useStudySettings(packId);
  const { speak, isSpeaking } = useTTS();
  const { markModeCompleted } = useDayProgress(packId, dayNumber);

  // 🔥 Zustand 스토어 추가
  const { setItemCompleted, getItemProgress } = useStudyProgressStore();

  const currentItem = useMemo(
    () => vocabularies[currentIndex],
    [vocabularies, currentIndex]
  );

  const progress = useMemo(
    () =>
      vocabularies.length
        ? (masteredCards.size / vocabularies.length) * 100
        : 0,
    [masteredCards.size, vocabularies.length]
  );

  const isAllMastered = useMemo(
    () => vocabularies.length > 0 && masteredCards.size === vocabularies.length,
    [masteredCards.size, vocabularies.length]
  );

  // 🔥 로컬스토리지에서 완료 상태 복원
  useEffect(() => {
    const masteredSet = new Set<number>();
    const studiedSet = new Set<number>();

    vocabularies.forEach((vocab, index) => {
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
  }, [vocabularies, getItemProgress, packId, dayNumber]);

  // 핸들러들
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

  const handleShowMeaningChange = useCallback(
    (enabled: boolean) => {
      updateSetting("showMeaningEnabled", enabled);
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

  // 🔥 수정된 handleMarkAsMastered - setItemCompleted 추가
  const handleMarkAsMastered = useCallback(() => {
    const currentVocab = vocabularies[currentIndex];
    if (!currentVocab?.id) {
      console.warn("[VocabularyMode] 단어 ID가 없습니다:", currentVocab);
      return;
    }

    // 로컬 상태 업데이트
    const m = new Set(masteredCards);
    m.add(currentIndex);
    setMasteredCards(m);

    const s = new Set(studiedCards);
    s.add(currentIndex);
    setStudiedCards(s);

    // 🔥 Zustand 스토어에 완료 상태 저장
    setItemCompleted(packId, dayNumber, currentVocab.id, true);

    console.debug("[VocabularyMode] 단어 완료 처리:", {
      packId,
      dayNumber,
      vocabId: currentVocab.id,
      word: currentVocab.word,
      currentIndex,
    });

    // 자동 진행
    if (
      settings.autoProgressEnabled &&
      currentIndex < vocabularies.length - 1
    ) {
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
        setShowMeaning(false);
      }, 300);
    }
  }, [
    vocabularies,
    currentIndex,
    masteredCards,
    studiedCards,
    setItemCompleted,
    packId,
    dayNumber,
    settings.autoProgressEnabled,
  ]);

  // 🔥 수정된 handleMarkAsNotMastered - setItemCompleted 추가
  const handleMarkAsNotMastered = useCallback(() => {
    const currentVocab = vocabularies[currentIndex];
    if (!currentVocab?.id) return;

    // 로컬 상태 업데이트
    const m = new Set(masteredCards);
    m.delete(currentIndex);
    setMasteredCards(m);

    // 🔥 Zustand 스토어에서 완료 상태 제거
    setItemCompleted(packId, dayNumber, currentVocab.id, false);

    console.debug("[VocabularyMode] 단어 완료 취소:", {
      packId,
      dayNumber,
      vocabId: currentVocab.id,
      word: currentVocab.word,
      currentIndex,
    });
  }, [
    vocabularies,
    currentIndex,
    masteredCards,
    setItemCompleted,
    packId,
    dayNumber,
  ]);

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

  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: goToNext,
    onSwipeRight: goToPrev,
  });

  const handleComplete = useCallback(() => {
    markModeCompleted(dayNumber, "vocab");
    onComplete?.();
  }, [markModeCompleted, dayNumber, onComplete]);

  if (!vocabularies.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] px-4">
        <div className="text-5xl mb-4 opacity-50">📚</div>
        <div className="text-lg font-medium text-gray-900 mb-1">
          학습할 단어가 없습니다
        </div>
        <div className="text-sm text-gray-500">
          Day {dayNumber}의 단어를 확인해주세요
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 min-h-screen lg:flex-row">
      {/* 모바일 헤더 */}
      <div className="lg:hidden bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {category}
            </div>
            <div className="w-1 h-1 bg-gray-300 rounded-full" />
            <div className="text-xs font-semibold text-indigo-600">
              Day {dayNumber}
            </div>
          </div>

          <button
            onClick={() => setIsSettingOpen((p) => !p)}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all"
          >
            <Settings className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* 진행률 바 - 모바일 */}
        <div className="px-5 pb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-600">진행률</span>
            <span className="text-xs font-bold text-gray-900">
              {masteredCards.size}/{vocabularies.length}
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* 설정 패널 */}
      {isSettingOpen && (
        <StudySettingsPanel
          packId={packId}
          onClose={() => setIsSettingOpen(false)}
        />
      )}

      {/* 메인 컨텐츠 영역 */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* 메인 카드 영역 */}
        <div className="flex-1 flex flex-col items-center justify-start p-5 lg:p-8">
          <div className="w-full max-w-lg mx-auto">
            {/* 카드 상단 인디케이터 */}
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center gap-1.5">
                {vocabularies.map((_, idx) => (
                  <div
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
            </div>

            {/* 메인 카드 */}
            <div
              {...swipeHandlers}
              onClick={handleToggleMeaning}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 lg:p-10 text-center transform transition-all duration-300 hover:shadow-md cursor-pointer relative overflow-hidden"
            >
              {/* 완료 상태 뱃지 */}
              {masteredCards.has(currentIndex) && (
                <div className="absolute top-4 right-4">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                    <Check className="w-4 h-4 text-indigo-600" />
                  </div>
                </div>
              )}

              {/* 이모지 */}
              <div className="text-6xl mb-6">{currentItem.emoji}</div>

              {/* 단어 */}
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                {currentItem.word}
              </h2>

              {/* 발음 */}
              {currentItem.pronunciation && (
                <p className="text-gray-500 mb-6 text-base">
                  {currentItem.pronunciation}
                </p>
              )}

              {/* 발음 버튼 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSpeak(currentItem.word);
                }}
                disabled={isSpeaking}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 text-gray-700 rounded-full text-sm font-medium transition-all disabled:opacity-50"
              >
                <Volume2 className="w-4 h-4" />
                {isSpeaking ? "재생중" : "발음 듣기"}
              </button>

              {/* 의미 표시 영역 */}
              {settings.showMeaningEnabled && showMeaning && (
                <div className="mt-8 p-6 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-lg font-medium text-gray-900 leading-relaxed">
                    {currentItem.meaning}
                  </p>
                  {currentItem.usage && (
                    <p className="text-sm text-gray-600 mt-4 italic">
                      "{currentItem.usage}"
                    </p>
                  )}
                </div>
              )}

              {/* 힌트 텍스트 */}
              {!showMeaning && settings.showMeaningEnabled && (
                <p className="text-gray-400 text-xs mt-8 flex items-center justify-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  탭하여 의미 확인
                </p>
              )}

              {settings.studyMode === "immersive" && (
                <p className="text-indigo-600 text-xs mt-8 flex items-center justify-center gap-1.5">
                  <Brain className="w-3.5 h-3.5" />
                  영어로 의미를 생각해보세요
                </p>
              )}
            </div>

            {/* 네비게이션 버튼 */}
            <div className="flex items-center justify-between mt-6 gap-4">
              <button
                onClick={goToPrev}
                disabled={currentIndex === 0}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium transition-all hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                이전
              </button>

              <div className="text-sm font-semibold text-gray-600">
                {currentIndex + 1} / {vocabularies.length}
              </div>

              <button
                onClick={goToNext}
                disabled={currentIndex >= vocabularies.length - 1}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium transition-all hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                다음
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* 액션 버튼 */}
            <div className="mt-4">
              {masteredCards.has(currentIndex) ? (
                <button
                  onClick={handleMarkAsNotMastered}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium transition-all hover:bg-gray-50"
                >
                  <RotateCcw className="w-4 h-4" />
                  다시 학습
                </button>
              ) : (
                <button
                  onClick={handleMarkAsMastered}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-all shadow-sm hover:shadow-md"
                >
                  <Target className="w-4 h-4" />
                  학습 완료
                </button>
              )}
            </div>

            {/* 완료 버튼 */}
            {isAllMastered && (
              <button
                onClick={handleComplete}
                className="w-full mt-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
              >
                🎉 모든 학습 완료
              </button>
            )}
          </div>
        </div>

        {/* 데스크톱 사이드바 */}
        <div className="hidden lg:block w-80 bg-white border-l border-gray-100 p-6 space-y-6">
          {/* 헤더 정보 */}
          <div className="pb-6 border-b border-gray-100">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              {category}
            </div>
            <h3 className="text-xl font-bold text-gray-900">Day {dayNumber}</h3>
          </div>

          {/* 진행률 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">
                학습 진행률
              </span>
              <span className="text-sm font-bold text-indigo-600">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-600 to-purple-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-gray-500">완료</span>
              <span className="text-xs font-medium text-gray-700">
                {masteredCards.size}/{vocabularies.length}
              </span>
            </div>
          </div>

          {/* 학습 현황 그리드 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              학습 카드
            </h4>
            <div className="grid grid-cols-5 gap-2">
              {vocabularies.map((_, idx) => (
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

          {/* 학습 모드 설정 */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">학습 모드</h4>
            <div className="space-y-2">
              <button
                onClick={() => handleModeChange("assisted")}
                className={`w-full px-4 py-3 rounded-lg text-left transition-all ${
                  settings.studyMode === "assisted"
                    ? "bg-indigo-50 border-2 border-indigo-600 text-indigo-600"
                    : "bg-gray-50 border-2 border-transparent text-gray-600 hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  <span className="text-sm font-medium">도움 모드</span>
                </div>
                <p className="text-xs mt-1 opacity-75">의미를 바로 확인 가능</p>
              </button>

              <button
                onClick={() => handleModeChange("immersive")}
                className={`w-full px-4 py-3 rounded-lg text-left transition-all ${
                  settings.studyMode === "immersive"
                    ? "bg-indigo-50 border-2 border-indigo-600 text-indigo-600"
                    : "bg-gray-50 border-2 border-transparent text-gray-600 hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  <span className="text-sm font-medium">몰입 모드</span>
                </div>
                <p className="text-xs mt-1 opacity-75">영어로만 학습</p>
              </button>
            </div>
          </div>

          {/* 자동 진행 토글 */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">
                자동 진행
              </span>
            </div>
            <button
              onClick={() =>
                handleAutoProgressChange(!settings.autoProgressEnabled)
              }
              className={`w-11 h-6 rounded-full transition-all ${
                settings.autoProgressEnabled ? "bg-indigo-600" : "bg-gray-300"
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                  settings.autoProgressEnabled
                    ? "translate-x-5"
                    : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {/* 설정 버튼 */}
          <button
            onClick={() => setIsSettingOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-all"
          >
            <Settings className="w-4 h-4" />
            상세 설정
          </button>
        </div>
      </div>
    </div>
  );
};

export default VocabularyMode;
