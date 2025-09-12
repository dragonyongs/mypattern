// src/components/StudyInterface.tsx
import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import { shallow } from "zustand/shallow";
import {
  ArrowLeft,
  CheckCircle2,
  Book,
  PenTool,
  Image,
  Search,
  Mic,
  Clock,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Settings,
  Target,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import VocabularyMode from "./study-modes/VocabularyMode";
import { SentenceMode } from "./study-modes/SentenceMode";
import { WorkbookMode } from "./study-modes/WorkbookMode";
import { LearningMethodIntro } from "./LearningMethodIntro";
import { ErrorBoundary } from "./ErrorBoundary";
import { useAppStore } from "@/stores/appStore";
import { useStudyProgressStore } from "@/stores/studyProgressStore";
import { packDataService } from "@/shared/services/packDataService";
import { CompletionModal } from "@/shared/components/CompletionModal";
import StudySettingsSheet from "@/shared/components/StudySettingsSheet";
import type { StudySettings } from "@/types";

type StudyMode =
  | "introduction"
  | "imagination-vocab"
  | "skimming-vocab"
  | "skimming-sentence"
  | "speaking-vocab"
  | "speaking-sentence"
  | "workbook";

// 🔥 타입 정의 추가
export type StudyModeType = "immersive" | "assisted";

export const StudyInterface: React.FC = () => {
  // ✅ ref를 사용하여 무한 반복 방지
  const isInitializedRef = useRef(false);
  const settingsInitializedRef = useRef(false);

  // ✅ 모든 hooks를 최상단에 호출
  const navigate = useNavigate();
  const { day: dayParam } = useParams<{ day: string }>();
  const [lastCompletedItem, setLastCompletedItem] = useState<string | null>(
    null
  );
  const [isSettingOpen, setIsSettingOpen] = useState(false);
  const [studyTime, setStudyTime] = useState(0);

  const currentDay = parseInt(dayParam || "1", 10);
  const packData = useAppStore((state) => state.selectedPackData);
  const setCurrentDay = useAppStore((state) => state.setCurrentDay);

  // 학습 시간 타이머
  useEffect(() => {
    const timer = setInterval(() => {
      setStudyTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 시간 포맷팅
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    const open = () => setIsSettingOpen(true);
    window.addEventListener("open-study-settings", open as EventListener);
    return () =>
      window.removeEventListener("open-study-settings", open as EventListener);
  }, []);

  const {
    setModeCompleted,
    getCurrentItemIndex,
    setCurrentItemIndex,
    getNextUncompletedIndex,
    autoMoveToNextMode,
    updateSettings,
  } = useStudyProgressStore();

  const dayProgress = useStudyProgressStore((state) =>
    packData ? state.progress[packData.id]?.progressByDay[currentDay] : null
  );

  // ✅ 상수 및 설정
  const labelMap: Record<StudyMode, string> = {
    introduction: "소개",
    "imagination-vocab": "단어",
    "skimming-vocab": "단어",
    "skimming-sentence": "문장",
    "speaking-vocab": "단어",
    "speaking-sentence": "문장",
    workbook: "워크북",
  };

  // 1) 현재 packId 도출
  const packId = packData?.id;

  // 2) 스토어 설정 slice 구독
  const storeSettings = useStudyProgressStore(
    (state) => (packId ? state.progress[packId]?.settings : undefined),
    shallow
  );

  // 3) ✅ 설정 계산 최적화 (깊은 비교 방지)
  const settings = useMemo(() => {
    if (!packId) {
      return {
        showMeaningEnabled: false,
        autoProgressEnabled: true,
        studyMode: "immersive" as StudyModeType,
        autoPlayOnSelect: false,
      };
    }

    const base: StudySettings = {
      showMeaningEnabled: false,
      autoProgressEnabled: true,
      studyMode: "immersive" as StudyModeType,
      autoPlayOnSelect: false,
    };

    const merged = { ...base, ...(storeSettings || {}) };
    merged.showMeaningEnabled = merged.studyMode === "assisted";

    // ✅ 설정이 실제로 변경되었을 때만 로그 출력
    if (settingsInitializedRef.current) {
      console.log("🎯 Settings updated:", merged);
    } else {
      settingsInitializedRef.current = true;
    }

    return merged;
  }, [packId, storeSettings]);

  // ✅ 설정 핸들러 최적화 (불필요한 재생성 방지)
  const handleSettingsChange = useCallback(
    (newSettings: Partial<StudySettings>) => {
      if (!packData) return;

      // ✅ 실제 변경사항이 있을 때만 업데이트
      const currentSettings = storeSettings || {};
      const hasChanges = Object.keys(newSettings).some(
        (key) =>
          currentSettings[key as keyof StudySettings] !==
          newSettings[key as keyof StudySettings]
      );

      if (hasChanges) {
        console.log("🔄 Settings changing:", newSettings);
        updateSettings(packData.id, newSettings);
      }
    },
    [packData?.id, storeSettings, updateSettings]
  );

  const handleAutoProgressChange = useCallback(
    (enabled: boolean) => {
      handleSettingsChange({ autoProgressEnabled: enabled });
    },
    [handleSettingsChange]
  );

  const handleStudyModeChange = useCallback(
    (mode: StudyModeType) => {
      handleSettingsChange({
        studyMode: mode,
        showMeaningEnabled: mode === "assisted",
      });
    },
    [handleSettingsChange]
  );

  const dayPlan = useMemo(() => {
    if (!packData) return null;
    return packData.learningPlan.days.find((d) => d.day === currentDay);
  }, [packData, currentDay]);

  const availableModeKeys = useMemo<StudyMode[]>(() => {
    if (!dayPlan) return [];
    return dayPlan.modes
      .map((m) => m.type as StudyMode)
      .filter((type): type is StudyMode => Boolean(type));
  }, [dayPlan]);

  // ✅ 상태 관리
  const [currentMode, setCurrentMode] = useState<StudyMode | null>(null);
  const [completion, setCompletion] = useState<{
    open: boolean;
    completed: StudyMode | null;
  }>({
    open: false,
    completed: null,
  });

  // ✅ 유틸리티 함수들
  const getLearningMethod = useCallback((mode: StudyMode) => {
    if (mode.includes("imagination")) return "imagine";
    if (mode.includes("skimming")) return "skim";
    if (mode.includes("speaking")) return "speak";
    if (mode === "workbook") return "check";
    return "default";
  }, []);

  const getContentType = useCallback((mode: StudyMode) => {
    if (mode.includes("vocab")) return "vocab";
    if (mode.includes("sentence")) return "sentence";
    if (mode === "workbook") return "workbook";
    return "unknown";
  }, []);

  const getModeData = useCallback(
    (mode: StudyMode) => {
      if (!dayPlan) return [];
      const currentModeConfig = dayPlan.modes.find((m) => m.type === mode);
      if (!currentModeConfig) return [];
      const modeContents = packDataService.getContentsByIds(
        packData!,
        currentModeConfig.contentIds
      );
      return modeContents;
    },
    [packData, dayPlan]
  );

  const getItemProgress = useCallback(
    (itemId: string) => {
      if (!packData) return { isCompleted: false, lastStudied: null };
      return useStudyProgressStore
        .getState()
        .getItemProgress(packData.id, currentDay, itemId);
    },
    [packData, currentDay]
  );

  // ✅ getInitialItemIndex 최적화 (콘솔 로그 줄이기)
  const getInitialItemIndex = useCallback(
    (mode: StudyMode) => {
      if (!packData) return 0;

      const modeData = getModeData(mode);
      if (!modeData.length) return 0;

      const contentIds = modeData.map((item) => item.id);
      const nextUncompletedIndex = getNextUncompletedIndex(
        packData.id,
        currentDay,
        mode,
        contentIds
      );

      if (nextUncompletedIndex < contentIds.length) {
        // ✅ 로그 빈도 줄이기
        return nextUncompletedIndex;
      }

      const savedIndex = getCurrentItemIndex(packData.id, currentDay, mode);
      const finalIndex = Math.min(savedIndex, contentIds.length - 1);
      return finalIndex;
    },
    [
      packData?.id,
      currentDay,
      getModeData,
      getCurrentItemIndex,
      getNextUncompletedIndex,
    ]
  );

  // ✅ 이벤트 핸들러들
  const handleItemCompleted = useCallback(
    (itemId: string, completed: boolean = true) => {
      if (!packData || !currentMode) return;

      console.log(`🎯 Item completed: ${itemId} = ${completed}`);

      // 1. 즉시 스토어에 저장
      useStudyProgressStore
        .getState()
        .setItemCompleted(packData.id, currentDay, itemId, completed);

      // 2. ✅ 자동 진행 설정 체크 추가
      if (!settings.autoProgressEnabled) {
        console.log(
          "🚫 StudyInterface: Auto progress disabled - no position update"
        );
        return;
      }

      if (settings.studyMode === "immersive") {
        console.log("🚫 StudyInterface: Immersive mode - no position update");
        return;
      }

      // 3. assisted 모드에서만 위치 업데이트
      if (settings.studyMode === "assisted") {
        const modeData = getModeData(currentMode);
        const currentItemIndex = modeData.findIndex(
          (item) => item.id === itemId
        );

        if (currentItemIndex >= 0) {
          setCurrentItemIndex(
            packData.id,
            currentDay,
            currentMode,
            (prevIndex) => {
              const nextIndex = Math.min(
                currentItemIndex + 1,
                modeData.length - 1
              );
              console.log(`📍 Position updated: ${prevIndex} → ${nextIndex}`);
              return nextIndex;
            }
          );
        }
      }
    },
    [
      packData,
      currentDay,
      currentMode,
      getModeData,
      setCurrentItemIndex,
      settings.autoProgressEnabled,
      settings.studyMode,
    ]
  );

  const handleBack = useCallback(() => {
    navigate("/calendar");
  }, [navigate]);

  const handleModeComplete = useCallback(
    (completedMode: StudyMode) => {
      if (completion.open || !packData || !dayPlan) return;

      setModeCompleted(packData.id, currentDay, completedMode, packData);

      const seq = availableModeKeys;
      const idx = seq.indexOf(completedMode);
      const next = idx >= 0 && idx < seq.length - 1 ? seq[idx + 1] : null;

      // 🔥 자동 진행 설정 확인
      if (settings.autoProgressEnabled && next) {
        const nextMode = autoMoveToNextMode(
          packData.id,
          currentDay,
          completedMode,
          packData
        );
        if (nextMode) {
          setCurrentMode(nextMode);
          console.log(`🔄 Auto moved to ${nextMode}`);
        }
        return;
      }

      // 자동 진행이 꺼져있거나 다음 모드가 없으면 모달 표시
      setCompletion({ open: true, completed: completedMode });
    },
    [
      completion.open,
      packData,
      dayPlan,
      currentDay,
      setModeCompleted,
      settings.autoProgressEnabled,
      availableModeKeys,
      autoMoveToNextMode,
    ]
  );

  const handleConfirmNext = useCallback(() => {
    if (!completion.completed) {
      setCompletion({ open: false, completed: null });
      return;
    }

    const seq = availableModeKeys;
    const idx = seq.indexOf(completion.completed);
    const next = idx >= 0 && idx < seq.length - 1 ? seq[idx + 1] : null;

    if (next) {
      // 🔥 자동 진행 설정 재확인
      if (settings.autoProgressEnabled) {
        const nextMode = autoMoveToNextMode(
          packData!.id,
          currentDay,
          completion.completed,
          packData!
        );
        if (nextMode) {
          setCurrentMode(nextMode);
          console.log(`🔄 Manual moved to ${nextMode}`);
        }
      } else {
        // 자동 진행이 꺼져있으면 모달만 닫기
        console.log(`ℹ️ Auto progress disabled. Modal closed without moving.`);
        setCompletion({ open: false, completed: null });
        return;
      }
    } else {
      // 마지막 모드인 경우 다음 날짜로 이동
      const nextDay = currentDay + 1;
      if (nextDay <= (packData?.learningPlan.totalDays ?? 14)) {
        setCurrentDay(nextDay);
        navigate("/calendar");
      } else {
        navigate("/calendar");
      }
    }

    setCompletion({ open: false, completed: null });
  }, [
    availableModeKeys,
    completion.completed,
    currentDay,
    navigate,
    setCurrentDay,
    packData,
    autoMoveToNextMode,
    settings.autoProgressEnabled,
  ]);

  const handleCloseModal = useCallback(() => {
    setCompletion({ open: false, completed: null });
  }, []);

  // ✅ 모드 변경 핸들러 최적화
  const handleModeChange = useCallback(
    (mode: StudyMode) => {
      if (!packData || currentMode === mode) return;

      console.log(`🔄 Mode changing: ${currentMode} → ${mode}`);
      setCurrentMode(mode);

      // 위치 계산은 한 번만 수행
      const modeData = getModeData(mode);
      if (modeData.length === 0) return;

      const contentIds = modeData.map((item) => item.id);
      const savedIndex = getCurrentItemIndex(packData.id, currentDay, mode);
      const nextUncompletedIndex = getNextUncompletedIndex(
        packData.id,
        currentDay,
        mode,
        contentIds
      );

      const optimalIndex =
        nextUncompletedIndex < contentIds.length
          ? nextUncompletedIndex
          : Math.min(savedIndex, contentIds.length - 1);

      setCurrentItemIndex(packData.id, currentDay, mode, optimalIndex);

      // ✅ 한 번만 로그 출력
      console.log(`✅ Mode set: ${mode}, index: ${optimalIndex}`);
    },
    [
      packData?.id,
      currentDay,
      currentMode, // ✅ 현재 모드 추가로 중복 호출 방지
      getModeData,
      getCurrentItemIndex,
      getNextUncompletedIndex,
      setCurrentItemIndex,
    ]
  );

  // ✅ 모드별 진행률 계산
  const getModeProgress = useCallback(
    (mode: StudyMode) => {
      const items = getModeData(mode);
      if (items.length === 0) return { completed: 0, total: 0, percentage: 0 };

      const completedCount = items.filter((item) => {
        const progress = getItemProgress(item.id);
        return progress.isCompleted;
      }).length;

      return {
        completed: completedCount,
        total: items.length,
        percentage: Math.round((completedCount / items.length) * 100),
      };
    },
    [getModeData, getItemProgress]
  );

  // ✅ 스터디 모드 데이터
  const studyModes = useMemo(() => {
    const iconMap: Record<StudyMode, React.ComponentType<any>> = {
      introduction: Book,
      "imagination-vocab": Image,
      "skimming-vocab": Search,
      "skimming-sentence": Search,
      "speaking-vocab": Mic,
      "speaking-sentence": Mic,
      workbook: PenTool,
    };

    return availableModeKeys.map((key, idx) => {
      const prevKey = idx > 0 ? availableModeKeys[idx - 1] : null;
      const completed = dayProgress?.completedModes[key] ?? false;
      const available =
        idx === 0
          ? true
          : prevKey
          ? dayProgress?.completedModes[prevKey] ?? false
          : false;

      const progress = getModeProgress(key);

      return {
        key,
        label: labelMap[key] || key,
        icon: iconMap[key] || Book,
        completed,
        available,
        progress,
      };
    });
  }, [availableModeKeys, dayProgress, getModeProgress, labelMap]);

  // ✅ 초기 모드 설정 최적화
  useEffect(() => {
    // 초기화가 이미 완료되었다면 실행하지 않음
    if (isInitializedRef.current) return;

    if (availableModeKeys.length && !currentMode && packData && dayPlan) {
      const firstMode = availableModeKeys[0];
      console.log(`🚀 Initial mode: ${firstMode}`);
      handleModeChange(firstMode);
      isInitializedRef.current = true;
    }
  }, [availableModeKeys.length, currentMode, packData, dayPlan]); // handleModeChange 제거

  // ✅ Day 접근 권한 검증
  const isDayAccessible = useMemo(() => {
    if (!packData) return false;
    if (currentDay === 1) return true;

    const previousDay = currentDay - 1;
    const previousDayProgress = useStudyProgressStore
      .getState()
      .getDayProgress(packData.id, previousDay);

    return previousDayProgress?.isCompleted ?? false;
  }, [packData, currentDay]);

  // ✅ renderContent 의존성 배열 최적화
  const renderContent = useCallback(() => {
    if (!currentMode) return null;

    const items = getModeData(currentMode);
    const learningMethod = getLearningMethod(currentMode);
    const contentType = getContentType(currentMode);
    const initialItemIndex = getInitialItemIndex(currentMode);

    // 🔥 공통 props에 설정 핸들러들 추가
    const commonProps = {
      packId: packData!.id,
      currentDay,
      dayNumber: currentDay,
      getItemProgress,
      onItemCompleted: handleItemCompleted,
      onComplete: () => handleModeComplete(currentMode),
      initialItemIndex,

      // 🔥 핵심: 설정 관련 props 추가
      settings,
      onSettingsChange: handleSettingsChange,
      onAutoProgressChange: handleAutoProgressChange,
      onStudyModeChange: handleStudyModeChange,
    };

    const componentKey = `${currentMode}-${packData!.id}-${currentDay}`;

    switch (contentType) {
      case "vocab":
        return (
          <VocabularyMode
            key={componentKey}
            items={items}
            learningMethod={learningMethod}
            isSettingOpen={isSettingOpen}
            {...commonProps}
          />
        );
      case "sentence":
        return (
          <SentenceMode
            key={componentKey}
            items={items}
            learningMethod={learningMethod}
            isSettingOpen={isSettingOpen}
            {...commonProps}
          />
        );
      case "workbook":
        return (
          <WorkbookMode
            key={componentKey}
            items={items}
            dayNumber={currentDay}
            packId={packData!.id}
            onComplete={() => handleModeComplete(currentMode)}
            onItemCompleted={handleItemCompleted}
            initialItemIndex={initialItemIndex}
            isSettingOpen={isSettingOpen}
            settings={settings}
            onSettingsChange={handleSettingsChange}
            onAutoProgressChange={handleAutoProgressChange}
            onStudyModeChange={handleStudyModeChange}
          />
        );
      default:
        return <div>Unknown content type: {contentType}</div>;
    }
  }, [
    currentMode,
    packData?.id, // ✅ packData 대신 packData?.id 사용
    currentDay,
    settings, // ✅ 설정 변경 시에만 리렌더링
    // 함수들은 제거 (useCallback으로 이미 메모이제이션됨)
  ]);

  // 🔥 StudySettingsSheet용 핸들러들
  const handleModeSetting = useCallback(
    (mode: StudyModeType) => {
      handleStudyModeChange(mode);
    },
    [handleStudyModeChange]
  );

  const handleAutoProgressSetting = useCallback(
    (enabled: boolean) => {
      handleAutoProgressChange(enabled);
    },
    [handleAutoProgressChange]
  );

  const handleAutoPlaySetting = useCallback(
    (enabled: boolean) => {
      handleSettingsChange({ autoPlayOnSelect: enabled });
    },
    [handleSettingsChange]
  );

  // 완료된 모드 수 계산
  const completedModeCount = studyModes.filter((mode) => mode.completed).length;
  const totalModeCount = studyModes.length;

  // ✅ 조건부 렌더링
  if (!isDayAccessible) {
    const previousDay = currentDay - 1;
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-amber-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Day {currentDay} 잠김
          </h2>
          <p className="text-gray-600 mb-6">
            Day {previousDay}를 먼저 완료해주세요.
          </p>
          <button
            onClick={() => navigate("/calendar")}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors w-full"
          >
            달력으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (!packData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          학습 데이터가 없습니다
        </h2>
        <p className="text-gray-600 mb-4">학습팩을 먼저 선택해주세요.</p>
        <button
          onClick={() => navigate("/")}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          홈으로 이동
        </button>
      </div>
    );
  }

  if (!packId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          학습팩 ID가 없습니다
        </h2>
        <p className="text-gray-600 mb-4">올바르지 않은 학습팩 데이터입니다.</p>
        <button
          onClick={() => navigate("/")}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          홈으로 이동
        </button>
      </div>
    );
  }

  if (!dayPlan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Day {currentDay} 데이터를 찾을 수 없습니다.
        </h2>
        <button
          onClick={() => navigate("/calendar")}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          달력으로 돌아가기
        </button>
      </div>
    );
  }

  // Day 1 소개 화면
  if (currentDay === 1 && dayPlan.modes[0]?.type === "introduction") {
    return (
      <LearningMethodIntro
        methods={packData.learningMethods}
        packId={packData.id}
        onComplete={() => {
          setCurrentDay(2);
          navigate("/calendar");
        }}
      />
    );
  }

  if (!currentMode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-gray-600">모드를 설정하고 있습니다...</p>
        <p className="text-xs text-gray-400 mt-2">
          사용 가능한 모드: {availableModeKeys.join(", ")}
        </p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {/* 헤더 */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors -ml-2"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  Day {currentDay}
                </h1>
                <p className="text-xs text-gray-500">{dayPlan.title}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {formatTime(studyTime)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <span className="text-xs font-bold text-purple-600">
                    {completedModeCount}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  / {totalModeCount}
                </span>
              </div>
            </div>
          </div>
          {/* 모드 탭 */}
          <div className="flex bg-gray-50 rounded-lg p-1">
            {studyModes.map((mode) => {
              const Icon = mode.icon;
              return (
                <button
                  key={mode.key}
                  onClick={() => mode.available && handleModeChange(mode.key)}
                  disabled={!mode.available}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all duration-200 flex items-center justify-center gap-1.5 ${
                    currentMode === mode.key
                      ? "bg-white text-gray-900 shadow-sm"
                      : mode.completed
                      ? "text-gray-700 hover:text-black"
                      : mode.available
                      ? "text-gray-600 hover:text-gray-900"
                      : "text-gray-400 opacity-50 cursor-not-allowed"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{mode.label}</span>
                  {mode.completed && (
                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 컨텐츠 영역 */}
        <div className="flex-1">{renderContent()}</div>

        {/* 완료 모달 */}
        <CompletionModal
          key={`${completion.completed}-${currentDay}`}
          open={completion.open}
          title={
            completion.completed
              ? `${
                  labelMap[completion.completed] || completion.completed
                } 완료!`
              : "완료!"
          }
          description={
            completion.completed
              ? `Day ${currentDay}의 ${
                  labelMap[completion.completed]
                } 학습을 완료했습니다.`
              : undefined
          }
          confirmText={settings.autoProgressEnabled ? "다음으로" : "확인"}
          onConfirm={handleConfirmNext}
          onClose={handleCloseModal}
        />

        <StudySettingsSheet
          open={isSettingOpen}
          onClose={() => setIsSettingOpen(false)}
          settings={settings}
          onModeChange={handleModeSetting}
          onAutoChange={handleAutoProgressSetting}
          onAutoPlayChange={handleAutoPlaySetting}
        />
      </div>
    </ErrorBoundary>
  );
};
