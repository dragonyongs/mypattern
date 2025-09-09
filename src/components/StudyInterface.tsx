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
  // ✅ 모든 hooks를 최상단에 한번에 호출
  const navigate = useNavigate();
  const { day: dayParam } = useParams<{ day: string }>();
  const currentDay = parseInt(dayParam || "1", 10);

  const packData = useAppStore((state) => state.selectedPackData);
  const setCurrentDay = useAppStore((state) => state.setCurrentDay);

  const {
    setModeCompleted,
    getSettings,
    // 🔥 학습 위치 관리 hooks 추가
    getCurrentItemIndex,
    setCurrentItemIndex,
    getNextUncompletedIndex,
    autoMoveToNextMode,
  } = useStudyProgressStore();

  const dayProgress = useStudyProgressStore((state) =>
    packData ? state.progress[packData.id]?.progressByDay[currentDay] : null
  );

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
  const settings = useMemo(
    () => (packData ? getSettings(packData.id) : {}),
    [packData, getSettings]
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

  const [currentMode, setCurrentMode] = useState<StudyMode | null>(null);
  const [completion, setCompletion] = useState<{
    open: boolean;
    completed: StudyMode | null;
  }>({
    open: false,
    completed: null,
  });

  // ✅ 모든 useCallback과 useMemo를 조건부 렌더링 이전에 호출
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

  const getSharedContent = useCallback(() => {
    if (!packData || !dayPlan)
      return { vocab: [], sentences: [], workbook: [] };

    const allContentIds = dayPlan.modes.flatMap((mode) => mode.contentIds);
    const allContents = packDataService.getContentsByIds(
      packData,
      allContentIds
    );

    const vocab = allContents.filter((item) => item.type === "vocabulary");
    const sentences = allContents.filter((item) => item.type === "sentence");
    const workbook = allContents.filter((item) => item.type === "workbook");

    return { vocab, sentences, workbook };
  }, [packData, dayPlan]);

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

  // 🔥 학습 위치 계산 함수 추가
  const getInitialItemIndex = useCallback(
    (mode: StudyMode) => {
      if (!packData) return 0;

      const modeData = getModeData(mode);
      if (!modeData.length) return 0;

      const contentIds = modeData.map((item) => item.id);

      // 🔥 각 아이템의 완료 상태 확인
      const completionStates = contentIds.map((itemId, index) => {
        const progress = getItemProgress(itemId);
        return {
          index,
          itemId,
          isCompleted: progress.isCompleted,
        };
      });

      // 미완료된 첫 번째 아이템 찾기
      const firstUncompletedItem = completionStates.find(
        (item) => !item.isCompleted
      );

      // 저장된 위치 확인
      const savedIndex = getCurrentItemIndex(packData.id, currentDay, mode);

      let optimalIndex;

      if (firstUncompletedItem) {
        // 🔥 미완료 아이템이 있는 경우
        // 저장된 위치와 첫 번째 미완료 위치 중 더 앞선 것 선택
        optimalIndex = Math.min(savedIndex, firstUncompletedItem.index);
      } else {
        // 🔥 모든 아이템이 완료된 경우
        // 처음부터 다시 시작하거나 저장된 위치 중 선택
        const completedCount = completionStates.length;

        // "다시풀기"로 모든 것이 초기화된 경우를 감지
        const recentlyResetItems = completionStates.filter((item) => {
          const progress = getItemProgress(item.itemId);
          // 최근 1분 내에 초기화된 아이템들 확인
          return (
            !progress.isCompleted &&
            progress.lastStudied &&
            Date.now() - new Date(progress.lastStudied).getTime() < 60000
          );
        });

        if (recentlyResetItems.length > 0) {
          // 최근에 초기화된 아이템들이 있으면 처음부터 시작
          optimalIndex = 0;
        } else {
          // 자연스럽게 모든 것이 완료된 경우 저장된 위치 유지
          optimalIndex = Math.min(savedIndex, contentIds.length - 1);
        }
      }

      console.log(`🔍 Mode ${mode} 위치 계산 (개선됨):`, {
        totalItems: contentIds.length,
        completedCount: completionStates.filter((s) => s.isCompleted).length,
        firstUncompletedIndex: firstUncompletedItem?.index ?? "none",
        savedIndex,
        optimalIndex,
        logic: firstUncompletedItem ? "has uncompleted" : "all completed",
      });

      return optimalIndex;
    },
    [packData, currentDay, getModeData, getItemProgress, getCurrentItemIndex]
  );

  const handleItemCompleted = useCallback(
    (itemId: string, completed: boolean = true) => {
      if (!packData || !currentMode) return;

      console.log(`🎯 Item completed: ${itemId} = ${completed}`);

      // 🔥 즉시 스토어에 저장
      useStudyProgressStore
        .getState()
        .setItemCompleted(packData.id, currentDay, itemId, completed);

      // 🔥 현재 아이템의 인덱스 계산
      const modeData = getModeData(currentMode);
      const currentItemIndex = modeData.findIndex((item) => item.id === itemId);

      if (currentItemIndex >= 0) {
        // 다음 아이템 인덱스로 위치 업데이트
        const nextIndex = Math.min(currentItemIndex + 1, modeData.length - 1);
        setCurrentItemIndex(packData.id, currentDay, currentMode, nextIndex);

        console.log(`📍 Updated current position to index: ${nextIndex}`);
      }

      // 🔥 상태 업데이트 후 로그
      setTimeout(() => {
        const updatedProgress = useStudyProgressStore
          .getState()
          .getItemProgress(packData.id, currentDay, itemId);
        console.log(`📊 Updated item progress for ${itemId}:`, updatedProgress);
      }, 100);
    },
    [packData, currentDay, currentMode, getModeData, setCurrentItemIndex]
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

      if (settings?.autoProgressEnabled && next) {
        // 🔥 autoMoveToNextMode 사용으로 자동 이동
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

      setCompletion({ open: true, completed: completedMode });
    },
    [
      completion.open,
      packData,
      dayPlan,
      currentDay,
      setModeCompleted,
      settings,
      availableModeKeys,
      autoMoveToNextMode, // 🔥 추가
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
      // 🔥 다음 모드로 이동 시 위치 초기화
      const nextMode = autoMoveToNextMode(
        packData!.id,
        currentDay,
        completion.completed,
        packData!
      );
      if (nextMode) {
        setCurrentMode(nextMode);
      }
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
  }, [
    availableModeKeys,
    completion.completed,
    currentDay,
    navigate,
    setCurrentDay,
    packData,
    autoMoveToNextMode,
  ]);

  const handleCloseModal = useCallback(() => {
    setCompletion({ open: false, completed: null });
  }, []);

  // ✅ 모드별 진행률 계산 함수
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
    [getModeData, getItemProgress, currentDay, packData]
  );

  // ✅ 수정된 studyModes - progress 정보 포함
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

      // 🔥 개별 아이템 진행률 계산
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

  // 🔥 모드 변경 시 최적의 시작 위치로 이동
  const handleModeChange = useCallback(
    (mode: StudyMode) => {
      if (!packData) return;

      setCurrentMode(mode);

      // 🔥 해당 모드의 최적 시작 인덱스 계산
      const modeData = getModeData(mode);
      const contentIds = modeData.map((item) => item.id);

      // 기존에 저장된 위치가 있으면 그것을 사용, 없으면 다음 미완료 아이템
      const savedIndex = getCurrentItemIndex(packData.id, currentDay, mode);
      const nextUncompletedIndex = getNextUncompletedIndex(
        packData.id,
        currentDay,
        mode,
        contentIds
      );

      // 저장된 위치와 다음 미완료 위치 중 더 앞선 것 사용
      const optimalIndex = Math.max(savedIndex, nextUncompletedIndex);

      setCurrentItemIndex(packData.id, currentDay, mode, optimalIndex);

      console.log(`🔄 Mode changed to ${mode}:`);
      console.log(`  - Saved index: ${savedIndex}`);
      console.log(`  - Next uncompleted: ${nextUncompletedIndex}`);
      console.log(`  - Using optimal: ${optimalIndex}`);
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

  // ✅ useEffect를 마지막에 호출
  useEffect(() => {
    if (availableModeKeys.length && !currentMode) {
      const firstMode = availableModeKeys[0];
      handleModeChange(firstMode);
    } else if (
      availableModeKeys.length &&
      currentMode &&
      !availableModeKeys.includes(currentMode)
    ) {
      handleModeChange(availableModeKeys[0]);
    }
  }, [availableModeKeys, currentMode, handleModeChange]);

  // ✅ Day 접근 권한 검증
  const isDayAccessible = useMemo(() => {
    if (!packData) return false;

    // Day 1은 항상 접근 가능
    if (currentDay === 1) return true;

    // 이전 Day가 완료되었는지 확인
    const previousDay = currentDay - 1;
    const previousDayProgress = packData
      ? useStudyProgressStore
          .getState()
          .getDayProgress(packData.id, previousDay)
      : null;

    return previousDayProgress?.isCompleted ?? false;
  }, [packData, currentDay]);

  // ✅ 접근 불가능한 경우 처리
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

  // ✅ 모든 hooks 호출 완료 후 조건부 렌더링 시작
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
    return <div>Loading...</div>;
  }

  // ✅ 컨텐츠 렌더링 함수
  const renderContent = () => {
    const items = getModeData(currentMode);
    const learningMethod = getLearningMethod(currentMode);
    const contentType = getContentType(currentMode);

    // 🔥 초기 아이템 인덱스 계산
    const initialItemIndex = getInitialItemIndex(currentMode);

    // ✅ 공통 props 정의
    const commonProps = {
      packId: packData.id,
      currentDay,
      dayNumber: currentDay,
      getItemProgress,
      onItemCompleted: handleItemCompleted,
      onComplete: () => handleModeComplete(currentMode),
      // 🔥 초기 인덱스 추가
      initialItemIndex,
    };

    // ✅ studyMode를 key로 추가하여 모드 변경 시 컴포넌트 강제 재생성
    const componentKey = `${currentMode}-${
      packData.id
    }-${currentDay}-${Date.now()}`;

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
          />
        );
      default:
        return null;
    }
  };

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
                  onClick={() => available && handleModeChange(key)} // 🔥 handleModeChange 사용
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
                  {/* 🔥 개별 아이템 진행률 표시 */}
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
          onConfirm={handleConfirmNext}
          onClose={handleCloseModal}
        />
      </div>
    </ErrorBoundary>
  );
};
