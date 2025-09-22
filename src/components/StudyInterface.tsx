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
import { StudyMode, StudyModeType } from "@/types";
import { buildWorkbookForDayFromPack } from "@/shared/services/workbook.builder"; // 새 빌더

export const StudyInterface: React.FC = () => {
  // refs, router
  const isInitializedRef = useRef(false);
  const completionProcessingRef = useRef(false);
  const navigate = useNavigate();
  const { day: dayParam } = useParams<{ day: string }>();

  // 시간 기록 refs
  const baseSecondsRef = useRef<number>(0); // 원격/스토어 누적
  const sessionSecondsRef = useRef<number>(0); // 세션 누적

  // states
  const [isSettingOpen, setIsSettingOpen] = useState(false);
  const [studyTime, setStudyTime] = useState(0);
  const [currentMode, setCurrentMode] = useState<StudyMode | null>(null);
  const [completion, setCompletion] = useState<{
    open: boolean;
    completed: StudyMode | null;
  }>({ open: false, completed: null });
  const currentDay = Number.parseInt(dayParam || "1", 10);

  // App store: 필요한 값만
  const { packData, setCurrentDay } = useAppStore(
    useShallow((state) => ({
      packData: state.selectedPackData,
      setCurrentDay: state.setCurrentDay,
    }))
  );

  // 진행도 store 액션들
  const storeActions = useStudyProgressStore(
    useShallow((state) => ({
      setModeCompleted: state.setModeCompleted,
      updateSettings: state.updateSettings,
      getItemProgress: state.getItemProgress,
      setItemCompleted: state.setItemCompleted,
      getDayProgress: state.getDayProgress,
      getNextUncompletedIndex: state.getNextUncompletedIndex,
      getCurrentItemIndex: state.getCurrentItemIndex,
      addStudySeconds: state.addStudySeconds,
    }))
  );

  // Day 진행 스냅샷
  const dayProgress = useStudyProgressStore(
    useShallow((state) =>
      packData
        ? state.progress[packData.id]?.progressByDay[currentDay] || null
        : null
    )
  );

  useEffect(() => {
    setCurrentMode(null);
  }, [packData?.id, currentDay]);

  // 현재 Day의 저장된 누적시간으로 초기화
  useEffect(() => {
    if (!packData) return;
    const state = useStudyProgressStore.getState();
    const dp = state.getDayProgress(packData.id, currentDay) as any;
    const saved = Number(dp?.studySeconds ?? 0);
    baseSecondsRef.current = Number.isFinite(saved) ? saved : 0;
    sessionSecondsRef.current = 0;
    setStudyTime(baseSecondsRef.current + sessionSecondsRef.current);
  }, [packData?.id, currentDay]);

  // Active/Idle tracking
  const lastActivityRef = useRef<number>(Date.now());
  const isWindowFocusedRef = useRef<boolean>(
    document.visibilityState === "visible"
  );
  const unsyncedSecondsRef = useRef<number>(0);

  const idleThresholdMs = 60_000;
  const tickIntervalMs = 1000;
  const flushIntervalMs = 15_000;

  const isUserActive = useCallback(() => {
    const focused = isWindowFocusedRef.current;
    const delta = Date.now() - lastActivityRef.current;
    return focused && delta < idleThresholdMs;
  }, []);

  useEffect(() => {
    const onActivity = () => (lastActivityRef.current = Date.now());
    const onFocus = () => {
      isWindowFocusedRef.current = true;
      lastActivityRef.current = Date.now();
    };
    const onBlur = () => {
      isWindowFocusedRef.current = false;
    };
    window.addEventListener("mousemove", onActivity);
    window.addEventListener("keydown", onActivity);
    window.addEventListener("touchstart", onActivity);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    const onVis = () => {
      isWindowFocusedRef.current = document.visibilityState === "visible";
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("touchstart", onActivity);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // 원격/스토어 동기화로 dayProgress.studySeconds가 바뀌면 반영(더 큰 값 채택)
  useEffect(() => {
    const saved = Number((dayProgress as any)?.studySeconds ?? 0);
    if (Number.isFinite(saved) && saved > baseSecondsRef.current) {
      baseSecondsRef.current = saved;
      setStudyTime(baseSecondsRef.current + sessionSecondsRef.current);
    }
  }, [dayProgress?.studySeconds]);

  // Active/Idle tick: 세션 누적·표시
  useEffect(() => {
    const tick = () => {
      if (!packData) return;
      if (isUserActive() && currentMode) {
        sessionSecondsRef.current += 1;
        unsyncedSecondsRef.current += 1;
        setStudyTime(baseSecondsRef.current + sessionSecondsRef.current);
      }
    };
    const id = window.setInterval(tick, tickIntervalMs);
    return () => window.clearInterval(id);
  }, [packData, currentMode, isUserActive]);

  // 진행 시간 flush: store -> 원격
  const flushToServer = useCallback(async () => {
    if (!packData) {
      unsyncedSecondsRef.current = 0;
      return;
    }
    const s = unsyncedSecondsRef.current;
    if (!s || s <= 0) return;
    unsyncedSecondsRef.current = 0;
    try {
      await storeActions.addStudySeconds(packData.id, currentDay, s);
      baseSecondsRef.current += s;
      setStudyTime(baseSecondsRef.current + sessionSecondsRef.current);
    } catch (err) {
      console.error("flushToServer error:", err);
      unsyncedSecondsRef.current += s;
    }
  }, [packData, currentDay, storeActions]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void flushToServer();
    }, flushIntervalMs);
    const onVisibility = () => {
      if (document.visibilityState !== "visible") void flushToServer();
    };
    const onBeforeUnload = () => {
      void flushToServer();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onBeforeUnload);
      void flushToServer();
    };
  }, [flushToServer]);

  // labels/icons
  const labelMap = useMemo(
    () => ({
      introduction: "소개",
      vocab: "단어",
      sentence: "문장",
      workbook: "워크북",
    }),
    []
  );

  const iconMap: Record<StudyMode, React.ComponentType> = useMemo(
    () => ({
      introduction: Book,
      vocab: Search,
      sentence: Mic,
      workbook: PenTool,
    }),
    []
  );

  // settings
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

  const autoAdvance = useMemo(() => {
    const result =
      settings.studyMode === "assisted" && !!settings.autoProgressEnabled;
    console.log("🔥 autoAdvance calculation:", {
      studyMode: settings.studyMode,
      autoProgressEnabled: settings.autoProgressEnabled,
      result,
    });
    return result;
  }, [settings.studyMode, settings.autoProgressEnabled]);

  // plan / modes
  const dayPlan = useMemo(
    () => packData?.learningPlan.days.find((d) => d.day === currentDay) || null,
    [packData?.id, currentDay]
  );

  const normalizePlanMode = (t: string): StudyMode | null => {
    const v = String(t).toLowerCase().trim();
    if (v === "introduction" || v === "intro") return "introduction";
    if (v === "workbook" || v === "quiz") return "workbook";
    if (v.includes("vocab")) return "vocab";
    if (v.includes("sentence") || v.includes("sent")) return "sentence";
    return null;
  };

  // dayPlan.modes[].type을 그대로 core StudyMode로 사용
  const availableModeKeys = useMemo<StudyMode[]>(() => {
    if (!dayPlan) return [];
    const seq: StudyMode[] = [];
    for (const m of dayPlan.modes || []) {
      const core = normalizePlanMode(m.type as string);
      if (core && !seq.includes(core)) seq.push(core);
    }
    return seq;
  }, [dayPlan]);

  // 접근 제어: 이전 Day 완료 여부
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

      const groups = dayPlan.modes.filter(
        (m) => normalizePlanMode(m.type as string) === mode
      );

      if (groups.length === 0) return [];

      // ✅ 워크북 특별 처리
      if (mode === "workbook") {
        const allIds = groups.flatMap((g) => g.contentIds);

        // contentIds가 비어있으면 동적 생성
        if (allIds.length === 0) {
          try {
            console.log("🔥 Building workbook for day:", currentDay);
            const workbookItems = buildWorkbookForDayFromPack(
              packData,
              currentDay,
              4
            );
            console.log("🔥 Generated workbook items:", workbookItems.length);
            return workbookItems;
          } catch (error) {
            console.error("Failed to build workbook:", error);
            return [];
          }
        }

        // contentIds가 있으면 기존 로직
        const seen = new Set();
        const uniqIds = allIds.filter((id) =>
          seen.has(id) ? false : seen.add(id)
        );
        return packDataService.getContentsByIds(packData, uniqIds);
      }

      // 다른 모드는 기존 로직 유지
      const allIds = groups.flatMap((g) => g.contentIds);
      const seen = new Set();
      const uniqIds = allIds.filter((id) =>
        seen.has(id) ? false : seen.add(id)
      );

      const items = packDataService.getContentsByIds(packData, uniqIds);
      return items;
    },
    [packData, dayPlan, currentDay] // ✅ currentDay 의존성 추가
  );

  useEffect(() => {
    if (!packData || !dayPlan) return;
    const seq = availableModeKeys;
    if (seq.length === 0) return;
    if (!currentMode || !seq.includes(currentMode)) {
      const first = seq.find((m) => m !== "introduction") ?? seq[0];
      setCurrentMode(first);
    }
  }, [packData?.id, currentDay, dayPlan, availableModeKeys, currentMode]);

  const getItemProgress = useCallback(
    (itemId: string) => {
      if (!packData)
        return { isCompleted: false, lastStudied: null as string | null };
      const progress = storeActions.getItemProgress(
        packData.id,
        currentDay,
        itemId
      );
      return (
        progress ?? { isCompleted: false, lastStudied: null as string | null }
      );
    },
    [packData?.id, currentDay, storeActions.getItemProgress]
  );

  const getModeProgress = useCallback(
    (mode: StudyMode) => {
      const items = getModeData(mode);
      if (items.length === 0) return { completed: 0, total: 0, percentage: 0 };
      const completedCount = items.filter(
        (item) => getItemProgress(item.id)?.isCompleted
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

  const studyModes = useMemo(() => {
    return availableModeKeys
      .map((key) => {
        const Icon = iconMap[key] || Book;
        const completed = dayProgress?.completedModes?.[key] ?? false;

        const modeData = getModeData(key);
        const hasContent = Array.isArray(modeData) && modeData.length > 0;

        const progress = getModeProgress(key);

        return {
          key,
          label: labelMap[key] || key,
          icon: Icon,
          completed,
          available: hasContent,
          progress,
        };
      })
      .filter((m) => m.available);
  }, [
    availableModeKeys,
    dayProgress,
    labelMap,
    iconMap,
    getModeData,
    getModeProgress,
  ]);

  // handlers
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const handleSettingsChange = useCallback(
    (next: Partial<StudySettings>) => {
      if (!packData?.id) return;
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
    (itemId: string, completed = true) => {
      if (!packData || !currentMode) return;
      const cur = storeActions.getItemProgress(packData.id, currentDay, itemId);
      if (cur?.isCompleted !== completed) {
        storeActions.setItemCompleted(
          packData.id,
          currentDay,
          itemId,
          completed
        );
        if (!completed) {
          completionProcessingRef.current = false; // ✅ 완료 해제되면 다시 허용
        }
      }
    },
    [
      packData,
      currentDay,
      currentMode,
      storeActions.setItemCompleted,
      storeActions.getItemProgress,
    ]
  );

  const handleBack = useCallback(() => navigate("/calendar"), [navigate]);

  // core 타입 반환
  const getContentType = useCallback(
    (mode: StudyMode | null): StudyMode | "unknown" => {
      if (!mode) return "unknown";
      return mode;
    },
    []
  );

  // 초기 모드 선택: introduction 제외 우선
  // const selectInitialMode = useCallback(
  //   (modes: StudyMode[]): StudyMode | null => {
  //     const nonIntro = modes.filter((m) => m !== "introduction");
  //     if (nonIntro.length > 0) return nonIntro[0];
  //     return modes.length > 0 ? modes[0] : null;
  //   },
  //   []
  // );

  useEffect(() => {
    const onOpen = () => setIsSettingOpen(true);
    const onClose = () => setIsSettingOpen(false);

    // App.tsx에서 window.dispatchEvent(new Event('open-study-settings'))를 보낸다고 가정
    window.addEventListener("open-study-settings" as any, onOpen);
    window.addEventListener("close-study-settings" as any, onClose);

    return () => {
      window.removeEventListener("open-study-settings" as any, onOpen);
      window.removeEventListener("close-study-settings" as any, onClose);
    };
  }, []);

  // 모드 완료 처리: 반드시 core 타입으로 저장
  const handleModeComplete = useCallback(
    (completedMode: StudyMode) => {
      if (!packData || !dayPlan) return;
      if (completionProcessingRef.current) return;
      if (completion.open) return;

      const coreType = getContentType(completedMode);

      if (coreType === "unknown" || coreType === "introduction") {
        completionProcessingRef.current = true;
        setCompletion({ open: true, completed: completedMode });
        return;
      }

      const already = dayProgress?.completedModes?.[coreType];

      if (already) {
        completionProcessingRef.current = true;
        setCompletion({ open: true, completed: completedMode });
        return;
      }

      completionProcessingRef.current = true;
      try {
        storeActions.setModeCompleted(
          packData.id,
          currentDay,
          coreType,
          packData
        );

        // ✅ 자동 진행 로직 추가
        const shouldAutoProgress =
          settings.studyMode === "assisted" && settings.autoProgressEnabled;

        if (shouldAutoProgress) {
          // 자동 진행 시: 다음 모드로 바로 이동
          const seq = availableModeKeys;
          const idx = seq.indexOf(completedMode);
          const nextMode =
            idx >= 0 && idx < seq.length - 1 ? seq[idx + 1] : null;

          if (nextMode) {
            // 자동으로 다음 모드로 전환
            setTimeout(() => {
              setCurrentMode(nextMode);
              completionProcessingRef.current = false;
            }, 500);
            return;
          }
        }

        // 수동 진행이거나 마지막 모드인 경우: 완료 모달 표시
        setCompletion({ open: true, completed: completedMode });
      } finally {
        // 자동 진행이 아닌 경우는 여기서 처리됨
      }
    },
    [
      packData,
      dayPlan,
      currentDay,
      dayProgress,
      completion.open,
      storeActions,
      getContentType,
      settings.studyMode, // ✅ 추가
      settings.autoProgressEnabled, // ✅ 추가
      availableModeKeys, // ✅ 추가
    ]
  );

  const handleModeChange = useCallback(
    (mode: StudyMode) => {
      if (!packData || currentMode === mode) return;
      // completionProcessingRef.current = false;
      if (completion.open) setCompletion({ open: false, completed: null });
      setCurrentMode(mode);
      completionProcessingRef.current = false; // ✅ 전환 시 해제
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

    // ✅ 원래대로: 모드 완료 후에는 설정과 관계없이 다음 모드로 이동
    if (next) {
      setCurrentMode(next);
    } else {
      // 마지막 모드인 경우 다음 날짜로 이동
      const nextDay = currentDay + 1;
      const totalDays = packData?.learningPlan?.days?.length ?? 14;
      if (nextDay <= totalDays) {
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
    // completionProcessingRef.current = false;
  }, []);

  const renderContent = useCallback(() => {
    // console.log("🔥 renderContent autoAdvance:", autoAdvance);
    // console.log("🔥 renderContent settings:", settings);
    if (!currentMode || !packData) return null;
    const items = getModeData(currentMode);
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
      autoAdvance, // 도움 모드에서 자동 진행
    };

    const key = `${currentMode}-${packData.id}-${currentDay}`;

    switch (contentType) {
      case "introduction":
        return (
          <LearningMethodIntro
            key={`intro-${key}`}
            methods={packData.learningMethods}
            packId={packData.id}
            onComplete={onModeComplete}
          />
        );
      case "vocab":
        return <VocabularyMode key={key} items={items} {...baseProps} />;
      case "sentence":
        return (
          <SentenceMode
            key={key}
            items={items}
            learningMethod="skim"
            {...baseProps}
          />
        );
      case "workbook":
        return <WorkbookMode key={key} items={items} {...baseProps} />;
      default:
        return null;
    }
  }, [
    currentMode,
    packData,
    currentDay,
    settings,
    isSettingOpen,
    autoAdvance,
    getModeData,
    getContentType,
    getInitialItemIndex,
    getItemProgress,
    handleItemCompleted,
    handleModeComplete,
    handleSettingsChange,
    handleAutoProgressChange,
    handleStudyModeChange,
  ]);

  // guards
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

  if (availableModeKeys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          표시할 학습 모드가 없습니다
        </h2>
        <p className="text-gray-600">
          해당 Day의 플랜에 유효한 모드가 없거나 콘텐츠가 비어있습니다.
        </p>
        <button
          onClick={() => navigate("/calendar")}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg"
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

  const completedModeCount = studyModes.filter((m) => m.completed).length;
  const totalModeCount = studyModes.length;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/calendar")}
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
          // ✅ 설정에 따라 버튼 텍스트 변경
          confirmText={
            settings.studyMode === "immersive" || !settings.autoProgressEnabled
              ? "확인" // 몰입 모드나 자동 진행 OFF일 때
              : "다음으로" // 도움 모드 + 자동 진행 ON일 때
          }
          cancelText="다시 학습하기"
          onConfirm={handleConfirmNext}
          onClose={handleCloseModal}
        />

        <StudySettingsSheet
          open={isSettingOpen}
          onClose={() => setIsSettingOpen(false)}
          settings={settings}
          onModeChange={handleStudyModeChange}
          onAutoChange={handleAutoProgressChange}
          onAutoPlayChange={(v) =>
            handleSettingsChange({ autoPlayOnSelect: v })
          }
        />
      </div>
    </ErrorBoundary>
  );
};

export default StudyInterface;
