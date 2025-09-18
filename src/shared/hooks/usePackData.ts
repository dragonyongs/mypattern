// src/shared/hooks/usePackData.ts
import { useState, useEffect, useCallback } from "react";
import { packDataService } from "@/shared/services/packDataService";
import type { PackData } from "@/types";

export interface PackMetadata {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  level?: "beginner" | "intermediate" | "advanced";
  tags?: string[];
  totalDays: number;
}

export const useAvailablePacks = () => {
  const [packs, setPacks] = useState<PackMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPacks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const availablePacks = await packDataService.getAvailablePacks();
      setPacks(availablePacks);
    } catch (err) {
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

export const usePackData = (packId: string | null) => {
  const [packData, setPackData] = useState<PackData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPack = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await packDataService.loadPackData(id);
      // packDataService 내부에서 빌더/후처리까지 완료되어 내려오므로 그대로 저장
      setPackData(data);
    } catch (err) {
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
