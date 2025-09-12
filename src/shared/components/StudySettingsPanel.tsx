// src/shared/components/StudySettingsPanel.tsx
import React, { useCallback, useEffect, useMemo } from "react";
import { Brain, Lightbulb, Zap, Volume2 } from "lucide-react";
import type { StudySettings } from "@/types";

export interface StudySettingsPanelProps {
  settings: Required<
    Pick<
      StudySettings,
      "studyMode" | "autoProgressEnabled" | "autoPlayOnSelect"
    >
  >;
  isSettingOpen?: boolean;
  handleModeChange: (mode: "assisted" | "immersive") => void;
  handleAutoProgressChange: (enabled: boolean) => void;
  handleAutoPlayChange?: (enabled: boolean) => void;
}

export const StudySettingsPanel: React.FC<StudySettingsPanelProps> = ({
  settings,
  isSettingOpen,
  handleModeChange,
  handleAutoProgressChange,
  handleAutoPlayChange,
}) => {
  useEffect(() => {
    console.log("🔥 StudySettingsPanel rendered with:", {
      studyMode: settings.studyMode,
      autoProgressEnabled: settings.autoProgressEnabled,
      autoPlayOnSelect: settings.autoPlayOnSelect,
    });
  }, [settings]);

  const isImmersive = settings.studyMode === "immersive";

  // 안내문구는 memo로 관리
  const autoProgressHint = useMemo(
    () =>
      isImmersive
        ? "몰입 모드에서는 자동 진행이 비활성화됩니다"
        : "학습 완료 시 다음 카드로 자동 이동합니다",
    [isImmersive]
  );

  // 모드 전환
  const handleAssistedClick = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleModeChange("assisted");
    },
    [handleModeChange]
  );

  const handleImmersiveClick = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleModeChange("immersive");
    },
    [handleModeChange]
  );

  // 자동 진행 토글
  const handleAutoProgressToggle = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isImmersive) return; // 비활성 시 무시
      handleAutoProgressChange(!settings.autoProgressEnabled);
    },
    [isImmersive, settings.autoProgressEnabled, handleAutoProgressChange]
  );

  return (
    <div className="space-y-6">
      {/* 학습 모드 */}
      <div className="text-sm text-slate-600 mb-3">학습 설정</div>
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
            aria-pressed={settings.studyMode === "assisted"}
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
            aria-pressed={settings.studyMode === "immersive"}
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

      {/* 자동 진행 토글 (몰입 모드일 때 비활성) */}
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <Zap
            className={`w-5 h-5 ${
              isImmersive ? "text-gray-400" : "text-gray-600"
            }`}
          />
          <div className="flex flex-col">
            <span
              className={`text-sm font-medium ${
                isImmersive ? "text-gray-400" : "text-gray-700"
              }`}
            >
              자동 진행
            </span>
            <span className="text-xs text-gray-400">{autoProgressHint}</span>
          </div>
        </div>

        <button
          onClick={handleAutoProgressToggle}
          onTouchEnd={handleAutoProgressToggle}
          disabled={isImmersive}
          aria-disabled={isImmersive}
          aria-label={autoProgressHint}
          title={autoProgressHint}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors touch-manipulation ${
            isImmersive
              ? "bg-gray-200 cursor-not-allowed"
              : settings.autoProgressEnabled
              ? "bg-indigo-600"
              : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              settings.autoProgressEnabled && !isImmersive
                ? "translate-x-6"
                : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* 답 선택시 자동 재생 */}
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
                handleAutoPlayChange(e.target.checked);
              }}
              className="sr-only peer"
            />
            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
          </label>
        </div>
      )}
    </div>
  );
};
