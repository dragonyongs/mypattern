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

// 🔥 특정 팩 데이터를 로드하는 훅
export const usePackData = (packId: string | null) => {
  const [packData, setPackData] = useState<PackData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPack = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      console.log(`🔍 Loading pack data: ${id}`);
      const data = await packDataService.loadPackData(id);

      setPackData(data);
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
