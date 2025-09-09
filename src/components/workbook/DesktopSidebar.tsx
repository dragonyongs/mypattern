// src/components/workbook/DesktopSidebar.tsx
import React, { memo } from "react";
import { StudySettingsPanel } from "@/shared/components/StudySettingsPanel";
import { ProgressBar } from "./ProgressBar";
import type { WorkbookItem } from "@/types/workbook.types";

interface DesktopSidebarProps {
  category: string;
  dayNumber: number;
  progress: number;
  score: number;
  workbook: WorkbookItem[];
  currentIndex: number;
  answeredQuestions: Set<number>;
  correctAnswers: Set<number>;
  settings: any;
  onIndexChange: (index: number) => void;
  onModeChange: (mode: "immersive" | "assisted") => void;
  onAutoProgressChange: (enabled: boolean) => void;
}

export const DesktopSidebar = memo<DesktopSidebarProps>(
  ({
    category,
    dayNumber,
    progress,
    score,
    workbook,
    currentIndex,
    answeredQuestions,
    correctAnswers,
    settings,
    onIndexChange,
    onModeChange,
    onAutoProgressChange,
  }) => {
    return (
      <div className="hidden lg:block w-80 bg-white">
        <div className="p-6 h-full overflow-y-auto">
          {/* 헤더 정보 */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              {category}
            </h2>
            <p className="text-sm text-gray-600">Day {dayNumber}</p>
          </div>

          {/* 진행률 */}
          <div className="mb-6">
            <ProgressBar
              progress={progress}
              answeredCount={answeredQuestions.size}
              totalCount={workbook.length}
              score={score}
            />
          </div>

          {/* 학습 현황 그리드 */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              문제 현황
            </h3>
            <div className="grid grid-cols-6 gap-2">
              {workbook.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => onIndexChange(idx)}
                  className={`aspect-square rounded-lg text-xs font-semibold transition-all ${
                    idx === currentIndex
                      ? "bg-indigo-600 text-white shadow-md scale-110"
                      : correctAnswers.has(idx)
                      ? "bg-green-100 text-green-600 hover:bg-green-200"
                      : answeredQuestions.has(idx)
                      ? "bg-red-100 text-red-600 hover:bg-red-200"
                      : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                  }`}
                  title={
                    correctAnswers.has(idx)
                      ? "정답"
                      : answeredQuestions.has(idx)
                      ? "오답"
                      : "미완료"
                  }
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>

          {/* 학습 모드 설정 */}
          <div className="pt-6 border-t border-gray-200">
            <StudySettingsPanel
              settings={settings}
              handleModeChange={onModeChange}
              handleAutoProgressChange={onAutoProgressChange}
            />
          </div>
        </div>
      </div>
    );
  }
);

DesktopSidebar.displayName = "DesktopSidebar";
