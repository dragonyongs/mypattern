// src/shared/hooks/useStudyModeManager.ts
import { useCallback, useMemo } from "react";
import { Book, MessageSquare, PenTool } from "lucide-react"; // 🔥 실제 컴포넌트 import
import { StudyMode } from "@/types";
import { useDayProgress } from "./useAppHooks";

export const useStudyModeManager = (
  packId: string,
  currentDay: number,
  currentMode: StudyMode,
  onModeChange: (mode: StudyMode) => void
) => {
  const { dayProgress, markModeCompleted, isModeAccessible } = useDayProgress(
    packId,
    currentDay
  );

  // 🔥 공통 모드 전환 로직
  const handleModeSwitch = useCallback(
    (targetMode: StudyMode) => {
      const isAccessible = isModeAccessible(targetMode);

      // 접근 불가능한 모드는 차단
      if (!isAccessible) {
        console.warn(`Mode ${targetMode} is not accessible`);
        return false;
      }

      // 완료된 모드도 재방문 허용
      onModeChange(targetMode);
      return true;
    },
    [dayProgress, isModeAccessible, onModeChange]
  );

  // 🔥 모드별 상태 정보 - 아이콘을 실제 컴포넌트로 반환
  const studyModes = useMemo(
    () => [
      {
        key: "vocab" as StudyMode,
        label: "단어",
        icon: Book, // 🔥 문자열이 아닌 실제 컴포넌트
        completed: dayProgress.vocab,
        available: isModeAccessible("vocab"),
      },
      {
        key: "sentence" as StudyMode,
        label: "문장",
        icon: MessageSquare, // 🔥 실제 컴포넌트
        completed: dayProgress.sentence,
        available: isModeAccessible("sentence"),
      },
      {
        key: "workbook" as StudyMode,
        label: "워크북",
        icon: PenTool, // 🔥 실제 컴포넌트
        completed: dayProgress.workbook,
        available: isModeAccessible("workbook"),
      },
    ],
    [dayProgress, isModeAccessible]
  );

  // 🔥 모드 완료 처리
  const handleModeCompletion = useCallback(
    (completedMode: StudyMode) => {
      markModeCompleted(currentDay, completedMode);

      // 다음 모드 자동 전환 로직
      const nextModeMap: Record<StudyMode, StudyMode | null> = {
        vocab: "sentence",
        sentence: "workbook",
        workbook: null,
      };

      const nextMode = nextModeMap[completedMode];
      if (nextMode && isModeAccessible(nextMode)) {
        setTimeout(() => handleModeSwitch(nextMode), 500);
      }
    },
    [currentDay, markModeCompleted, handleModeSwitch, isModeAccessible]
  );

  return {
    studyModes,
    handleModeSwitch,
    handleModeCompletion,
    currentProgress: dayProgress,
  };
};
