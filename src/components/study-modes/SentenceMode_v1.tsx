// src/components/study-modes/SentenceMode.tsx
import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Volume2,
  CheckCircle,
  RotateCcw,
  Eye,
  EyeOff,
  Settings,
} from "lucide-react";
import { useSwipeGesture } from "@/shared/hooks/useSwipeGesture";
import { useTTS } from "@/shared/hooks/useTTS";
import { useDayProgress } from "@/shared/hooks/useAppHooks";
import { useStudySettings } from "@/shared/hooks/useAppHooks";
import { StudySettingsPanel } from "@/shared/components/StudySettingsPanel";
import { useStudyProgressStore } from "@/stores/studyProgressStore";

// =======================================================================
// 타입 정의
// =======================================================================
interface SentenceItem {
  id: string;
  text?: string;
  sentence?: string;
  translation: string;
  targetWords?: string[];
  situation?: string;
}

interface SentenceModeProps {
  sentences: SentenceItem[];
  dayNumber: number;
  category?: string;
  packId: string;
  onComplete?: () => void;
}

// =======================================================================
// 메인 컴포넌트: SentenceMode
// =======================================================================
export const SentenceMode: React.FC<SentenceModeProps> = ({
  sentences: rawSentences,
  dayNumber,
  packId,
  onComplete,
}) => {
  const sentences = Array.isArray(rawSentences) ? rawSentences : [];
  const sentenceIds = useMemo(() => sentences.map((s) => s.id), [sentences]);

  // 상태 관리
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showTranslation, setShowTranslation] = useState(false);
  const [isSettingOpen, setIsSettingOpen] = useState(false);
  const [studiedSentences, setStudiedSentences] = useState<Set<number>>(
    new Set()
  );
  const [completedSentences, setCompletedSentences] = useState<Set<number>>(
    new Set()
  );

  // 공통 훅 사용
  const { settings, updateSetting } = useStudySettings(packId);
  const { speak, isSpeaking } = useTTS();
  const { markModeCompleted } = useDayProgress(packId, dayNumber);
  const { setItemCompleted, getItemProgress } = useStudyProgressStore();

  // 현재 문장 정보
  const currentSentence = useMemo(
    () => sentences[currentIndex],
    [sentences, currentIndex]
  );
  const displayText = currentSentence?.text || currentSentence?.sentence || "";

  // 진행률 계산
  const progress = useMemo(
    () =>
      sentences.length > 0
        ? (completedSentences.size / sentences.length) * 100
        : 0,
    [completedSentences.size, sentences.length]
  );

  const isAllCompleted = useMemo(
    () => sentences.length > 0 && completedSentences.size === sentences.length,
    [completedSentences.size, sentences.length]
  );

  // 완료 상태 확인
  const isCurrentCompleted = useMemo(
    () => completedSentences.has(currentIndex),
    [completedSentences, currentIndex]
  );

  // 네비게이션
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

  // 스와이프 핸들러
  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: goToNext,
    onSwipeRight: goToPrev,
  });

  // 핸들러들
  const handleRead = useCallback(() => {
    if (displayText) {
      speak(displayText, { lang: "en-US", rate: settings.ttsRate || 1.0 });

      // 읽기 시 학습됨으로 표시
      const studied = new Set(studiedSentences);
      studied.add(currentIndex);
      setStudiedSentences(studied);

      // Zustand 스토어에도 저장
      if (currentSentence) {
        setItemCompleted(packId, dayNumber, currentSentence.id, false); // 읽기만 한 상태
      }
    }
  }, [
    displayText,
    speak,
    settings.ttsRate,
    studiedSentences,
    currentIndex,
    currentSentence,
    setItemCompleted,
    packId,
    dayNumber,
  ]);

  const handleToggleTranslation = useCallback(() => {
    if (!settings.showMeaningEnabled) return;
    setShowTranslation((prev) => !prev);

    // 번역 확인 시 학습됨으로 표시
    if (!showTranslation) {
      const studied = new Set(studiedSentences);
      studied.add(currentIndex);
      setStudiedSentences(studied);
    }
  }, [
    settings.showMeaningEnabled,
    showTranslation,
    studiedSentences,
    currentIndex,
  ]);

  const handleMarkAsCompleted = useCallback(() => {
    const completed = new Set(completedSentences);
    completed.add(currentIndex);
    setCompletedSentences(completed);

    // Zustand 스토어에 완료 상태 저장
    if (currentSentence) {
      setItemCompleted(packId, dayNumber, currentSentence.id, true);
    }

    // 자동 진행이 설정되어 있으면 다음으로 이동
    if (settings.autoProgressEnabled && currentIndex < sentences.length - 1) {
      setTimeout(goToNext, 500);
    }
  }, [
    completedSentences,
    currentIndex,
    currentSentence,
    setItemCompleted,
    packId,
    dayNumber,
    settings.autoProgressEnabled,
    goToNext,
    sentences.length,
  ]);

  const handleMarkAsNotCompleted = useCallback(() => {
    const completed = new Set(completedSentences);
    completed.delete(currentIndex);
    setCompletedSentences(completed);

    // Zustand 스토어에서 완료 상태 제거
    if (currentSentence) {
      setItemCompleted(packId, dayNumber, currentSentence.id, false);
    }
  }, [
    completedSentences,
    currentIndex,
    currentSentence,
    setItemCompleted,
    packId,
    dayNumber,
  ]);

  const handleCompleteMode = useCallback(() => {
    markModeCompleted(dayNumber, "sentence");
    onComplete?.();
  }, [markModeCompleted, dayNumber, onComplete]);

  // 타겟 워드 강조
  const highlightedSentence = useMemo(() => {
    if (!displayText || !currentSentence?.targetWords) return displayText;

    // 몰입 모드일 때는 강조만 표시
    if (settings.studyMode === "immersive") {
      let result = displayText;
      currentSentence.targetWords.forEach((word) => {
        const regex = new RegExp(`\\b(${word})\\b`, "gi");
        result = result.replace(
          regex,
          `<span class="font-bold text-blue-600">${word}</span>`
        );
      });
      return <span dangerouslySetInnerHTML={{ __html: result }} />;
    }

    // 도움 모드일 때는 강조 + 밑줄
    let result = displayText;
    currentSentence.targetWords.forEach((word) => {
      const regex = new RegExp(`\\b(${word})\\b`, "gi");
      result = result.replace(
        regex,
        `<span class="font-bold text-blue-600 underline decoration-2">${word}</span>`
      );
    });
    return <span dangerouslySetInnerHTML={{ __html: result }} />;
  }, [displayText, currentSentence?.targetWords, settings.studyMode]);

  // 키보드 이벤트
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goToNext();
      else if (e.key === "ArrowLeft") goToPrev();
      else if (e.key === " ") {
        e.preventDefault();
        handleRead();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrev, handleRead]);

  // 로컬스토리지에서 진행상태 복원
  useEffect(() => {
    const completed = new Set<number>();
    const studied = new Set<number>();

    sentences.forEach((sentence, index) => {
      const progress = getItemProgress(packId, dayNumber, sentence.id);
      if (progress?.completed) {
        completed.add(index);
        studied.add(index);
      }
    });

    setCompletedSentences(completed);
    setStudiedSentences(studied);
  }, [sentences, getItemProgress, packId, dayNumber]);

  if (!sentences.length) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-500">
          Day {dayNumber}에 학습할 문장이 없습니다
        </div>
      </div>
    );
  }

  if (!currentSentence) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-500">문장 데이터를 불러오는 중입니다...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 relative">
      {/* 헤더 영역 */}
      <div className="w-full max-w-2xl mx-auto mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">
              Day {dayNumber} - 문장 학습
            </h2>
            <p className="text-sm text-gray-500">
              {settings.studyMode === "immersive"
                ? "🧠 영어적 사고로 문장을 익혀보세요"
                : "💡 필요시 번역을 확인하며 학습하세요"}
            </p>
          </div>
          <button
            onClick={() => setIsSettingOpen((p) => !p)}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* 진행률 */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>학습 진행률</span>
            <span>
              {completedSentences.size} / {sentences.length} 완료
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            현재: {currentIndex + 1} / {sentences.length}
          </div>
        </div>
      </div>

      {/* 설정 패널 */}
      {isSettingOpen && (
        <div className="absolute top-20 right-4 left-4 z-20">
          <StudySettingsPanel
            packId={packId}
            showMeaningLabel="번역 표시 허용"
          />
        </div>
      )}

      {/* 메인 카드 */}
      <div
        className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-2xl mx-auto transition-transform active:scale-95 cursor-pointer"
        {...swipeHandlers}
        onClick={() => {
          if (
            settings.studyMode === "assisted" &&
            settings.showMeaningEnabled
          ) {
            handleToggleTranslation();
          }
        }}
      >
        {/* 영어 문장 */}
        <div className="text-center mb-8">
          <div className="text-2xl md:text-3xl font-medium text-gray-800 leading-relaxed mb-6">
            {highlightedSentence}
          </div>

          {/* 상황 설명 */}
          {currentSentence.situation && (
            <div className="text-sm text-blue-600 bg-blue-50 rounded-lg p-3 mb-4">
              상황: {currentSentence.situation}
            </div>
          )}

          {/* 번역 (도움 모드에서만 표시) */}
          {settings.studyMode === "assisted" && settings.showMeaningEnabled && (
            <div
              className={`transition-all duration-300 ${
                showTranslation
                  ? "opacity-100 max-h-32"
                  : "opacity-0 max-h-0 overflow-hidden"
              }`}
            >
              <div className="border-t pt-4 mt-4">
                <p className="text-lg text-gray-600">
                  {currentSentence.translation}
                </p>
              </div>
            </div>
          )}

          {/* 상태 표시 */}
          {completedSentences.has(currentIndex) ? (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm mt-4">
              <CheckCircle className="w-4 h-4" />
              학습 완료
            </div>
          ) : studiedSentences.has(currentIndex) ? (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm mt-4">
              <Eye className="w-4 h-4" />
              의미 확인됨
            </div>
          ) : null}

          {/* 힌트 메시지 */}
          {!showTranslation &&
            settings.studyMode === "assisted" &&
            settings.showMeaningEnabled && (
              <p className="text-sm text-gray-400 mt-4">터치하여 번역 보기</p>
            )}
          {settings.studyMode === "immersive" && (
            <p className="text-sm text-blue-600 mt-4">
              🧠 영어로 의미를 생각해보세요
            </p>
          )}
        </div>
      </div>

      {/* 컨트롤 버튼들 */}
      <div className="flex items-center gap-6 mt-8">
        {/* 듣기 버튼 */}
        <button
          onClick={handleRead}
          disabled={isSpeaking}
          className="p-4 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          title="듣기 (스페이스바)"
        >
          <Volume2 className="w-6 h-6" />
        </button>

        {/* 번역 보기 버튼 (도움 모드에서만) */}
        {settings.studyMode === "assisted" && settings.showMeaningEnabled && (
          <button
            onClick={handleToggleTranslation}
            className="p-4 bg-gray-200 text-gray-700 rounded-full shadow-lg hover:bg-gray-300 transition-colors"
            title="번역 보기/숨기기"
          >
            {showTranslation ? (
              <EyeOff className="w-6 h-6" />
            ) : (
              <Eye className="w-6 h-6" />
            )}
          </button>
        )}

        {/* 학습 완료/취소 버튼 */}
        {completedSentences.has(currentIndex) ? (
          <button
            onClick={handleMarkAsNotCompleted}
            className="p-4 bg-gray-500 text-white rounded-full shadow-lg hover:bg-gray-600 transition-colors"
            title="다시 학습하기"
          >
            <RotateCcw className="w-6 h-6" />
          </button>
        ) : (
          <button
            onClick={handleMarkAsCompleted}
            className="p-4 bg-green-500 text-white rounded-full shadow-lg hover:bg-green-600 transition-colors"
            title="학습 완료"
          >
            <CheckCircle className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* 페이지 인디케이터 */}
      <div className="flex items-center gap-2 mt-8">
        <button
          onClick={goToPrev}
          disabled={currentIndex === 0}
          className="p-2 rounded-full disabled:opacity-30 text-gray-500 hover:bg-gray-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex gap-2 mx-4">
          {sentences.map((sentence, index) => (
            <button
              key={sentence.id}
              onClick={() => {
                setCurrentIndex(index);
                setShowTranslation(false);
              }}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentIndex
                  ? "bg-blue-500 scale-110"
                  : completedSentences.has(index)
                  ? "bg-green-500"
                  : studiedSentences.has(index)
                  ? "bg-blue-300"
                  : "bg-gray-300"
              }`}
              title={
                completedSentences.has(index)
                  ? "완료"
                  : studiedSentences.has(index)
                  ? "의미 확인"
                  : "미완료"
              }
            />
          ))}
        </div>

        <button
          onClick={goToNext}
          disabled={currentIndex === sentences.length - 1}
          className="p-2 rounded-full disabled:opacity-30 text-gray-500 hover:bg-gray-100"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {/* 진행 카운터 */}
      <p className="text-sm text-gray-500 mt-4">
        {currentIndex + 1} / {sentences.length}
      </p>

      {/* 스와이프 힌트 */}
      <p className="text-xs text-gray-400 mt-2 text-center">
        좌우 스와이프 또는 화살표로 이동
      </p>

      {/* 전체 학습 완료 버튼 */}
      {isAllCompleted && (
        <div className="mt-8">
          <button
            onClick={handleCompleteMode}
            className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-8 py-3 rounded-full font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
          >
            문장 학습 완료하기
          </button>
        </div>
      )}
    </div>
  );
};

export default SentenceMode;
