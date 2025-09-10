// src/components/workbook/MobileHeader.tsx
import React, { memo, useState } from "react";
import { Settings, ArrowLeft } from "lucide-react";
import { ProgressBar } from "./ProgressBar";

interface MobileHeaderProps {
  category: string;
  dayNumber: number;
  progress: number;
  answeredCount: number;
  totalCount: number;
  score: number;
}

export const MobileHeader = memo<MobileHeaderProps>(
  ({ category, dayNumber, progress, answeredCount, totalCount, score }) => {
    return (
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <button className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{category}</h2>
            <p className="text-sm text-gray-600">Day {dayNumber}</p>
          </div>
        </div>

        <div className="mt-3">
          <ProgressBar
            progress={progress}
            answeredCount={answeredCount}
            totalCount={totalCount}
            score={score}
          />
        </div>
      </div>
    );
  }
);

MobileHeader.displayName = "MobileHeader";
