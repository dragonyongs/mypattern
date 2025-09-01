// src/pages/packs/PackSettings.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePackStore } from "@/stores/packStore";
import { useDailyPlanStore } from "@/stores/dailyPlanStore";
import {
  ArrowLeft,
  Settings,
  Download,
  Trash2,
  RefreshCw,
  Bell,
  Moon,
  Volume2,
  Smartphone,
  Save,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

interface PackSettingsData {
  notifications: {
    dailyReminder: boolean;
    reminderTime: string;
    progressUpdates: boolean;
    achievements: boolean;
  };
  learning: {
    autoPlay: boolean;
    playbackSpeed: number;
    repeatCount: number;
    darkMode: boolean;
    showTranslation: boolean;
  };
  privacy: {
    shareProgress: boolean;
    allowAnalytics: boolean;
  };
}

const PackSettings: React.FC = () => {
  const navigate = useNavigate();
  const { selectedPack, availablePacks, resetPacks } = usePackStore();
  const { currentPlan, resetPlan } = useDailyPlanStore();

  const [settings, setSettings] = useState<PackSettingsData>({
    notifications: {
      dailyReminder: true,
      reminderTime: "09:00",
      progressUpdates: true,
      achievements: true,
    },
    learning: {
      autoPlay: false,
      playbackSpeed: 1.0,
      repeatCount: 1,
      darkMode: false,
      showTranslation: true,
    },
    privacy: {
      shareProgress: false,
      allowAnalytics: true,
    },
  });

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  useEffect(() => {
    // 로컬 스토리지에서 설정 불러오기
    const savedSettings = localStorage.getItem("pack-settings");
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const handleSettingChange = (
    category: keyof PackSettingsData,
    key: string,
    value: any
  ) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
  };

  const saveSettings = async () => {
    setSaveStatus("saving");
    try {
      localStorage.setItem("pack-settings", JSON.stringify(settings));
      // 서버에 저장하는 로직이 있다면 여기에 추가
      await new Promise((resolve) => setTimeout(resolve, 500)); // 시뮬레이션
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }
  };

  const handleResetProgress = () => {
    resetPlan();
    setShowResetConfirm(false);
    // 성공 메시지 표시
    alert("학습 진행상황이 초기화되었습니다.");
  };

  const handleResetAll = () => {
    resetPacks();
    resetPlan();
    localStorage.removeItem("pack-settings");
    setSettings({
      notifications: {
        dailyReminder: true,
        reminderTime: "09:00",
        progressUpdates: true,
        achievements: true,
      },
      learning: {
        autoPlay: false,
        playbackSpeed: 1.0,
        repeatCount: 1,
        darkMode: false,
        showTranslation: true,
      },
      privacy: {
        shareProgress: false,
        allowAnalytics: true,
      },
    });
    alert("모든 설정과 데이터가 초기화되었습니다.");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/app/packs")}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-gray-900">팩 설정</h1>
              <p className="text-gray-500 text-sm">
                학습 환경과 알림을 사용자 지정하세요
              </p>
            </div>
            <button
              onClick={saveSettings}
              disabled={saveStatus === "saving"}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                saveStatus === "saved"
                  ? "bg-green-600 text-white"
                  : saveStatus === "error"
                  ? "bg-red-600 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {saveStatus === "saving" ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : saveStatus === "saved" ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saveStatus === "saving"
                ? "저장 중..."
                : saveStatus === "saved"
                ? "저장완료"
                : "저장"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* 현재 팩 정보 */}
          {selectedPack && (
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                현재 선택된 팩
              </h3>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Settings className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">
                    {selectedPack.title}
                  </h4>
                  <p className="text-gray-600 text-sm">
                    {selectedPack.totalItems}개 항목 •{" "}
                    {selectedPack.estimatedDays}일 과정
                  </p>
                </div>
                {currentPlan && (
                  <div className="text-sm text-green-600 font-medium">
                    진행률:{" "}
                    {Math.round(
                      (currentPlan.completedDays / currentPlan.totalDays) * 100
                    )}
                    %
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 알림 설정 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center gap-3 mb-6">
              <Bell className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">알림 설정</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-gray-900">
                    일일 학습 알림
                  </label>
                  <p className="text-gray-600 text-sm">
                    매일 정해진 시간에 학습을 알려드립니다
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifications.dailyReminder}
                    onChange={(e) =>
                      handleSettingChange(
                        "notifications",
                        "dailyReminder",
                        e.target.checked
                      )
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {settings.notifications.dailyReminder && (
                <div className="ml-4 flex items-center gap-4">
                  <label className="text-sm text-gray-700">알림 시간:</label>
                  <input
                    type="time"
                    value={settings.notifications.reminderTime}
                    onChange={(e) =>
                      handleSettingChange(
                        "notifications",
                        "reminderTime",
                        e.target.value
                      )
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-gray-900">
                    진행률 업데이트
                  </label>
                  <p className="text-gray-600 text-sm">
                    학습 진행상황을 정기적으로 알려드립니다
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifications.progressUpdates}
                    onChange={(e) =>
                      handleSettingChange(
                        "notifications",
                        "progressUpdates",
                        e.target.checked
                      )
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-gray-900">성취 알림</label>
                  <p className="text-gray-600 text-sm">
                    목표 달성 시 축하 메시지를 받습니다
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifications.achievements}
                    onChange={(e) =>
                      handleSettingChange(
                        "notifications",
                        "achievements",
                        e.target.checked
                      )
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* 학습 설정 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center gap-3 mb-6">
              <Volume2 className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">학습 설정</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-gray-900">자동 재생</label>
                  <p className="text-gray-600 text-sm">
                    발음을 자동으로 재생합니다
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.learning.autoPlay}
                    onChange={(e) =>
                      handleSettingChange(
                        "learning",
                        "autoPlay",
                        e.target.checked
                      )
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-gray-900">재생 속도</label>
                  <p className="text-gray-600 text-sm">
                    음성 재생 속도를 조절합니다
                  </p>
                </div>
                <select
                  value={settings.learning.playbackSpeed}
                  onChange={(e) =>
                    handleSettingChange(
                      "learning",
                      "playbackSpeed",
                      parseFloat(e.target.value)
                    )
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={0.75}>0.75x</option>
                  <option value={1.0}>1.0x</option>
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-gray-900">반복 횟수</label>
                  <p className="text-gray-600 text-sm">
                    각 단어당 자동 반복 횟수
                  </p>
                </div>
                <select
                  value={settings.learning.repeatCount}
                  onChange={(e) =>
                    handleSettingChange(
                      "learning",
                      "repeatCount",
                      parseInt(e.target.value)
                    )
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={1}>1회</option>
                  <option value={2}>2회</option>
                  <option value={3}>3회</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-gray-900">다크 모드</label>
                  <p className="text-gray-600 text-sm">
                    어두운 테마를 사용합니다
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.learning.darkMode}
                    onChange={(e) =>
                      handleSettingChange(
                        "learning",
                        "darkMode",
                        e.target.checked
                      )
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-gray-900">번역 표시</label>
                  <p className="text-gray-600 text-sm">
                    한국어 번역을 함께 표시합니다
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.learning.showTranslation}
                    onChange={(e) =>
                      handleSettingChange(
                        "learning",
                        "showTranslation",
                        e.target.checked
                      )
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* 개인정보 설정 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center gap-3 mb-6">
              <Smartphone className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                개인정보 설정
              </h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-gray-900">
                    진행상황 공유
                  </label>
                  <p className="text-gray-600 text-sm">
                    다른 사용자와 학습 진행상황을 공유합니다
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.privacy.shareProgress}
                    onChange={(e) =>
                      handleSettingChange(
                        "privacy",
                        "shareProgress",
                        e.target.checked
                      )
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-gray-900">
                    분석 데이터 수집
                  </label>
                  <p className="text-gray-600 text-sm">
                    앱 개선을 위한 익명화된 데이터 수집에 동의합니다
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.privacy.allowAnalytics}
                    onChange={(e) =>
                      handleSettingChange(
                        "privacy",
                        "allowAnalytics",
                        e.target.checked
                      )
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* 데이터 관리 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center gap-3 mb-6">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                데이터 관리
              </h3>
            </div>

            <div className="space-y-4">
              {currentPlan && (
                <div className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div>
                    <h4 className="font-medium text-orange-900">
                      학습 진행상황 초기화
                    </h4>
                    <p className="text-orange-700 text-sm">
                      현재 진행 중인 학습을 처음부터 다시 시작합니다
                    </p>
                  </div>
                  <button
                    onClick={() => setShowResetConfirm(true)}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    초기화
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                <div>
                  <h4 className="font-medium text-red-900">모든 데이터 삭제</h4>
                  <p className="text-red-700 text-sm">
                    모든 설정과 학습 데이터를 완전히 삭제합니다
                  </p>
                </div>
                <button
                  onClick={handleResetAll}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  전체 삭제
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 초기화 확인 모달 */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-orange-500" />
              <h3 className="text-lg font-semibold text-gray-900">
                진행상황 초기화
              </h3>
            </div>
            <p className="text-gray-600 mb-6">
              현재 학습 진행상황이 모두 삭제되고 처음부터 다시 시작됩니다. 이
              작업은 되돌릴 수 없습니다. 정말로 초기화하시겠습니까?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleResetProgress}
                className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
              >
                초기화
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackSettings;
