// src/shared/components/StudyPagination.tsx
import React from "react";

interface StudyPaginationProps {
  currentIndex: number;
  totalItems: number;
  completedItems: boolean[]; // 🔥 완료된 아이템 배열 추가
}

export const StudyPagination: React.FC<StudyPaginationProps> = React.memo(
  ({ currentIndex, totalItems, completedItems }) => {
    const generateDots = () => {
      const maxVisibleDots = 20;

      if (totalItems <= maxVisibleDots) {
        // 전체 표시
        return Array.from({ length: totalItems }, (_, index) => (
          <div
            key={index}
            className={`rounded-full transition-all duration-300 ${
              index === currentIndex
                ? "w-3 h-3 bg-blue-600" // 🔥 현재 인덱스는 더 크게
                : completedItems[index]
                ? "w-2 h-2 bg-green-400" // 🔥 완료된 아이템은 파란색
                : "w-2 h-2 bg-gray-300"
            }`}
          />
        ));
      } else {
        // 현재 위치 중심으로 일부만 표시 + 점선
        const dots = [];
        const start = Math.max(0, currentIndex - 5);
        const end = Math.min(totalItems, currentIndex + 6);

        if (start > 0) {
          dots.push(
            <span key="start-dots" className="text-blue-500 text-sm">
              •••
            </span>
          );
        }

        for (let i = start; i < end; i++) {
          dots.push(
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === currentIndex
                  ? "w-3 h-3 bg-blue-600"
                  : completedItems[i]
                  ? "w-2 h-2 bg-blue-400"
                  : "w-2 h-2 bg-gray-300"
              }`}
            />
          );
        }

        if (end < totalItems) {
          dots.push(
            <span key="end-dots" className="text-blue-500 text-sm">
              •••
            </span>
          );
        }

        return dots;
      }
    };

    return (
      <div className="flex items-center justify-center gap-1 mb-8">
        {generateDots()}
      </div>
    );
  }
);

StudyPagination.displayName = "StudyPagination";
