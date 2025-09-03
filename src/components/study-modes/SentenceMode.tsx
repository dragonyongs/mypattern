// src/components/study-modes/SentenceMode.tsx
import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Volume2,
  CheckCircle,
  RotateCcw,
  Eye,
} from "lucide-react";
import { useSwipeGesture } from "@/shared/hooks/useSwipeGesture";
import { useTTS } from "@/shared/hooks/useTTS";
import { useDayProgress } from "@/shared/hooks/useAppHooks";
import { useStudyProgressStore } from "@/stores/studyProgressStore";

interface SentenceItem {
  id?: string;
  text?: string;
  sentence?: string; // 호환성
  translation: string;
  targetWords: string[];
  situation?: string;
}

interface SentenceModeProps {
  sentences: SentenceItem[];
  dayNumber: number;
  category: string;
  packId?: string;
  onComplete?: () => void;
}

interface CompletionModalProps {
  isOpen: boolean;
  totalSentences: number;
  onReview: () => void;
  onNext: () => void;
  onClose: () => void;
}

const CompletionModal: React.FC<CompletionModalProps> = ({
  isOpen,
  totalSentences,
  onReview,
  onNext,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-auto shadow-xl">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>

          <h3 className="text-xl font-bold text-gray-800 mb-2">
            문장 학습 완료!
          </h3>

          <p className="text-gray-600 mb-6">
            총 {totalSentences}개 문장을 학습했습니다.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onReview}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              다시 학습
            </button>

            <button
              onClick={onNext}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              워크북 풀기
            </button>
          </div>

          <button
            onClick={onClose}
            className="mt-3 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            달력으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
};

export const SentenceMode: React.FC<SentenceModeProps> = ({
  sentences,
  dayNumber,
  category,
  packId,
  onComplete,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showTranslation, setShowTranslation] = useState(false);
  const [readSentences, setReadSentences] = useState<Set<number>>(new Set());
  const [showCompletion, setShowCompletion] = useState(false);
  const { setItemCompleted, getCompletedItems } = useStudyProgressStore();
  const [completedSentences, setCompletedSentences] = useState<Set<string>>(
    new Set()
  );
  const [totalCompleted, setTotalCompleted] = useState(0);

  const { speak, isSpeaking } = useTTS();
  const { markModeCompleted } = useDayProgress(packId, dayNumber);

  // 안정적인 sentenceId 배열 생성 (원본 id가 없으면 fallback id 사용)
  const sentenceIds = useMemo(
    () =>
      sentences.map((s, i) =>
        s.id && s.id.length > 0
          ? s.id
          : `pack:${packId ?? "unknown"}:day:${dayNumber}:sent:${i}`
      ),
    [sentences, packId, dayNumber]
  );

  const localBackupKey = useMemo(
    () => `sp:${packId ?? "nopack"}:d${dayNumber}:sents`,
    [packId, dayNumber]
  );

  // 컴포넌트 마운트 시 이전 상태 복원 (스토어 + localStorage 백업 병합)
  useEffect(() => {
    if (!sentenceIds || sentenceIds.length === 0) return;

    // 1) 스토어에서 복원
    const storeItems = getCompletedItems(packId, dayNumber) || {};
    const fromStore = new Set(
      sentenceIds.filter((id) => !!(storeItems[id] && storeItems[id].completed))
    );

    // 2) localStorage 백업 병합 (스토어가 비어있을 때 대비)
    try {
      const raw = localStorage.getItem(localBackupKey);
      if (raw) {
        const parsed: string[] = JSON.parse(raw);
        parsed.forEach((id) => {
          if (sentenceIds.includes(id)) fromStore.add(id);
        });
      }
    } catch (e) {
      console.warn("local backup read failed", e);
    }

    setCompletedSentences(fromStore);
    setTotalCompleted(fromStore.size);

    console.log(
      `📖 문장 학습 상태 복원: ${fromStore.size}/${sentenceIds.length} 완료`
    );
  }, [sentenceIds, packId, dayNumber, getCompletedItems, localBackupKey]);

  const currentItem = useMemo(
    () => sentences[currentIndex],
    [sentences, currentIndex]
  );

  const progress = useMemo(() => {
    return sentences.length > 0
      ? ((currentIndex + 1) / sentences.length) * 100
      : 0;
  }, [currentIndex, sentences.length]);

  const isAllRead = useMemo(() => {
    return readSentences.size === sentences.length && sentences.length > 0;
  }, [readSentences.size, sentences.length]);

  // Target Words 하이라이팅 (기존 로직 유지)
  const renderHighlightedSentence = useCallback(
    (text: string, targetWords: string[]) => {
      if (!targetWords || targetWords.length === 0) {
        return <span>{text}</span>;
      }

      let highlightedText = text;
      targetWords.forEach((word) => {
        const regex = new RegExp(
          `\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
          "gi"
        );
        highlightedText = highlightedText.replace(
          regex,
          `<mark class="bg-blue-200 text-blue-800 font-semibold px-1 rounded">${word}</mark>`
        );
      });

      return <span dangerouslySetInnerHTML={{ __html: highlightedText }} />;
    },
    []
  );

  // 로컬 백업 저장 유틸
  const saveLocalBackup = useCallback(
    (setOfIds: Set<string>) => {
      try {
        localStorage.setItem(
          localBackupKey,
          JSON.stringify(Array.from(setOfIds.values()))
        );
      } catch (e) {
        console.warn("local backup save failed", e);
      }
    },
    [localBackupKey]
  );

  useEffect(() => {
    if (!sentenceIds || sentenceIds.length === 0) return;

    // 1) store에서 복원 (유연하게 처리)
    let mergedIds = new Set<string>();
    try {
      const storeItems = getCompletedItems(packId, dayNumber);
      if (storeItems) {
        if (Array.isArray(storeItems)) {
          storeItems.forEach((id) => mergedIds.add(id));
        } else if (typeof storeItems === "object") {
          // storeItems가 { id: { completed: true } } 같은 형태일 수 있음
          Object.keys(storeItems).forEach((k) => {
            // 내부 값이 객체/불리언이면 존재하면 추가
            if (storeItems[k]) mergedIds.add(k);
          });
        }
      }
    } catch (e) {
      console.warn("getCompletedItems error", e);
    }

    // 2) local backup 병합 (구 포맷: 배열)
    try {
      const raw = localStorage.getItem(localBackupKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((id) => mergedIds.add(id));
        } else if (parsed && typeof parsed === "object") {
          // 혹시 object-map 형식으로 들어있다면 key들을 병합
          Object.keys(parsed).forEach((k) => {
            if (parsed[k]) mergedIds.add(k);
          });
        }
      }
    } catch (e) {
      console.warn("local backup read failed", e);
    }

    // 3) 상태 반영: ID 집합 + 인덱스 집합(UI용)
    setCompletedSentences(mergedIds);
    setTotalCompleted(mergedIds.size);

    const idxSet = new Set<number>();
    mergedIds.forEach((id) => {
      const idx = sentenceIds.indexOf(id);
      if (idx >= 0) idxSet.add(idx);
    });
    setReadSentences(idxSet);
    // console.log 복원 상태
    console.log(
      `Restored completed sentences: ${mergedIds.size} / ${sentenceIds.length}`
    );
  }, [sentenceIds, packId, dayNumber, getCompletedItems, localBackupKey]);

  // 스토어 + 로컬 저장을 캡슐화
  const persistCompleted = useCallback(
    (sentenceId: string) => {
      // 1) 스토어 저장 시도
      try {
        setItemCompleted(packId, dayNumber, sentenceId, true);
      } catch (e) {
        console.warn("setItemCompleted failed", e);
      }

      // 2) 로컬/상태 갱신 (함수형 업데이트)
      setCompletedSentences((prev) => {
        if (prev.has(sentenceId)) return prev;
        const newSet = new Set(prev);
        newSet.add(sentenceId);
        saveLocalBackup(newSet);
        setTotalCompleted(newSet.size);

        // UI 인덱스도 갱신
        const idx = sentenceIds.indexOf(sentenceId);
        if (idx >= 0) {
          setReadSentences((prevIdx) => {
            const newIdx = new Set(prevIdx);
            newIdx.add(idx);
            return newIdx;
          });
        }

        return newSet;
      });
    },
    [packId, dayNumber, setItemCompleted, saveLocalBackup, sentenceIds]
  );

  // 🎯 문장 완료 처리 (함수형 업데이트로 stale closure 방지)
  const handleSentenceCompleted = useCallback(
    (sentenceId: string) => {
      setCompletedSentences((prev) => {
        if (prev.has(sentenceId)) return prev;
        const newSet = new Set(prev);
        newSet.add(sentenceId);

        // 스토어/로컬에 저장
        try {
          setItemCompleted(packId, dayNumber, sentenceId, true);
        } catch (e) {
          console.warn("setItemCompleted failed", e);
        }
        saveLocalBackup(newSet);
        setTotalCompleted(newSet.size);

        // 모든 문장 완료 시 onComplete 호출
        if (newSet.size === sentenceIds.length) {
          console.log("🎉 모든 문장 학습 완료!");
          onComplete?.();
        }

        return newSet;
      });
    },
    [
      packId,
      dayNumber,
      setItemCompleted,
      saveLocalBackup,
      onComplete,
      sentenceIds.length,
    ]
  );

  // 현재 문장 id 계산
  const getSentenceIdByIndex = useCallback(
    (index: number) => sentenceIds[index],
    [sentenceIds]
  );

  // 현재 문장 완료 여부 확인
  const currentSentence = sentences[currentIndex];
  const currentSentenceId = currentSentence
    ? getSentenceIdByIndex(currentIndex)
    : undefined;
  const isCurrentCompleted =
    currentSentenceId && completedSentences.has(currentSentenceId);

  // 문장 카드 클릭: 번역 토글 / 번역이 이미 보이면 완료 처리
  const handleCardClick = useCallback(() => {
    if (!showTranslation) {
      setShowTranslation(true);
      // 번역 보기 자체를 '읽음'으로 처리하고 싶다면 아래 주석 해제
      if (currentSentenceId) {
        // 읽음 상태 저장
        persistCompleted(currentSentenceId);
        setReadSentences((prev) => {
          const s = new Set(prev);
          s.add(currentIndex);
          return s;
        });
      }
    } else {
      // 번역이 이미 보여진 상태에서 다시 클릭하면 '완료' 처리
      if (currentSentenceId && !isCurrentCompleted) {
        handleSentenceCompleted(currentSentenceId);
      }
    }
  }, [
    showTranslation,
    currentIndex,
    currentSentenceId,
    isCurrentCompleted,
    handleSentenceCompleted,
    persistCompleted,
  ]);

  // 문장 보기(터치 등) - 읽음 처리 및 저장
  const handleSentenceView = useCallback(() => {
    setReadSentences((prev) => {
      const newRead = new Set(prev);
      newRead.add(currentIndex);
      return newRead;
    });
    setShowTranslation((prev) => !prev);

    if (currentSentenceId) {
      persistCompleted(currentSentenceId);
    }
  }, [currentIndex, currentSentenceId, persistCompleted]);

  // 네비게이션
  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => {
      const next = Math.min(prev + 1, sentences.length - 1);
      return next;
    });
    setShowTranslation(false);
  }, [sentences.length]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => {
      const next = Math.max(prev - 1, 0);
      return next;
    });
    setShowTranslation(false);
  }, []);

  // 스와이프
  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: goToNext,
    onSwipeRight: goToPrev,
  });

  // TTS 재생 -> 재생 시에도 읽음으로 처리
  const handleSpeak = useCallback(
    (text: string) => {
      if (!text) return;
      speak(text, { lang: "en-US", rate: 0.9 });
      setReadSentences((prev) => {
        const s = new Set(prev);
        s.add(currentIndex);
        return s;
      });

      if (currentSentenceId) {
        persistCompleted(currentSentenceId);
      }
    },
    [speak, currentIndex, currentSentenceId, persistCompleted]
  );

  // 모드 전체 완료 처리 (UI용)
  const handleComplete = useCallback(() => {
    // day progress에 완료 마킹 (store의 API에 따라 packId 포함 여부가 다를 수 있으니 맞춰 사용)
    try {
      markModeCompleted(dayNumber, "sentence");
    } catch (e) {
      console.warn("markModeCompleted failed", e);
    }
    setShowCompletion(true);
  }, [markModeCompleted, dayNumber]);

  // 모든 문장 읽음 체크 -> 완료 처리
  useEffect(() => {
    if (isAllRead && !showCompletion) {
      handleComplete();
    }
  }, [isAllRead, showCompletion, handleComplete]);

  // 모달 핸들러
  const handleReview = useCallback(() => {
    setCurrentIndex(0);
    setShowTranslation(false);
    setReadSentences(new Set());
    setShowCompletion(false);
    // 리뷰를 위해 스토어에서 완료 초기화할 필요가 있으면 추가 가능
  }, []);

  // 다음 문장 (모달에서 워크북 이동 버튼 연결용)
  const handleNext = useCallback(() => {
    if (currentIndex < sentences.length - 1) {
      setCurrentIndex((prev) => Math.min(prev + 1, sentences.length - 1));
      setShowTranslation(false);
    }
  }, [currentIndex, sentences.length]);

  const handleClose = useCallback(() => {
    setShowCompletion(false);
  }, []);

  if (!sentences.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            Day {dayNumber}에 학습할 문장이 없습니다
          </h3>
          <p className="text-gray-500">다른 날짜를 선택해주세요</p>
        </div>
      </div>
    );
  }

  if (!currentItem) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  const sentenceText = currentItem.text || currentItem.sentence || "";

  return (
    <>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* 헤더 */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-gray-800 mb-2">
            Day {dayNumber} - {category}
          </h1>
          <p className="text-sm text-gray-600 mb-4">
            문장을 읽고 Target Words를 확인하세요
          </p>

          {/* 진행률 바 */}
          <div className="w-full max-w-md mx-auto bg-gray-200 rounded-full h-2 mb-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">
            {currentIndex + 1} / {sentences.length}
          </p>
        </div>

        {/* 문장 카드 */}
        <div className="flex justify-center mb-8">
          <div
            className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-2xl mx-auto cursor-pointer transition-all duration-200 active:scale-98 hover:shadow-xl"
            onClick={handleSentenceView}
            {...swipeHandlers}
          >
            <div className="text-center">
              {/* 영어 문장 */}
              <div className="mb-6">
                <p className="text-xl md:text-2xl font-medium text-gray-800 leading-relaxed mb-4">
                  {renderHighlightedSentence(
                    sentenceText,
                    currentItem.targetWords
                  )}
                </p>

                {/* 상황 설명 */}
                {currentItem.situation && (
                  <p className="text-sm text-gray-500 italic mb-4 bg-gray-50 px-3 py-2 rounded-lg">
                    상황: {currentItem.situation}
                  </p>
                )}

                {/* TTS 버튼 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSpeak(sentenceText);
                  }}
                  disabled={isSpeaking}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors disabled:opacity-50"
                >
                  {isSpeaking ? (
                    <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                  문장 듣기
                </button>
              </div>

              {/* 한글 번역 (조건부 표시) */}
              <div
                className={`transition-all duration-300 ${
                  showTranslation
                    ? "opacity-100 max-h-32 mb-4"
                    : "opacity-0 max-h-0 overflow-hidden"
                }`}
              >
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-lg text-gray-700 leading-relaxed">
                    {currentItem.translation}
                  </p>
                </div>
              </div>

              {/* 힌트 */}
              {!showTranslation && (
                <div className="mt-6">
                  <div className="flex items-center justify-center gap-2 text-gray-400 mb-2">
                    <Eye className="w-4 h-4" />
                    <span className="text-sm">터치하여 해석 보기</span>
                  </div>
                </div>
              )}

              {/* Target Words 표시 */}
              {currentItem.targetWords &&
                currentItem.targetWords.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-2">Target Words</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {currentItem.targetWords.map((word, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded-full"
                        >
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {/* 학습 완료 표시 */}
              {readSentences.has(currentIndex) && (
                <div className="mt-4 flex items-center justify-center gap-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">학습 완료</span>
                </div>
              )}
            </div>
          </div>
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
          <div className="flex gap-2 flex-wrap justify-center max-w-xs">
            {sentences.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentIndex(index);
                  setShowTranslation(false);
                }}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentIndex
                    ? "bg-green-500 scale-110"
                    : readSentences.has(index)
                    ? "bg-green-400"
                    : "bg-gray-300"
                }`}
              />
            ))}
          </div>

          <button
            onClick={goToNext}
            disabled={currentIndex === sentences.length - 1}
            className="flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-md disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-lg transition-all"
          >
            <ArrowRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* 스와이프 힌트 */}
        <div className="text-center text-xs text-gray-400 mb-4">
          <p className="hidden sm:block">좌우 스와이프 또는 화살표로 이동</p>
          <p className="sm:hidden">좌우 스와이프로 이동</p>
        </div>

        {/* 학습 완료 버튼 (모든 문장 확인 시) */}
        {isAllRead && (
          <div className="text-center">
            <button
              onClick={handleComplete}
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors"
            >
              <CheckCircle className="w-5 h-5" />
              문장 학습 완료
            </button>
          </div>
        )}
      </div>

      {/* 완료 모달 */}
      <CompletionModal
        isOpen={showCompletion}
        totalSentences={sentences.length}
        onReview={handleReview}
        onNext={handleNext}
        onClose={handleClose}
      />
    </>
  );
};
