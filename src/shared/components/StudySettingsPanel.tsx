// StudySettingsPanel.tsx
import React, { useCallback, useEffect } from "react";
import { Brain, Lightbulb, Zap, Volume2 } from "lucide-react";
import type { StudySettings } from "@/types";

export const StudySettingsPanel: React.FC<StudySettingsPanelProps> = ({
  settings,
  isSettingOpen,
  handleModeChange,
  handleAutoProgressChange,
  handleAutoPlayChange,
}) => {
  // 🔥 디버깅용 로그
  useEffect(() => {
    console.log("🔥 StudySettingsPanel rendered with:", {
      studyMode: settings.studyMode,
      autoProgressEnabled: settings.autoProgressEnabled,
      autoPlayOnSelect: settings.autoPlayOnSelect,
    });
  }, [settings]);

  // 🔥 터치 이벤트 최적화된 핸들러
  const handleAssistedClick = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("🔥 Assisted mode clicked");
      handleModeChange("assisted");
    },
    [handleModeChange]
  );

  const handleImmersiveClick = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("🔥 Immersive mode clicked");
      handleModeChange("immersive");
    },
    [handleModeChange]
  );

  const handleAutoProgressToggle = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const newValue = !settings.autoProgressEnabled;
      console.log("🔥 Auto progress toggled:", newValue);
      handleAutoProgressChange(newValue);
    },
    [handleAutoProgressChange, settings.autoProgressEnabled]
  );

  return (
    <div className="space-y-6">
      {/* 학습 모드 설정 */}
      <div>
        <div className="space-y-2">
          <button
            onClick={handleAssistedClick}
            onTouchEnd={handleAssistedClick}
            className={`w-full px-4 py-4 rounded-lg text-left transition-all touch-manipulation ${
              settings.studyMode === "assisted"
                ? "bg-indigo-50 border-2 border-indigo-600 text-indigo-600"
                : "bg-gray-50 border-2 border-transparent text-gray-600 hover:bg-gray-100 active:bg-gray-200"
            }`}
          >
            <div className="flex items-center gap-3">
              <Lightbulb className="w-5 h-5" />
              <div>
                <div className="font-medium">도움 모드</div>
                <div className="text-sm opacity-75">의미를 바로 확인 가능</div>
              </div>
            </div>
          </button>

          <button
            onClick={handleImmersiveClick}
            onTouchEnd={handleImmersiveClick}
            className={`w-full px-4 py-4 rounded-lg text-left transition-all touch-manipulation ${
              settings.studyMode === "immersive"
                ? "bg-indigo-50 border-2 border-indigo-600 text-indigo-600"
                : "bg-gray-50 border-2 border-transparent text-gray-600 hover:bg-gray-100 active:bg-gray-200"
            }`}
          >
            <div className="flex items-center gap-3">
              <Brain className="w-5 h-5" />
              <div>
                <div className="font-medium">몰입 모드</div>
                <div className="text-sm opacity-75">영어로만 학습</div>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* 자동 진행 토글 */}
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">자동 진행</span>
        </div>
        <button
          onClick={handleAutoProgressToggle}
          onTouchEnd={handleAutoProgressToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors touch-manipulation ${
            settings.autoProgressEnabled ? "bg-indigo-600" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              settings.autoProgressEnabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* 답 선택시 자동 재생 설정 */}
      {handleAutoPlayChange && (
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <Volume2 className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">
              답 선택시 자동 재생
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.autoPlayOnSelect || false}
              onChange={(e) => {
                e.stopPropagation();
                console.log("🔥 Auto play changed:", e.target.checked);
                handleAutoPlayChange(e.target.checked);
              }}
              className="sr-only peer"
            />
            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>
      )}
    </div>
  );
};
