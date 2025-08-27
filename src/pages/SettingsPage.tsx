import React from "react";
import { useAppSelector, useAppDispatch } from "@/providers/AppProvider";

export function SettingsPage() {
  const dispatch = useAppDispatch();
  const settings = useAppSelector((state) => state.settings);

  const handleSettingsUpdate = (newSettings: Partial<typeof settings>) => {
    dispatch({
      type: "UPDATE_SETTINGS",
      payload: newSettings,
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">설정</h2>
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            일일 목표
          </label>
          <input
            type="number"
            value={settings.dailyGoal}
            onChange={(e) =>
              handleSettingsUpdate({ dailyGoal: parseInt(e.target.value) })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            L1 힌트 숨김
          </label>
          <input
            type="checkbox"
            checked={settings.hideL1}
            onChange={(e) => handleSettingsUpdate({ hideL1: e.target.checked })}
            className="rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            복습 간격 (일)
          </label>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-red-600">Red</label>
              <input
                type="number"
                value={settings.reviewInterval.red}
                className="w-full px-2 py-1 text-sm border rounded"
                readOnly
              />
            </div>
            <div>
              <label className="text-xs text-yellow-600">Yellow</label>
              <input
                type="number"
                value={settings.reviewInterval.yellow}
                className="w-full px-2 py-1 text-sm border rounded"
                readOnly
              />
            </div>
            <div>
              <label className="text-xs text-green-600">Green</label>
              <input
                type="number"
                value={settings.reviewInterval.green}
                className="w-full px-2 py-1 text-sm border rounded"
                readOnly
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
