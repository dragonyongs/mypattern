// src/components/StudyInterface.tsx
import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Book,
  MessageSquare,
  PenTool,
  Image,
  Search,
  Mic,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { VocabularyMode } from "./study-modes/VocabularyMode";
import { SentenceMode } from "./study-modes/SentenceMode";
import { WorkbookMode } from "./study-modes/WorkbookMode";
import { LearningMethodIntro } from "./LearningMethodIntro";
import { ErrorBoundary } from "./ErrorBoundary";
import { useAppStore } from "@/stores/appStore";
import { useStudyProgressStore } from "@/stores/studyProgressStore";
import { packDataService } from "@/shared/services/packDataService";
import { CompletionModal } from "@/shared/components/CompletionModal";

type StudyMode =
  | "introduction"
  | "imagination-vocab"
  | "skimming-vocab"
  | "skimming-sentence"
  | "speaking-vocab"
  | "speaking-sentence"
  | "workbook";

export const StudyInterface: React.FC = () => {
  // ✅ 모든 hooks를 최상단에 호출
  const navigate = useNavigate();
  const { day: dayParam } = useParams<{ day: string }>();
  const [lastCompletedItem, setLastCompletedItem] = useState<string | null>(
    null
  );
  const currentDay = parseInt(dayParam || "1", 10);
  const packData = useAppStore((state) => state.selectedPackData);
  const setCurrentDay = useAppStore((state) => state.setCurrentDay);

  const {
    setModeCompleted,
    getSettings,
    getCurrentItemIndex,
    setCurrentItemIndex,
    getNextUncompletedIndex,
    autoMoveToNextMode,
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

  const packId = packData?.id;

  // 🔥 설정 기본값 보장
  const settings = useMemo(() => {
    const baseSettings = packData ? getSettings(packData.id) : {};
    return {
      showMeaningEnabled: true,
      autoProgressEnabled: true,
      studyMode: "immersive" as const,
      autoPlayOnSelect: false,
      ...baseSettings, // 기존 설정 덮어쓰기
    };
  }, [packData, getSettings]);

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

  // 🔥 학습 위치 계산 함수
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

      // 미완료 아이템이 있으면 그 위치로
      if (nextUncompletedIndex < contentIds.length) {
        console.log(
          `🎯 Mode ${mode}: Moving to uncompleted index ${nextUncompletedIndex}`
        );
        return nextUncompletedIndex;
      }

      // 모든 것이 완료된 경우 저장된 위치 사용
      const savedIndex = getCurrentItemIndex(packData.id, currentDay, mode);
      const finalIndex = Math.min(savedIndex, contentIds.length - 1);

      console.log(
        `🎯 Mode ${mode}: All completed, using saved index ${finalIndex}`
      );
      return finalIndex;
    },
    [
      packData,
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

      // 2. 🔥 함수형 업데이트로 최신 상태 기반 계산
      const modeData = getModeData(currentMode);
      const currentItemIndex = modeData.findIndex((item) => item.id === itemId);

      if (currentItemIndex >= 0) {
        // 🔥 핵심: 함수형 업데이트 사용
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
    },
    [packData, currentDay, currentMode, getModeData, setCurrentItemIndex]
  );

  // 🔥 아이템 완료 후 위치 업데이트 useEffect
  useEffect(() => {
    if (!lastCompletedItem || !packData || !currentMode) return;

    const modeData = getModeData(currentMode);
    const completedItemIndex = modeData.findIndex(
      (item) => item.id === lastCompletedItem
    );

    if (completedItemIndex >= 0) {
      const nextIndex = Math.min(completedItemIndex + 1, modeData.length - 1);

      setCurrentItemIndex(packData.id, currentDay, currentMode, nextIndex);

      console.log(`📍 Position updated: ${completedItemIndex} → ${nextIndex}`);
    }

    // 처리 완료 후 초기화
    setLastCompletedItem(null);
  }, [
    lastCompletedItem,
    packData,
    currentMode,
    currentDay,
    getModeData,
    setCurrentItemIndex,
  ]);

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

  // 🔥 모드 변경 핸들러 (안정화)
  const handleModeChange = useCallback(
    (mode: StudyMode) => {
      if (!packData) return;

      console.log(`🔄 Mode changing to: ${mode}`);
      setCurrentMode(mode);

      // 해당 모드의 최적 시작 위치 계산
      const modeData = getModeData(mode);
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
      console.log(`🎯 Mode set to ${mode}, starting at index: ${optimalIndex}`);
    },
    [
      packData,
      currentDay,
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

  // ✅ 초기 모드 설정 Effect
  useEffect(() => {
    console.log("🔍 Initial mode setup:", {
      availableModeKeys: availableModeKeys.length,
      currentMode,
      packData: !!packData,
      dayPlan: !!dayPlan,
    });

    if (availableModeKeys.length && !currentMode && packData && dayPlan) {
      const firstMode = availableModeKeys[0];
      console.log(`🚀 Setting initial mode: ${firstMode}`);
      handleModeChange(firstMode);
    }
  }, [
    availableModeKeys.length,
    currentMode,
    packData,
    dayPlan,
    handleModeChange,
  ]);

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

  // ✅ 컨텐츠 렌더링 함수
  const renderContent = useCallback(() => {
    if (!currentMode) {
      console.log("⚠️ No current mode set");
      return null;
    }

    const items = getModeData(currentMode);
    const learningMethod = getLearningMethod(currentMode);
    const contentType = getContentType(currentMode);
    const initialItemIndex = getInitialItemIndex(currentMode);

    console.log(`📋 Rendering ${contentType} with ${items.length} items`);

    const commonProps = {
      packId: packData.id,
      currentDay,
      dayNumber: currentDay,
      getItemProgress,
      onItemCompleted: handleItemCompleted,
      onComplete: () => handleModeComplete(currentMode),
      initialItemIndex,
      settings,
    };

    const componentKey = `${currentMode}-${packData.id}-${currentDay}`;

    switch (contentType) {
      case "vocab":
        return (
          <VocabularyMode
            key={componentKey}
            items={items}
            learningMethod={learningMethod}
            {...commonProps}
          />
        );
      case "sentence":
        return (
          <SentenceMode
            key={componentKey}
            items={items}
            learningMethod={learningMethod}
            {...commonProps}
          />
        );
      case "workbook":
        return (
          <WorkbookMode
            key={componentKey}
            items={items}
            dayNumber={currentDay}
            packId={packData.id}
            onComplete={() => handleModeComplete(currentMode)}
            onItemCompleted={handleItemCompleted}
            initialItemIndex={initialItemIndex}
            settings={settings}
          />
        );
      default:
        console.log(`⚠️ Unknown content type: ${contentType}`);
        return <div>Unknown content type: {contentType}</div>;
    }
  }, [
    currentMode,
    getModeData,
    getLearningMethod,
    getContentType,
    getInitialItemIndex,
    packData,
    currentDay,
    getItemProgress,
    handleItemCompleted,
    handleModeComplete,
    settings,
  ]);

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
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="font-semibold text-gray-900">Day {currentDay}</h1>
              <p className="text-sm text-gray-600">{dayPlan.title}</p>
            </div>
          </div>
        </div>

        {/* 모드 탭 */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex gap-2 overflow-x-auto p-2">
            {studyModes.map(
              ({ key, label, icon: Icon, completed, available, progress }) => (
                <button
                  key={key}
                  onClick={() => available && handleModeChange(key)}
                  disabled={!available}
                  className={`
                  flex items-center gap-2.5 px-4 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap
                  transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1
                  ${
                    currentMode === key
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25 scale-105"
                      : available
                      ? completed
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 hover:shadow-sm"
                        : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 hover:text-slate-900 hover:shadow-sm"
                      : "bg-slate-50 text-slate-400 border border-slate-100 cursor-not-allowed opacity-50"
                  }
                `}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                  {progress && progress.total > 0 && (
                    <span className="text-xs opacity-75">
                      ({progress.completed}/{progress.total})
                    </span>
                  )}
                  {completed && <CheckCircle2 className="w-4 h-4" />}
                </button>
              )
            )}
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
      </div>
    </ErrorBoundary>
  );
};
