// src/shared/hooks/usePackData.ts

import { useState, useEffect, useCallback } from "react";
import { packDataService } from "@/shared/services/packDataService";
import type { PackData } from "@/types"; // 개선된 PackData 타입을 import 합니다.

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

      // 중요: 이제 loadPackList 대신, 우리가 알고 있는 팩 ID 목록을 직접 사용합니다.
      // 향후 이 부분은 API 호출로 대체될 수 있습니다.
      const availablePackIds = ["real-voca-basic", "everyday-convo-3days"]; // 예: "real-voca-advanced" 등 추가

      if (availablePackIds.length === 0) {
        setPacks([]);
        return;
      }

      // 각 팩의 전체 데이터를 병렬로 로드합니다.
      const packPromises = availablePackIds.map((packId) =>
        packDataService.loadPackData(packId)
      );

      const loadedPacks = await Promise.all(packPromises);

      // 전체 데이터에서 목록 표시에 필요한 메타데이터만 추출합니다.
      const metadataList = loadedPacks.map(
        (pack): PackMetadata => ({
          id: pack.id,
          title: pack.title,
          subtitle: pack.subtitle,
          description: pack.description,
          level: pack.level,
          tags: pack.tags,
          totalDays: pack.learningPlan.totalDays,
        })
      );

      setPacks(metadataList);
    } catch (err) {
      console.error("Pack data fetch error:", err);
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
