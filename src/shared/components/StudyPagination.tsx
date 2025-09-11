// src/shared/components/StudyPagination.tsx
import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface StudyPaginationProps {
  currentIndex: number;
  totalItems: number;

  // 기존 호환성 (boolean[])
  completedItems?: boolean[];

  // ProgressDots 기능 추가 (Set 기반)
  completed?: Set<number>; // 예: 단어/문장에서 mastered
  secondary?: Set<number>; // 예: 단어/문장에서 studied
  correct?: Set<number>; // 예: 워크북 정답
  answered?: Set<number>; // 예: 워크북 답변됨(오답 포함)

  // 네비게이션 콜백
  onPrev?: () => void;
  onNext?: () => void;
  onIndexChange?: (index: number) => void; // 점 클릭 이동

  className?: string;
}

const StudyPagination: React.FC<StudyPaginationProps> = React.memo(
  ({
    currentIndex,
    totalItems,
    completedItems,
    completed,
    secondary,
    correct,
    answered,
    onPrev,
    onNext,
    onIndexChange,
    className = "",
  }) => {
    const getDotClass = (idx: number) => {
      const isCurrent = idx === currentIndex;

      // 현재 인덱스
      if (isCurrent) return "w-6 bg-indigo-600";

      // Set 기반 상태 체크 (ProgressDots 로직)
      if (correct && correct.has(idx)) return "w-2 bg-green-500";
      if (answered && answered.has(idx) && !(correct && correct.has(idx)))
        return "w-2 bg-red-400";
      if (completed && completed.has(idx)) return "w-2 bg-green-500";
      if (secondary && secondary.has(idx)) return "w-2 bg-amber-400";

      // boolean[] 기반 상태 체크 (기존 호환성)
      if (completedItems && completedItems[idx]) return "w-2 bg-green-500";

      // 기본 상태
      return "w-2 bg-gray-200 hover:bg-gray-300";
    };

    const renderDot = (idx: number) => {
      const dotClass = getDotClass(idx);

      return (
        <div
          key={idx}
          title={`${idx + 1} / ${totalItems}`}
          className={`h-2 rounded-full transition-all duration-300 ${dotClass} ${
            onIndexChange ? "cursor-pointer" : "cursor-default"
          }`}
          onClick={() => onIndexChange?.(idx)}
        />
      );
    };

    const renderDots = () => {
      const maxVisible = 20;

      if (totalItems <= maxVisible) {
        // 전체 표시
        return Array.from({ length: totalItems }, (_, i) => renderDot(i));
      }

      // 축약 표시
      const start = Math.max(0, currentIndex - 5);
      const end = Math.min(totalItems, currentIndex + 6);
      const parts: React.ReactNode[] = [];

      if (start > 0) {
        parts.push(
          <span
            key="start-ellipsis"
            className="px-1 text-xs text-gray-400 select-none"
          >
            •••
          </span>
        );
      }

      for (let i = start; i < end; i++) {
        parts.push(renderDot(i));
      }

      if (end < totalItems) {
        parts.push(
          <span
            key="end-ellipsis"
            className="px-1 text-xs text-gray-400 select-none"
          >
            •••
          </span>
        );
      }

      return parts;
    };

    return (
      <div
        className={`flex items-center justify-between gap-3 mt-4 ${className}`}
      >
        {/* 왼쪽 화살표 */}
        {onPrev && (
          <button
            type="button"
            disabled={currentIndex === 0}
            onClick={onPrev}
            aria-label="이전"
            className="p-3 bg-white border border-gray-200 rounded-xl disabled:opacity-30"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
        )}

        {/* 가운데 점들 */}
        <div className="flex items-center gap-1 flex-1 justify-center">
          {renderDots()}
        </div>

        {/* 오른쪽 화살표 */}
        {onNext && (
          <button
            type="button"
            disabled={currentIndex === totalItems - 1}
            onClick={onNext}
            aria-label="다음"
            className="p-3 bg-white border border-gray-200 rounded-xl disabled:opacity-30"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        )}
      </div>
    );
  }
);

StudyPagination.displayName = "StudyPagination";
export default StudyPagination;
