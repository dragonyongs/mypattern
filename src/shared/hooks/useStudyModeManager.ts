// src/shared/hooks/useStudyModeManager.ts
import { useCallback, useMemo } from "react";
import { Book, MessageSquare, PenTool } from "lucide-react"; // 🔥 실제 컴포넌트 import
import { StudyMode } from "@/types";
import { useDayProgress } from "./useAppHooks";

export const useStudyModeManager = (
  packId: string,
  currentDay: number,
  currentMode: StudyMode,
  onModeChange: (mode: StudyMode) => void,
  packData?: any // 🔥 packData 추가
) => {
  const { dayProgress, markModeCompleted, isModeAccessible } = useDayProgress(
    packId,
    currentDay
  );

  // 🔥 현재 일자의 실제 모드들을 가져오기
  const currentDayModes = useMemo(() => {
    if (!packData?.learningPlan?.days) return [];
    const dayPlan = packData.learningPlan.days.find(
      (d: any) => d.day === currentDay
    );
    return dayPlan?.modes || [];
  }, [packData, currentDay]);

  // 🔥 공통 모드 전환 로직
  const handleModeSwitch = useCallback(
    (targetMode: StudyMode) => {
      const isAccessible = isModeAccessible(targetMode);
      if (!isAccessible) {
        console.warn(`Mode ${targetMode} is not accessible`);
        return false;
      }
      onModeChange(targetMode);
      return true;
    },
    [dayProgress, isModeAccessible, onModeChange]
  );

  // 🔥 모드별 상태 정보 - 아이콘을 실제 컴포넌트로 반환
  const studyModes = useMemo(() => {
    const availableModes = [];

    // vocab 모드 확인
    const hasVocabMode = currentDayModes.some(
      (mode: any) => mode.type === "vocab" || mode.type?.includes("vocab")
    );
    if (hasVocabMode) {
      availableModes.push({
        key: "vocab" as StudyMode,
        label: "단어",
        icon: Book,
        completed: dayProgress.vocab,
        available: isModeAccessible("vocab"),
      });
    }

    // sentence 모드 확인
    const hasSentenceMode = currentDayModes.some(
      (mode: any) => mode.type === "sentence" || mode.type?.includes("sentence")
    );
    if (hasSentenceMode) {
      availableModes.push({
        key: "sentence" as StudyMode,
        label: "문장",
        icon: MessageSquare,
        completed: dayProgress.sentence,
        available: isModeAccessible("sentence"),
      });
    }

    // workbook 모드 확인 (실제 존재하고 contentIds가 있는 경우만)
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
        available: isModeAccessible("workbook"),
      });
    }

    return availableModes;
  }, [currentDayModes, dayProgress, isModeAccessible]);

  // 🔥 모드 완료 처리
  const handleModeCompletion = useCallback(
    (completedMode: StudyMode) => {
      markModeCompleted(currentDay, completedMode);

      // 다음 모드 자동 전환 로직 (실제 존재하는 모드만)
      const availableModeKeys = studyModes.map((m) => m.key);
      const currentIndex = availableModeKeys.indexOf(completedMode);
      const nextMode = availableModeKeys[currentIndex + 1];

      if (nextMode && isModeAccessible(nextMode)) {
        setTimeout(() => handleModeSwitch(nextMode), 500);
      }
    },
    [
      currentDay,
      markModeCompleted,
      handleModeSwitch,
      isModeAccessible,
      studyModes,
    ]
  );

  return {
    studyModes,
    handleModeSwitch,
    handleModeCompletion,
    currentProgress: dayProgress,
  };
};
