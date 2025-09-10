// src/shared/components/ProgressDots.tsx
import React, { memo, useMemo } from "react";

export type ProgressDotsProps = {
  total: number;
  currentIndex: number;
  // 상태 셋: 필요한 것만 전달
  completed?: Set<number>; // 예: 단어/문장에서 mastered
  secondary?: Set<number>; // 예: 단어/문장에서 studied 등 보조 상태가 있으면
  correct?: Set<number>; // 예: 워크북 정답
  answered?: Set<number>; // 예: 워크북 답변됨(오답 포함)
  onIndexChange?: (index: number) => void;
  className?: string;
};

const ProgressDots = memo(
  ({
    total,
    currentIndex,
    completed,
    secondary,
    correct,
    answered,
    onIndexChange,
    className,
  }: ProgressDotsProps) => {
    const dots = useMemo(() => Array.from({ length: total }), [total]);

    const getClass = (idx: number) => {
      if (idx === currentIndex) return "w-8 bg-indigo-600";
      if (correct && correct.has(idx)) return "w-1.5 bg-green-500";
      if (answered && answered.has(idx)) return "w-1.5 bg-red-400";
      if (completed && completed.has(idx)) return "w-1.5 bg-green-500";
      if (secondary && secondary.has(idx)) return "w-1.5 bg-amber-400";
      return "w-1.5 bg-gray-300 hover:bg-gray-400";
    };

    return (
      <div
        className={`flex items-center justify-center gap-2 my-6 ${
          className || ""
        }`}
      >
        {dots.map((_, idx) => (
          <button
            key={idx}
            aria-label={`Go to ${idx + 1}`}
            onClick={() => onIndexChange?.(idx)}
            className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${getClass(
              idx
            )}`}
          />
        ))}
      </div>
    );
  }
);

ProgressDots.displayName = "ProgressDots";
export default ProgressDots;
