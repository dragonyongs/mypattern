// src/components/study-modes/SentenceMode.tsx

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

interface SentenceItem {
  id?: string;
  text: string;
  translation: string;
  targetWords?: string[];
  situation?: string;
}
interface SentenceModeProps {
  sentences: SentenceItem[];
  dayNumber: number;
  category: string;
  packId: string;
  onComplete?: () => void;
}

export const SentenceMode: React.FC<SentenceModeProps> = ({
  sentences,
  dayNumber,
  category,
  packId,
  onComplete,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showTranslation, setShowTranslation] = useState(false);
  const [studiedCards, setStudiedCards] = useState<Set<number>>(new Set());
  const [masteredCards, setMasteredCards] = useState<Set<number>>(new Set());
  const [isSettingOpen, setIsSettingOpen] = useState(false);

  const { settings, updateSetting } = useStudySettings(packId);
  const { speak, isSpeaking } = useTTS();
  const { markModeCompleted } = useDayProgress(packId, dayNumber);

  // 🔥 Zustand 스토어 추가
  const { setItemCompleted, getItemProgress } = useStudyProgressStore();

  const currentItem = useMemo(
    () => sentences[currentIndex],
    [sentences, currentIndex]
  );

  const progress = useMemo(
    () =>
      sentences.length ? (masteredCards.size / sentences.length) * 100 : 0,
    [masteredCards.size, sentences.length]
  );

  const isAllMastered = useMemo(
    () => sentences.length > 0 && masteredCards.size === sentences.length,
    [masteredCards.size, sentences.length]
  );

  // 🔥 로컬스토리지에서 완료 상태 복원
  useEffect(() => {
    const masteredSet = new Set<number>();
    const studiedSet = new Set<number>();

    sentences.forEach((sentence, index) => {
      if (sentence.id) {
        const progress = getItemProgress(packId, dayNumber, sentence.id);
        if (progress?.completed) {
          masteredSet.add(index);
          studiedSet.add(index);
        }
      }
    });

    setMasteredCards(masteredSet);
    setStudiedCards(studiedSet);
    console.debug("[SentenceMode] 완료 상태 복원:", {
      packId,
      dayNumber,
      masteredCount: masteredSet.size,
      studiedCount: studiedSet.size,
    });
  }, [sentences, getItemProgress, packId, dayNumber]);

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

  const handleSpeak = useCallback(
    (text: string) => {
      if (text) speak(text, { lang: "en-US", rate: 0.8 });
    },
    [speak]
  );

  const handleToggleTranslation = useCallback(() => {
    if (!settings.showMeaningEnabled) return;
    setShowTranslation((prev) => !prev);
    if (!showTranslation) {
      const s = new Set(studiedCards);
      s.add(currentIndex);
      setStudiedCards(s);
    }
  }, [
    settings.showMeaningEnabled,
    showTranslation,
    studiedCards,
    currentIndex,
  ]);

  // 🔥 수정된 handleMarkAsMastered - setItemCompleted 추가
  const handleMarkAsMastered = useCallback(() => {
    const currentSentence = sentences[currentIndex];
    if (!currentSentence?.id) {
      console.warn("[SentenceMode] 문장 ID가 없습니다:", currentSentence);
      return;
    }

    // 로컬 상태 업데이트
    const m = new Set(masteredCards);
    m.add(currentIndex);
    setMasteredCards(m);
    const s = new Set(studiedCards);
    s.add(currentIndex);
    setStudiedCards(s);

    // Zustand 스토어에 완료 상태 저장
    setItemCompleted(packId, dayNumber, currentSentence.id, true);

    console.debug("[SentenceMode] 문장 완료 처리:", {
      packId,
      dayNumber,
      sentenceId: currentSentence.id,
      text: currentSentence.text,
      currentIndex,
    });

    // 자동 진행
    if (settings.autoProgressEnabled && currentIndex < sentences.length - 1) {
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
        setShowTranslation(false);
      }, 300);
    }
  }, [
    sentences,
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
    const currentSentence = sentences[currentIndex];
    if (!currentSentence?.id) return;

    // 로컬 상태 업데이트
    const m = new Set(masteredCards);
    m.delete(currentIndex);
    setMasteredCards(m);

    // 🔥 Zustand 스토어에서 완료 상태 제거
    setItemCompleted(packId, dayNumber, currentSentence.id, false);

    console.debug("[SentenceMode] 문장 완료 취소:", {
      packId,
      dayNumber,
      sentenceId: currentSentence.id,
      sentence: currentSentence.sentence,
      currentIndex,
    });
  }, [
    sentences,
    currentIndex,
    masteredCards,
    setItemCompleted,
    packId,
    dayNumber,
  ]);

  const goToNext = useCallback(() => {
    if (currentIndex < sentences.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setShowTranslation(false);
    }
  }, [currentIndex, sentences.length]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setShowTranslation(false);
    }
  }, [currentIndex]);

  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: goToNext,
    onSwipeRight: goToPrev,
  });

  const handleComplete = useCallback(() => {
    markModeCompleted(dayNumber, "sentence");
    onComplete?.();
  }, [markModeCompleted, dayNumber, onComplete]);

  // 문장에서 targetWord를 강조하는 함수
  const renderHighlightedSentence = useCallback(
    (text: string, targetWords?: string[]) => {
      if (!targetWords || targetWords.length === 0) {
        return text;
      }

      // 모든 targetWords를 하나의 정규식으로 처리
      const allTargets = targetWords.join("|");
      const parts = text.split(new RegExp(`(${allTargets})`, "gi"));

      return (
        <>
          {parts.map((part, index) => {
            const isTarget = targetWords.some(
              (target) => part.toLowerCase() === target.toLowerCase()
            );
            return isTarget ? (
              <span
                key={index}
                className="font-bold underline text-blue-600 decoration-2"
              >
                {part}
              </span>
            ) : (
              part
            );
          })}
        </>
      );
    },
    []
  );

  if (!sentences.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Target className="w-16 h-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          학습할 문장이 없습니다
        </h3>
        <p className="text-gray-600">Day {dayNumber}의 문장을 확인해주세요</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50">
      {/* 모바일 헤더 */}
      <div className="lg:hidden bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{category}</h2>
            <p className="text-sm text-gray-600">Day {dayNumber}</p>
          </div>
          <button
            onClick={() => setIsSettingOpen((p) => !p)}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all"
          >
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* 진행률 바 - 모바일 */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>진행률</span>
            <span>
              {masteredCards.size}/{sentences.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* 설정 패널 */}
      {isSettingOpen && (
        <StudySettingsPanel
          packId={packId}
          showMeaningLabel="번역 표시 허용"
          onClose={() => setIsSettingOpen(false)}
        />
      )}

      {/* 메인 컨텐츠 영역 */}
      <div className="flex-1 flex flex-col">
        {/* 메인 카드 영역 */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl">
            {/* 카드 상단 인디케이터 */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {sentences.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setShowTranslation(false);
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

            {/* 메인 카드 */}
            <div
              {...swipeHandlers}
              onClick={handleToggleTranslation}
              className="bg-white rounded-2xl shadow-xl p-8 cursor-pointer transition-transform active:scale-[0.98] min-h-[400px] flex flex-col justify-center relative"
            >
              {/* 완료 상태 뱃지 */}
              {masteredCards.has(currentIndex) && (
                <div className="absolute top-4 right-4 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  완료
                </div>
              )}

              {/* 영어 문장 */}
              <div className="text-center mb-6">
                <p className="text-4xl font-medium text-gray-800 leading-relaxed mb-4">
                  {renderHighlightedSentence(
                    currentItem.text,
                    currentItem.targetWords
                  )}
                </p>

                {/* 발음 버튼 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSpeak(currentItem.text);
                  }}
                  disabled={isSpeaking}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 text-gray-700 rounded-full text-sm font-medium transition-all disabled:opacity-50"
                >
                  <Volume2 className="w-4 h-4" />
                  {isSpeaking ? "재생중" : "발음 듣기"}
                </button>
              </div>

              {/* 한국어 번역 표시 영역 */}
              {settings.showMeaningEnabled && showTranslation && (
                <div className="text-center border-t border-slate-200 pt-6">
                  <p className="text-lg text-gray-600">
                    {currentItem.translation}
                  </p>
                </div>
              )}

              {/* 힌트 텍스트 */}
              {!showTranslation && settings.showMeaningEnabled && (
                <div className="text-center text-gray-400 text-sm mt-4">
                  탭하여 번역 보기
                </div>
              )}

              {settings.studyMode === "immersive" && (
                <div className="text-center text-indigo-600 text-sm mt-4 flex items-center justify-center gap-2">
                  <Brain className="w-4 h-4" />
                  영어로 의미를 생각해보세요
                </div>
              )}
            </div>

            {/* 네비게이션 버튼 */}
            <div className="flex items-center gap-4 mt-6">
              <button
                onClick={goToPrev}
                disabled={currentIndex === 0}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium transition-all hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="w-4 h-4" />
                이전
              </button>

              <div className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-600">
                {currentIndex + 1} / {sentences.length}
              </div>

              <button
                onClick={goToNext}
                disabled={currentIndex >= sentences.length - 1}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium transition-all hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                다음
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* 액션 버튼 */}
            <div className="mt-4">
              {masteredCards.has(currentIndex) ? (
                <button
                  onClick={handleMarkAsNotMastered}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  다시 학습
                </button>
              ) : (
                <button
                  onClick={handleMarkAsMastered}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-all"
                >
                  <Check className="w-4 h-4" />
                  학습 완료
                </button>
              )}
            </div>

            {/* 전체 학습 완료 버튼 */}
            {isAllMastered && (
              <div className="mt-4">
                <button
                  onClick={handleComplete}
                  className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-lg transition-all shadow-lg"
                >
                  🎉 모든 학습 완료
                </button>
              </div>
            )}

            {/* 스와이프 힌트 */}
            <div className="text-center text-xs text-gray-400 mt-4">
              좌우 스와이프 또는 화살표로 이동
            </div>
          </div>
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
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>학습 진행률</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
            <div
              className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>완료</span>
            <span>
              {masteredCards.size}/{sentences.length}
            </span>
          </div>
        </div>

        {/* 학습 현황 그리드 */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-900 mb-3">학습 카드</h3>
          <div className="grid grid-cols-6 gap-2">
            {sentences.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrentIndex(idx);
                  setShowTranslation(false);
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
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-900 mb-3">학습 모드</h3>
          <div className="space-y-2">
            <button
              onClick={() => handleModeChange("assisted")}
              className={`w-full px-4 py-3 rounded-lg text-left transition-all ${
                settings.studyMode === "assisted"
                  ? "bg-indigo-50 border-2 border-indigo-600 text-indigo-600"
                  : "bg-gray-50 border-2 border-transparent text-gray-600 hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Lightbulb className="w-4 h-4" />
                <span className="font-medium">도움 모드</span>
              </div>
              <p className="text-xs">번역을 바로 확인 가능</p>
            </button>

            <button
              onClick={() => handleModeChange("immersive")}
              className={`w-full px-4 py-3 rounded-lg text-left transition-all ${
                settings.studyMode === "immersive"
                  ? "bg-indigo-50 border-2 border-indigo-600 text-indigo-600"
                  : "bg-gray-50 border-2 border-transparent text-gray-600 hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Brain className="w-4 h-4" />
                <span className="font-medium">몰입 모드</span>
              </div>
              <p className="text-xs">영어로만 학습</p>
            </button>
          </div>
        </div>

        {/* 자동 진행 토글 */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900">자동 진행</span>
            <button
              onClick={() =>
                handleAutoProgressChange(!settings.autoProgressEnabled)
              }
              className={`w-11 h-6 rounded-full transition-all ${
                settings.autoProgressEnabled ? "bg-indigo-600" : "bg-gray-300"
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full transition-transform ${
                  settings.autoProgressEnabled
                    ? "translate-x-6"
                    : "translate-x-1"
                }`}
              />
            </button>
          </div>
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
  );
};

export default SentenceMode;
