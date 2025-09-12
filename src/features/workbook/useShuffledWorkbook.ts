// src/features/workbook/useShuffledWorkbook.ts
import { useEffect } from "react";
import {
  getShuffledItem,
  warmupShuffles,
} from "@/utils/workbook.shuffle.runtime";

export function useShuffledWorkbook(
  items: WorkbookItem[],
  currentIndex: number,
  dayKey: string,
  shuffleWithSeed: <T>(a: T[], s: string) => T[],
  prefetchRadius = 8
) {
  useEffect(() => {
    warmupShuffles(
      items,
      dayKey,
      currentIndex,
      prefetchRadius,
      shuffleWithSeed
    );
  }, [items, dayKey, currentIndex, prefetchRadius, shuffleWithSeed]);

  // 현재 문제는 즉시 셔플해 반환 (렌더 시점 1회)
  const current = getShuffledItem(items[currentIndex], dayKey, shuffleWithSeed);
  return { current };
}
