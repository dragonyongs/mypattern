import { useMemo, useCallback } from "react";
import { useAppSelector } from "@/providers/AppProvider";
import { useUserLevel } from "./useUserLevel";
import type { DailyPattern } from "../types";

export function useDailyPatterns() {
  const { levelContent, userLevel } = useUserLevel();
  const chunks = useAppSelector((state) => state.chunks);

  const dailyPatterns = useMemo((): DailyPattern[] => {
    // chunks를 기반으로 사용자 레벨에 맞는 패턴 선별
    const levelFilteredChunks = chunks.filter((chunk) => {
      // 기본적으로 beginner는 모든 chunk, intermediate/advanced는 선별
      if (userLevel === "beginner") return true;
      if (userLevel === "intermediate") return chunk.frequencyHint >= 50;
      return chunk.frequencyHint >= 70;
    });

    return levelFilteredChunks.slice(0, 3).map((chunk, index) => ({
      id: chunk.id,
      text: chunk.text,
      korean: chunk.koLiteral,
      difficulty: userLevel,
      category: chunk.function,
      estimatedTime: 5, // 기본 5분
      completed: false,
    }));
  }, [chunks, userLevel]);

  const startPattern = useCallback((patternId: string) => {
    console.log("패턴 학습 시작:", patternId);
    // 실제 학습 로직 구현 예정
  }, []);

  const completePattern = useCallback((patternId: string) => {
    console.log("패턴 학습 완료:", patternId);
    // 완료 처리 로직
  }, []);

  return {
    dailyPatterns,
    totalPatterns: dailyPatterns.length,
    startPattern,
    completePattern,
  };
}
