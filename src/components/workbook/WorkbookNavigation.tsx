// src/components/workbook/WorkbookNavigation.tsx
import React, { memo } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface WorkbookNavigationProps {
  currentIndex: number;
  totalCount: number;
  onPrev: () => void;
  onNext: () => void;
}

export const WorkbookNavigation = memo<WorkbookNavigationProps>(
  ({ currentIndex, totalCount, onPrev, onNext }) => {
    return (
      <>
        {/* 네비게이션 버튼 */}
        <div className="flex items-center gap-4 mt-6">
          <button
            onClick={onPrev}
            disabled={currentIndex === 0}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium transition-all hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" />
            이전
          </button>

          <div className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-600">
            {currentIndex + 1} / {totalCount}
          </div>

          <button
            onClick={onNext}
            disabled={currentIndex >= totalCount - 1}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium transition-all hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            다음
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* 스와이프 힌트 */}
        <div className="text-center text-xs text-gray-400 mt-4">
          좌우 스와이프 또는 화살표로 이동
        </div>
      </>
    );
  }
);

WorkbookNavigation.displayName = "WorkbookNavigation";
