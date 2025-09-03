// src/shared/hooks/usePackData.ts - PackSelectPage용 전용 훅

import { useState, useEffect, useCallback } from "react";
import { packDataService } from "@/shared/services/packDataService";

// PackSelectPage용 PackData 인터페이스
export interface PackData {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  level: "beginner" | "intermediate" | "advanced";
  totalDays: number;
  totalLessons?: number;
  difficulty: number; // 1-5
  rating: number;
  userCount: number;
  tags: string[];
  thumbnail?: string;
  learningMethods: Array<{
    name: string;
    icon: string;
    description: string;
    days: string;
  }>;
  features?: string[];
  price: {
    type: "free" | "paid";
    amount?: number;
    currency?: string;
  };
}

interface UsePackDataReturn {
  packs: PackData[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// JSON 파일로부터 팩 메타데이터를 변환하는 함수
const transformPackData = (rawPackData: any): PackData => {
  return {
    id: rawPackData.id || "unknown",
    title: rawPackData.title || "제목 없음",
    subtitle: rawPackData.subtitle || "",
    description: rawPackData.description || rawPackData.title || "설명 없음",
    level: rawPackData.level || "beginner",
    totalDays: rawPackData.totalDays || rawPackData.days?.length || 14,
    totalLessons:
      rawPackData.totalLessons || rawPackData.days?.length * 3 || 42,
    difficulty:
      rawPackData.difficulty ||
      (rawPackData.level === "beginner"
        ? 2
        : rawPackData.level === "intermediate"
        ? 3
        : 4),
    rating: rawPackData.rating || 4.5,
    userCount:
      rawPackData.userCount || Math.floor(Math.random() * 10000) + 1000,
    tags: rawPackData.tags || [rawPackData.level || "basic"],
    thumbnail: rawPackData.thumbnail,
    learningMethods: rawPackData.learningMethods || [
      {
        name: "단어학습",
        icon: "BookOpen",
        description: "체계적 어휘 학습",
        days: `1-${rawPackData.totalDays || 14}`,
      },
      {
        name: "문장연습",
        icon: "MessageSquare",
        description: "실용적 문장 연습",
        days: `3-${rawPackData.totalDays || 14}`,
      },
      {
        name: "워크북",
        icon: "PenTool",
        description: "다양한 문제 풀이",
        days: `7-${rawPackData.totalDays || 14}`,
      },
    ],
    features: rawPackData.features || ["음성 지원", "진도 관리", "복습 시스템"],
    price: rawPackData.price || { type: "free" },
  };
};

export const usePackData = (): UsePackDataReturn => {
  const [packs, setPacks] = useState<PackData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPacks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // ✅ packDataService에서 실제 존재하는 팩 목록 가져오기
      const availablePackIds = await packDataService.loadPackList();

      console.log("[usePackData] 실제 존재하는 팩 목록:", availablePackIds);

      if (availablePackIds.length === 0) {
        console.warn("[usePackData] 사용 가능한 팩이 없습니다.");
        setPacks([]);
        return;
      }

      // 각 팩의 데이터를 병렬로 로드
      const packPromises = availablePackIds.map(async (packId) => {
        try {
          const rawPackData = await packDataService.loadPackData(packId);
          return transformPackData(rawPackData);
        } catch (err) {
          console.warn(`Failed to load pack data for ${packId}:`, err);
          return null; // 실패시 null 반환
        }
      });

      const packsData = await Promise.all(packPromises);
      const validPacks = packsData.filter(
        (pack): pack is PackData => pack !== null
      );

      console.log(
        "[usePackData] 성공적으로 로드된 팩들:",
        validPacks.map((p) => p.id)
      );
      setPacks(validPacks);
    } catch (err) {
      setError("학습팩 데이터를 불러올 수 없습니다.");
      console.error("Pack data fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refetch = useCallback(() => fetchPacks(), [fetchPacks]);

  useEffect(() => {
    fetchPacks();
  }, [fetchPacks]);

  return { packs, loading, error, refetch };
};
