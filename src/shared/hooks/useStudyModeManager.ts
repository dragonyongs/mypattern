// src/shared/hooks/useStudyModeManager.ts
import { useCallback, useMemo } from "react";
import { Book, MessageSquare, PenTool } from "lucide-react"; // 🔥 실제 컴포넌트 import
import { StudyMode } from "@/types";
import { useDayProgress } from "./useAppHooks";
import { StudySettings } from "@/types";

export const useStudyModeManager = (
  packId: string,
  currentDay: number,
  onModeChange: (mode: StudyMode) => void,
  packData?: any,
  settings?: StudySettings
) => {
  const { dayProgress, markModeCompleted } = useDayProgress(packId, currentDay);

  // 🔥 현재 일자의 실제 모드들을 가져오기
  const currentDayModes = useMemo(() => {
    if (!packData?.learningPlan?.days) return [];
    const dayPlan = packData.learningPlan.days.find(
      (d: any) => d.day === currentDay
    );
    return dayPlan?.modes || [];
  }, [packData, currentDay]);

  // 🔥 모드별 상태 정보 - 아이콘을 실제 컴포넌트로 반환
  const studyModes = useMemo(() => {
    const availableModes = [];

    const hasVocabMode = currentDayModes.some(
      (mode: any) => mode.type === "vocab" || mode.type?.includes("vocab")
    );
    if (hasVocabMode) {
      availableModes.push({
        key: "vocab" as StudyMode,
        label: "단어",
        icon: Book,
        completed: dayProgress.vocab,
        available: true,
      });
    }

    const hasSentenceMode = currentDayModes.some(
      (mode: any) => mode.type === "sentence" || mode.type?.includes("sentence")
    );
    if (hasSentenceMode) {
      availableModes.push({
        key: "sentence" as StudyMode,
        label: "문장",
        icon: MessageSquare,
        completed: dayProgress.sentence,
        available: true,
      });
    }

    const workbookMode = currentDayModes.find(
      (mode: any) => mode.type === "workbook"
    );
    if (
      workbookMode &&
      Array.isArray(workbookMode.contentIds) &&
      workbookMode.contentIds.length > 0
    ) {
      availableModes.push({
        key: "workbook" as StudyMode,
        label: "워크북",
        icon: PenTool,
        completed: dayProgress.workbook,
        available: true,
      });
    }

    return availableModes;
  }, [currentDayModes, dayProgress]);

  // ✅ 자동 진행 가능 여부 확인 로직
  const shouldAutoProgress = useMemo(() => {
    if (!settings) return false;
    // 도움 모드이면서 자동 진행이 활성화된 경우만
    return settings.studyMode === "assisted" && settings.autoProgressEnabled;
  }, [settings?.studyMode, settings?.autoProgressEnabled]);

  // 🔥 모드 완료 처리

  // 🔥 공통 모드 전환 로직
  const handleModeSwitch = useCallback(
    (targetMode: StudyMode) => {
      onModeChange(targetMode);
      return true;
    },
    [onModeChange]
  );

  // ✅ 수정된 모드 완료 처리
  // ✅ 수정된 모드 완료 처리 (1개 매개변수만 전달)
  const handleModeCompletion = useCallback(
    (completedMode: StudyMode) => {
      // ✅ 1개 매개변수만 전달
      markModeCompleted(completedMode as any);

      // ✅ 자동 진행 설정 확인 후에만 다음 모드로 전환
      if (!shouldAutoProgress) return;

      const availableModeKeys = studyModes.map((m) => m.key);
      const currentIndex = availableModeKeys.indexOf(completedMode);
      const nextMode = availableModeKeys[currentIndex + 1];

      if (nextMode) {
        setTimeout(() => handleModeSwitch(nextMode), 500);
      }
    },
    [markModeCompleted, shouldAutoProgress, handleModeSwitch, studyModes]
  );

  return {
    studyModes,
    handleModeSwitch,
    handleModeCompletion,
    currentProgress: dayProgress,
  };
};
