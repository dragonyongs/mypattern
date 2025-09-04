// src/shared/components/StudySettingsPanel.tsx

import React from "react";
import { Brain, Lightbulb, Zap } from "lucide-react";
import type { StudySettings } from "@/types"; // settings 타입 임포트

interface StudySettingsPanelProps {
  settings: StudySettings;
  handleModeChange: (mode: "assisted" | "immersive") => void;
  handleAutoProgressChange: (enabled: boolean) => void;
}

export const StudySettingsPanel: React.FC<StudySettingsPanelProps> = ({
  settings,
  handleModeChange,
  handleAutoProgressChange,
}) => {
  return (
    <div className="space-y-4">
      {/* 학습 모드 설정 */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700">학습 모드</h4>
        <div className="space-y-2">
          <button
            onClick={() => handleModeChange("assisted")}
            className={`w-full px-4 py-3 rounded-lg text-left transition-all ${
              settings.studyMode === "assisted"
                ? "bg-indigo-50 border-2 border-indigo-600 text-indigo-600"
                : "bg-gray-50 border-2 border-transparent text-gray-600 hover:bg-gray-100"
            }`}
          >
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              <span className="text-sm font-medium">도움 모드</span>
            </div>
            <p className="text-xs mt-1 opacity-75">의미를 바로 확인 가능</p>
          </button>

          <button
            onClick={() => handleModeChange("immersive")}
            className={`w-full px-4 py-3 rounded-lg text-left transition-all ${
              settings.studyMode === "immersive"
                ? "bg-indigo-50 border-2 border-indigo-600 text-indigo-600"
                : "bg-gray-50 border-2 border-transparent text-gray-600 hover:bg-gray-100"
            }`}
          >
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              <span className="text-sm font-medium">몰입 모드</span>
            </div>
            <p className="text-xs mt-1 opacity-75">영어로만 학습</p>
          </button>
        </div>
      </div>

      {/* 자동 진행 토글 */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">자동 진행</span>
        </div>
        <button
          onClick={() =>
            handleAutoProgressChange(!settings.autoProgressEnabled)
          }
          className={`w-11 h-6 rounded-full transition-all ${
            settings.autoProgressEnabled ? "bg-indigo-600" : "bg-gray-300"
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
              settings.autoProgressEnabled ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
    </div>
  );
};
