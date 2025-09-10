import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface StudyNavigationProps {
  currentIndex: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}

export const StudyNavigation: React.FC<StudyNavigationProps> = ({
  currentIndex,
  total,
  onPrev,
  onNext,
}) => {
  return (
    <div className="flex items-center gap-3 mt-6">
      <button
        onClick={onPrev}
        disabled={currentIndex === 0}
        className="p-3 bg-white border border-gray-200 rounded-xl disabled:opacity-30"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <div className="flex-1 text-center text-sm font-medium text-gray-500">
        {currentIndex + 1} / {total}
      </div>
      <button
        onClick={onNext}
        disabled={currentIndex === total - 1}
        className="p-3 bg-white border border-gray-200 rounded-xl disabled:opacity-30"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
};

export default StudyNavigation;
