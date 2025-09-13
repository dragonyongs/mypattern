// src/components/StudyInterface.tsx
import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import { useShallow } from "zustand/react/shallow";
import {
  CheckCircle2,
  Book,
  PenTool,
  Image,
  Search,
  Mic,
  Clock,
  ChevronLeft,
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

export type StudyModeType = "immersive" | "assisted";

export const StudyInterface: React.FC = () => {
  // refs, router
  const isInitializedRef = useRef(false);
  const completionProcessingRef = useRef(false);
  const navigate = useNavigate();
  const { day: dayParam } = useParams<{ day: string }>();

  // states
  const [isSettingOpen, setIsSettingOpen] = useState(false);
  const [studyTime, setStudyTime] = useState(0);
  const [currentMode, setCurrentMode] = useState<StudyMode | null>(null);
  const [completion, setCompletion] = useState<{
    open: boolean;
    completed: StudyMode | null;
  }>({
    open: false,
    completed: null,
  });

  const currentDay = parseInt(dayParam || "1", 10);

  // stores - 🔥 누락된 메소드들 추가
  const { packData, setCurrentDay } = useAppStore(
    useShallow((state) => ({
      packData: state.selectedPackData,
      setCurrentDay: state.setCurrentDay,
    }))
  );

  const storeActions = useStudyProgressStore(
    useShallow((state) => ({
      setModeCompleted: state.setModeCompleted,
      updateSettings: state.updateSettings,
      getItemProgress: state.getItemProgress,
      setItemCompleted: state.setItemCompleted,
      getDayProgress: state.getDayProgress,
      getNextUncompletedIndex: state.getNextUncompletedIndex,
      getCurrentItemIndex: state.getCurrentItemIndex,
    }))
  );

  const dayProgress = useStudyProgressStore(
    useShallow((state) =>
      packData
        ? state.progress[packData.id]?.progressByDay[currentDay] || null
        : null
    )
  );

  // effects
  useEffect(() => {
    const timer = setInterval(() => setStudyTime((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const open = () => setIsSettingOpen(true);
    window.addEventListener("open-study-settings", open as EventListener);
    return () =>
      window.removeEventListener("open-study-settings", open as EventListener);
  }, []);

  // constants
  const labelMap = useMemo(
    () => ({
      introduction: "소개",
      "imagination-vocab": "단어",
      "skimming-vocab": "단어",
      "skimming-sentence": "문장",
      "speaking-vocab": "단어",
      "speaking-sentence": "문장",
      workbook: "워크북",
    }),
    []
  );

  const settings = useStudyProgressStore(
    useShallow((state) =>
      packData
        ? state.progress[packData.id]?.settings || {
            showMeaningEnabled: false,
            autoProgressEnabled: false,
            studyMode: "immersive" as const,
            autoPlayOnSelect: false,
          }
        : {
            showMeaningEnabled: false,
            autoProgressEnabled: false,
            studyMode: "immersive" as const,
            autoPlayOnSelect: false,
          }
    )
  );

  const dayPlan = useMemo(() => {
    return (
      packData?.learningPlan.days.find((d) => d.day === currentDay) || null
    );
  }, [packData?.id, currentDay]);

  const availableModeKeys = useMemo<StudyMode[]>(() => {
    if (!dayPlan) return [];
    return dayPlan.modes
      .map((m) => m.type as StudyMode)
      .filter((type): type is StudyMode => Boolean(type));
  }, [dayPlan]);

  const isDayAccessible = useMemo(() => {
    if (!packData || currentDay === 1) return Boolean(packData);
    const previousDay = currentDay - 1;
    const state = useStudyProgressStore.getState();
    const previousDayProgress = state.getDayProgress(packData.id, previousDay);
    return previousDayProgress?.isCompleted ?? false;
  }, [packData?.id, currentDay]);

  // helpers
  const getModeData = useCallback(
    (mode: StudyMode) => {
      if (!dayPlan || !packData) return [];
      const cfg = dayPlan.modes.find((m) => m.type === mode);
      if (!cfg) return [];
      return packDataService.getContentsByIds(packData, cfg.contentIds);
    },
    [packData, dayPlan]
  );

  const getItemProgress = useCallback(
    (itemId: string) => {
      if (!packData) return { isCompleted: false, lastStudied: null };
      return storeActions.getItemProgress(packData.id, currentDay, itemId);
    },
    [packData?.id, currentDay, storeActions.getItemProgress]
  );

  const getModeProgress = useCallback(
    (mode: StudyMode) => {
      const items = getModeData(mode);
      if (items.length === 0) return { completed: 0, total: 0, percentage: 0 };
      const completedCount = items.filter(
        (item) => getItemProgress(item.id).isCompleted
      ).length;
      return {
        completed: completedCount,
        total: items.length,
        percentage: Math.round((completedCount / items.length) * 100),
      };
    },
    [getModeData, getItemProgress]
  );

  const getInitialItemIndex = useCallback(
    (mode: StudyMode) => {
      if (!packData) return 0;
      const modeData = getModeData(mode);
      if (!modeData.length) return 0;

      const contentIds = modeData.map((item) => item.id);
      const state = useStudyProgressStore.getState();
      const nextUncompletedIndex = state.getNextUncompletedIndex(
        packData.id,
        currentDay,
        mode,
        contentIds
      );

      if (nextUncompletedIndex < contentIds.length) return nextUncompletedIndex;

      const savedIndex = state.getCurrentItemIndex(
        packData.id,
        currentDay,
        mode
      );
      return Math.min(savedIndex, contentIds.length - 1);
    },
    [packData, currentDay, getModeData]
  );

  // 🔥 수정: 첫 번째 비-introduction 모드를 정확히 반환
  const selectInitialMode = useCallback(
    (modes: StudyMode[]): StudyMode | null => {
      const nonIntro = modes.filter((m) => m !== "introduction");
      if (nonIntro.length > 0) return nonIntro[0];
      return modes.length > 0 ? modes[0] : null;
    },
    []
  );

  // studyModes
  const studyModes = useMemo(() => {
    const iconMap: Record<StudyMode, React.ComponentType> = {
      introduction: Book,
      "imagination-vocab": Image,
      "skimming-vocab": Search,
      "skimming-sentence": Search,
      "speaking-vocab": Mic,
      "speaking-sentence": Mic,
      workbook: PenTool,
    };

    return availableModeKeys
      .map((key) => {
        const completed = dayProgress?.completedModes[key] ?? false;
        const hasContent =
          key === "workbook" ? getModeData(key).length > 0 : true;
        const progress = getModeProgress(key);
        return {
          key,
          label: labelMap[key] || key,
          icon: iconMap[key] || Book,
          completed,
          available: hasContent,
          progress,
        };
      })
      .filter((m) =>
        m.key === "workbook" ? getModeData(m.key).length > 0 : true
      );
  }, [availableModeKeys, dayProgress, labelMap, getModeData, getModeProgress]);

  // handlers
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const handleSettingsChange = useCallback(
    (next: Partial<StudySettings>) => {
      if (!packData?.id) return;
      console.log("🔥 Settings changing:", next); // 디버깅 로그
      storeActions.updateSettings(packData.id, next);
    },
    [packData?.id, storeActions.updateSettings]
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

  const handleItemCompleted = useCallback(
    (itemId: string, completed: boolean = true) => {
      if (!packData || !currentMode) return;
      const cur = storeActions.getItemProgress(packData.id, currentDay, itemId);
      if (cur.isCompleted !== completed) {
        storeActions.setItemCompleted(
          packData.id,
          currentDay,
          itemId,
          completed
        );
      }
    },
    [packData, currentDay, currentMode, storeActions.setItemCompleted]
  );

  const handleBack = useCallback(() => navigate("/calendar"), [navigate]);

  // 🔥 수정: 자동 다음 모드 전환 로직 추가
  const handleModeComplete = useCallback(
    (completedMode: StudyMode) => {
      if (!packData || !dayPlan) return;
      if (completionProcessingRef.current) return;
      if (completion.open) return;

      const already = dayProgress?.completedModes[completedMode];
      if (already) return;

      completionProcessingRef.current = true;
      try {
        storeActions.setModeCompleted(
          packData.id,
          currentDay,
          completedMode,
          packData
        );

        // 자동 다음 모드 전환
        const seq = availableModeKeys;
        const idx = seq.indexOf(completedMode);
        const next = idx >= 0 && idx < seq.length - 1 ? seq[idx + 1] : null;

        setCompletion({ open: true, completed: completedMode });

        if (next) {
          // 잠깐 모달 표시 후 다음 모드로 전환
          setTimeout(() => {
            setCurrentMode(next);
            setCompletion({ open: false, completed: null });
            completionProcessingRef.current = false;
          }, 1500);
        } else {
          completionProcessingRef.current = false;
        }
      } finally {
        setTimeout(() => {
          completionProcessingRef.current = false;
        }, 2000);
      }
    },
    [
      packData,
      dayPlan,
      currentDay,
      dayProgress,
      completion.open,
      storeActions,
      availableModeKeys,
    ]
  );

  const handleModeChange = useCallback(
    (mode: StudyMode) => {
      if (!packData || currentMode === mode) return;
      completionProcessingRef.current = false;
      if (completion.open) setCompletion({ open: false, completed: null });
      setCurrentMode(mode);
    },
    [packData, currentMode, completion.open]
  );

  const handleConfirmNext = useCallback(() => {
    if (!completion.completed) {
      setCompletion({ open: false, completed: null });
      completionProcessingRef.current = false;
      return;
    }
    const seq = availableModeKeys;
    const idx = seq.indexOf(completion.completed);
    const next = idx >= 0 && idx < seq.length - 1 ? seq[idx + 1] : null;

    if (next) {
      setCurrentMode(next);
    } else {
      const nextDay = currentDay + 1;
      if (nextDay <= (packData?.learningPlan.totalDays ?? 14)) {
        setCurrentDay(nextDay);
        navigate("/calendar");
      } else {
        navigate("/calendar");
      }
    }

    setCompletion({ open: false, completed: null });
    completionProcessingRef.current = false;
  }, [
    availableModeKeys,
    completion.completed,
    currentDay,
    navigate,
    setCurrentDay,
    packData,
  ]);

  const handleCloseModal = useCallback(() => {
    setCompletion({ open: false, completed: null });
    completionProcessingRef.current = false;
  }, []);

  const getLearningMethod = useCallback((mode: StudyMode) => {
    if (mode.includes("imagination")) return "imagine";
    if (mode.includes("skimming")) return "skim";
    if (mode.includes("speaking")) return "speak";
    if (mode === "workbook") return "check";
    if (mode === "introduction") return "intro";
    return "default";
  }, []);

  // 🔥 수정: console.log 제거
  const getContentType = useCallback((mode: StudyMode) => {
    if (mode === "introduction") return "introduction";
    if (mode.includes("vocab")) return "vocab";
    if (mode.includes("sentence")) return "sentence";
    if (mode === "workbook") return "workbook";
    return "unknown";
  }, []);

  // renderContent — no hooks inside
  const renderContent = useCallback(() => {
    if (!currentMode || !packData) return null;

    const items = getModeData(currentMode);
    const learningMethod = getLearningMethod(currentMode);
    const contentType = getContentType(currentMode);
    const initialItemIndex = getInitialItemIndex(currentMode);

    const onModeComplete = () => handleModeComplete(currentMode);

    const baseProps = {
      packId: packData.id,
      currentDay,
      dayNumber: currentDay,
      initialItemIndex,
      settings,
      isSettingOpen,
      getItemProgress,
      onItemCompleted: handleItemCompleted,
      onComplete: onModeComplete,
      onSettingsChange: handleSettingsChange,
      onAutoProgressChange: handleAutoProgressChange,
      onStudyModeChange: handleStudyModeChange,
    };

    const componentKey = `${currentMode}-${packData.id}-${currentDay}`;

    switch (contentType) {
      case "introduction":
        return (
          <LearningMethodIntro
            key={componentKey}
            methods={packData.learningMethods}
            packId={packData.id}
            onComplete={onModeComplete}
          />
        );
      case "vocab":
        return (
          <VocabularyMode key={componentKey} items={items} {...baseProps} />
        );
      case "sentence":
        return (
          <SentenceMode
            key={componentKey}
            items={items}
            learningMethod={learningMethod}
            {...baseProps}
          />
        );
      case "workbook":
        return <WorkbookMode key={componentKey} items={items} {...baseProps} />;
      default:
        return <div>Unknown content type: {contentType}</div>;
    }
  }, [
    currentMode,
    packData,
    currentDay,
    settings,
    isSettingOpen,
    getModeData,
    getLearningMethod,
    getContentType,
    getInitialItemIndex,
    getItemProgress,
    handleItemCompleted,
    handleModeComplete,
    handleSettingsChange,
    handleAutoProgressChange,
    handleStudyModeChange,
  ]);

  // initial mode (FIX: choose first non-introduction)
  useEffect(() => {
    if (isInitializedRef.current) return;
    if (!availableModeKeys.length || !packData || !dayPlan) return;
    const first = selectInitialMode(availableModeKeys);
    if (first) setCurrentMode(first);
    isInitializedRef.current = true;
  }, [availableModeKeys, packData, dayPlan, selectInitialMode]);

  // derived
  const completedModeCount = studyModes.filter((m) => m.completed).length;
  const totalModeCount = studyModes.length;

  // guards (디자인 그대로 유지)
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

  if (!currentMode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-gray-600">모드를 설정하고 있습니다...</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
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

          <div className="flex bg-gray-50 rounded-lg p-1">
            {studyModes.map((mode) => {
              const Icon = mode.icon;
              return (
                <button
                  key={mode.key}
                  onClick={() =>
                    mode.available && handleModeChange(mode.key as StudyMode)
                  }
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

        <div className="flex-1">{renderContent()}</div>

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
          confirmText="다음으로"
          cancelText="다시 학습하기"
          onConfirm={handleConfirmNext}
          onClose={handleCloseModal}
        />

        <StudySettingsSheet
          open={isSettingOpen}
          onClose={() => setIsSettingOpen(false)}
          settings={settings}
          onModeChange={(m) => handleStudyModeChange(m)}
          onAutoChange={(v) => handleAutoProgressChange(v)}
          onAutoPlayChange={(v) =>
            handleSettingsChange({ autoPlayOnSelect: v })
          }
        />
      </div>
    </ErrorBoundary>
  );
};
