// src/shared/hooks/usePackData.ts

import { useState, useEffect, useCallback } from "react";
import { packDataService } from "@/shared/services/packDataService";
import { generateWorkbookForDay } from "@/shared/utils/packUtils";
import type { PackData } from "@/types";

// PackSelectPage 등에서 목록으로 보여줄 때 필요한 최소한의 메타데이터 타입
export interface PackMetadata {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  level?: "beginner" | "intermediate" | "advanced";
  tags?: string[];
  totalDays: number;
}

// 여러 팩의 메타데이터를 가져오는 훅
export const useAvailablePacks = () => {
  const [packs, setPacks] = useState<PackMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPacks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("🔍 Fetching available packs...");
      const availablePacks = await packDataService.getAvailablePacks();
      setPacks(availablePacks);
      console.log(`✅ Loaded ${availablePacks.length} available packs`);
    } catch (err) {
      console.error("❌ Pack data fetch error:", err);
      setError("학습팩 목록을 불러오는 데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPacks();
  }, [fetchPacks]);

  return { packs, loading, error, refetch: fetchPacks };
};

// 🔥 특정 팩 데이터를 로드하는 훅 (워크북 자동 생성 로직 추가)
export const usePackData = (packId: string | null) => {
  const [packData, setPackData] = useState<PackData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPack = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      console.log(`🔍 Loading pack data: ${id}`);

      // 기본 팩 데이터 로드
      const data = await packDataService.loadPackData(id);

      // 🔥 워크북 자동 생성 처리
      if (data.learningPlan?.days) {
        const enhancedData = { ...data };

        // 각 일자별로 워크북 자동 생성 조건 확인 및 생성
        for (let i = 0; i < enhancedData.learningPlan.days.length; i++) {
          const dayPlan = enhancedData.learningPlan.days[i];
          const dayNumber = dayPlan.day;

          // 조건부 워크북 생성
          const generatedWorkbooks = generateWorkbookForDay(
            dayPlan,
            dayNumber,
            enhancedData.contents,
            4 // 기본 4개 옵션
          );

          if (generatedWorkbooks.length > 0) {
            // 생성된 워크북을 contents에 추가
            enhancedData.contents.push(
              ...generatedWorkbooks.map((wb) => ({
                id: wb.id,
                type: "workbook" as const,
                category: "auto-generated",
                question: wb.question,
                options: wb.options,
                correctAnswer: wb.correctAnswer,
                answer: wb.correctAnswer, // 호환성을 위해 추가
                explanation: wb.explanation,
                relatedSentenceId: wb.relatedSentenceId,
              }))
            );

            // 워크북 모드의 contentIds 업데이트
            const workbookMode = dayPlan.modes?.find(
              (mode: any) => mode.type === "workbook"
            );
            if (workbookMode && Array.isArray(workbookMode.contentIds)) {
              workbookMode.contentIds.push(
                ...generatedWorkbooks.map((wb) => wb.id)
              );
            }

            console.log(
              `📝 Day ${dayNumber}: ${generatedWorkbooks.length}개 워크북 문제가 자동 생성되어 추가됨`
            );
          }
        }

        setPackData(enhancedData);
      } else {
        setPackData(data);
      }

      console.log(`✅ Pack data loaded: ${data.title}`);
    } catch (err) {
      console.error(`❌ Failed to load pack ${id}:`, err);
      setError(`학습팩 "${id}"을 불러오는 데 실패했습니다.`);
      setPackData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (packId) {
      loadPack(packId);
    } else {
      setPackData(null);
      setError(null);
    }
  }, [packId, loadPack]);

  return { packData, loading, error, reload: () => packId && loadPack(packId) };
};
