// src/shared/components/StudySettingsPanel.tsx
import React from "react";
import { Brain, Lightbulb, Settings } from "lucide-react";
import { useStudySettings } from "@/shared/hooks/useAppHooks";

interface Props {
  packId: string;
  showMeaningLabel: string; // 단어: 한글 의미 표시 허용 / 문장: 번역 표시 허용
}

export const StudySettingsPanel: React.FC<Props> = ({
  packId,
  showMeaningLabel,
}) => {
  const { settings, updateSetting } = useStudySettings(packId);

  return (
    <div className="bg-white rounded-xl p-4 mb-6 shadow-lg border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800">학습 설정</h3>
        <Settings className="w-4 h-4 text-gray-500" />
      </div>

      <div className="space-y-3">
        {/* 학습 모드 */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            학습 모드
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => {
                updateSetting("studyMode", "immersive");
                updateSetting("showMeaningEnabled", false);
              }}
              className={`flex-1 flex items-center gap-2 p-3 rounded-lg border ${
                settings.studyMode === "immersive"
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <Brain className="w-4 h-4" />
              <div className="text-left">
                <div className="font-medium text-sm">몰입 모드</div>
                <div className="text-xs opacity-70">의미 없이 영어로만</div>
              </div>
            </button>

            <button
              onClick={() => {
                updateSetting("studyMode", "assisted");
                updateSetting("showMeaningEnabled", true);
              }}
              className={`flex-1 flex items-center gap-2 p-3 rounded-lg border ${
                settings.studyMode === "assisted"
                  ? "border-green-500 bg-green-50 text-green-700"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <Lightbulb className="w-4 h-4" />
              <div className="text-left">
                <div className="font-medium text-sm">도움 모드</div>
                <div className="text-xs opacity-70">의미 확인 가능</div>
              </div>
            </button>
          </div>
        </div>

        {/* 자동 진행 */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            학습 완료 시 자동 진행
          </span>
          <button
            onClick={() =>
              updateSetting(
                "autoProgressEnabled",
                !settings.autoProgressEnabled
              )
            }
            className={`w-12 h-6 rounded-full ${
              settings.autoProgressEnabled ? "bg-blue-500" : "bg-gray-300"
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full transition-transform ${
                settings.autoProgressEnabled
                  ? "translate-x-6"
                  : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {/* 의미/번역 표시 */}
        {settings.studyMode === "assisted" && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              {showMeaningLabel}
            </span>
            <button
              onClick={() =>
                updateSetting(
                  "showMeaningEnabled",
                  !settings.showMeaningEnabled
                )
              }
              className={`w-12 h-6 rounded-full ${
                settings.showMeaningEnabled ? "bg-green-500" : "bg-gray-300"
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  settings.showMeaningEnabled
                    ? "translate-x-6"
                    : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
