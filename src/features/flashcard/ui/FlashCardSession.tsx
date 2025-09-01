// src/features/flashcard/ui/FlashCardSession.tsx
import React, { useState, useCallback, useEffect, memo } from "react";
import { FlashCard } from "./FlashCard";
import { VocaItem } from "@/entities";
import { CheckCircle, RotateCcw, TrendingUp, Clock } from "lucide-react";

export interface FlashCardSessionProps {
  items: VocaItem[];
  onComplete: (results: {
    correct: number;
    total: number;
    timeSpent: number;
  }) => void;
  className?: string;
  autoPlayAudio?: boolean;
}

interface SessionStats {
  known: number;
  unknown: number;
  skipped: number;
  timeSpent: number;
}

export const FlashCardSession = memo<FlashCardSessionProps>(
  ({ items, onComplete, className = "", autoPlayAudio = false }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showTranslation, setShowTranslation] = useState(false);
    const [isSessionComplete, setIsSessionComplete] = useState(false);
    const [sessionStartTime] = useState(Date.now());
    const [stats, setStats] = useState<SessionStats>({
      known: 0,
      unknown: 0,
      skipped: 0,
      timeSpent: 0,
    });
    const [cardResults, setCardResults] = useState<
      Map<number, "known" | "unknown" | "skipped">
    >(new Map());

    const currentItem = items[currentIndex];
    const progress = Math.round(((currentIndex + 1) / items.length) * 100);
    const isLastCard = currentIndex === items.length - 1;

    // 세션 완료 처리
    const handleCompleteSession = useCallback(() => {
      const timeSpent = Math.round((Date.now() - sessionStartTime) / 1000);
      const updatedStats = { ...stats, timeSpent };

      setStats(updatedStats);
      setIsSessionComplete(true);

      onComplete({
        correct: updatedStats.known,
        total: items.length,
        timeSpent,
      });
    }, [stats, sessionStartTime, onComplete, items.length]);

    // 답변 처리
    const handleAnswer = useCallback(
      (result: "known" | "unknown" | "skipped") => {
        const newResults = new Map(cardResults);
        newResults.set(currentIndex, result);
        setCardResults(newResults);

        const newStats = { ...stats };

        // 이전 결과가 있다면 취소
        const previousResult = cardResults.get(currentIndex);
        if (previousResult) {
          newStats[previousResult]--;
        }

        // 새로운 결과 추가
        newStats[result]++;
        setStats(newStats);

        if (isLastCard) {
          setTimeout(handleCompleteSession, 1000);
        } else {
          setTimeout(() => {
            setCurrentIndex((prev) => prev + 1);
            setShowTranslation(false);
          }, 500);
        }
      },
      [currentIndex, cardResults, stats, isLastCard, handleCompleteSession]
    );

    // 네비게이션 핸들러
    const handleNext = useCallback(() => {
      if (currentIndex < items.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        setShowTranslation(false);
      }
    }, [currentIndex, items.length]);

    const handlePrevious = useCallback(() => {
      if (currentIndex > 0) {
        setCurrentIndex((prev) => prev - 1);
        setShowTranslation(false);
      }
    }, [currentIndex]);

    const handleToggleTranslation = useCallback(() => {
      setShowTranslation((prev) => !prev);
    }, []);

    // 키보드 단축키
    useEffect(() => {
      const handleKeyPress = (event: KeyboardEvent) => {
        if (isSessionComplete) return;

        switch (event.key) {
          case "1":
            event.preventDefault();
            handleAnswer("known");
            break;
          case "2":
            event.preventDefault();
            handleAnswer("unknown");
            break;
          case "0":
            event.preventDefault();
            handleAnswer("skipped");
            break;
          case "r":
          case "R":
            event.preventDefault();
            handleCompleteSession();
            break;
        }
      };

      window.addEventListener("keydown", handleKeyPress);
      return () => window.removeEventListener("keydown", handleKeyPress);
    }, [isSessionComplete, handleAnswer, handleCompleteSession]);

    if (isSessionComplete) {
      const accuracy =
        items.length > 0 ? Math.round((stats.known / items.length) * 100) : 0;
      const avgTimePerCard =
        items.length > 0 ? Math.round(stats.timeSpent / items.length) : 0;

      return (
        <div className={`flashcard-session-complete ${className}`}>
          <div className="max-w-lg mx-auto text-center p-8">
            {/* 완료 아이콘 */}
            <div className="mb-6">
              <CheckCircle size={64} className="mx-auto text-green-500 mb-4" />
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                세션 완료!
              </h2>
              <p className="text-gray-600">
                총 {items.length}개 중 {stats.known}개를 기억하셨습니다.
              </p>
            </div>

            {/* 통계 */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-700">
                  {stats.known}
                </div>
                <div className="text-sm text-green-600">알고 있음</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-red-700">
                  {stats.unknown}
                </div>
                <div className="text-sm text-red-600">모르겠음</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-700">
                  {accuracy}%
                </div>
                <div className="text-sm text-blue-600">정확도</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-700">
                  {avgTimePerCard}초
                </div>
                <div className="text-sm text-purple-600">카드당 평균</div>
              </div>
            </div>

            {/* 총 소요 시간 */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <div className="flex items-center justify-center gap-2 text-gray-700">
                <Clock size={20} />
                <span>
                  총 소요 시간: {Math.floor(stats.timeSpent / 60)}분{" "}
                  {stats.timeSpent % 60}초
                </span>
              </div>
            </div>

            {/* 액션 버튼 */}
            <div className="space-y-3">
              <button
                onClick={() => {
                  setIsSessionComplete(false);
                  setCurrentIndex(0);
                  setShowTranslation(false);
                  setStats({ known: 0, unknown: 0, skipped: 0, timeSpent: 0 });
                  setCardResults(new Map());
                }}
                className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw size={18} />
                다시 시작하기
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (!currentItem) {
      return (
        <div className="text-center p-8">
          <p className="text-gray-600">학습할 카드가 없습니다.</p>
        </div>
      );
    }

    return (
      <div className={`flashcard-session ${className}`}>
        {/* 진행률 및 통계 */}
        <div className="max-w-lg mx-auto mb-6">
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-gray-600">
              {currentIndex + 1} / {items.length}
            </div>
            <div className="text-sm font-semibold">{progress}%</div>
          </div>

          {/* 진행률 바 */}
          <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* 실시간 통계 */}
          <div className="flex justify-center gap-6 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>{stats.known} 알음</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>{stats.unknown} 모름</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              <span>{stats.skipped} 스킵</span>
            </div>
          </div>
        </div>

        {/* 플래시카드 */}
        <FlashCard
          item={currentItem}
          showTranslation={showTranslation}
          onToggleTranslation={handleToggleTranslation}
          onNext={handleNext}
          onPrevious={handlePrevious}
          showControls={false}
          autoPlayAudio={autoPlayAudio}
        />

        {/* 답변 버튼 */}
        <div className="max-w-lg mx-auto mt-8">
          <div className="flex gap-3">
            <button
              onClick={() => handleAnswer("unknown")}
              className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
              title="키보드: 2"
            >
              모르겠어요 (2)
            </button>
            <button
              onClick={() => handleAnswer("skipped")}
              className="px-6 py-3 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-colors"
              title="키보드: 0"
            >
              스킵 (0)
            </button>
            <button
              onClick={() => handleAnswer("known")}
              className="flex-1 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
              title="키보드: 1"
            >
              알고 있어요 (1)
            </button>
          </div>

          {/* 키보드 단축키 안내 */}
          <div className="mt-4 text-center text-xs text-gray-500">
            <p>키보드: 1 (알음) | 2 (모름) | 0 (스킵) | R (완료)</p>
          </div>
        </div>
      </div>
    );
  }
);

FlashCardSession.displayName = "FlashCardSession";
