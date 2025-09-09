// src/shared/hooks/useStudyNavigation.ts
import { useState, useCallback, useEffect, useRef } from "react";

export interface UseStudyNavigationProps<T> {
  items: T[];
  initialIndex?: number;
  onItemCompleted?: (itemId: string, completed: boolean) => void;
  packId: string;
  currentDay: number;
  mode: string;
}

export function useStudyNavigation<T extends { id: string }>({
  items,
  initialIndex = 0,
  onItemCompleted,
  packId,
  currentDay,
  mode,
}: UseStudyNavigationProps<T>) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [completedItems, setCompletedItems] = useState<Set<number>>(new Set());

  // 🔥 안전한 상태 업데이트를 위한 ref
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // 🔥 현재 아이템
  const currentItem = items[currentIndex];

  // 🔥 다음으로 이동 (함수형 업데이트)
  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => {
      const nextIndex = Math.min(prev + 1, itemsRef.current.length - 1);
      console.log(`🔄 ${mode} Moving: ${prev} → ${nextIndex}`);
      return nextIndex;
    });
  }, [mode]);

  // 🔥 이전으로 이동
  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  // 🔥 특정 인덱스로 이동
  const goToIndex = useCallback(
    (index: number) => {
      const safeIndex = Math.max(
        0,
        Math.min(index, itemsRef.current.length - 1)
      );
      console.log(`👆 ${mode} User selected index: ${safeIndex}`);
      setCurrentIndex(safeIndex);
    },
    [mode]
  );

  // 🔥 아이템 완료 처리
  const markItemCompleted = useCallback(
    (itemId?: string, completed: boolean = true) => {
      const targetId = itemId || currentItem?.id;
      if (!targetId) return;

      // 완료된 아이템 추가
      setCompletedItems((prev) => {
        const newSet = new Set(prev);
        if (completed) {
          newSet.add(currentIndex);
        } else {
          newSet.delete(currentIndex);
        }
        return newSet;
      });

      // 외부 콜백 호출
      onItemCompleted?.(targetId, completed);

      console.log(`🎯 ${mode} Item ${targetId} completed: ${completed}`);
    },
    [currentIndex, currentItem?.id, onItemCompleted, mode]
  );

  // 🔥 학습 완료 후 자동 다음 이동
  const completeAndNext = useCallback(() => {
    markItemCompleted(currentItem?.id, true);

    // 다음 아이템으로 자동 이동
    setTimeout(() => {
      goToNext();
    }, 100); // 상태 업데이트 후 이동
  }, [markItemCompleted, currentItem?.id, goToNext]);

  // 🔥 유틸리티 함수들
  const isCurrentCompleted = completedItems.has(currentIndex);
  const isLastItem = currentIndex >= items.length - 1;
  const isFirstItem = currentIndex === 0;

  return {
    // 상태
    currentIndex,
    currentItem,
    completedItems,

    // 상태 확인
    isCurrentCompleted,
    isLastItem,
    isFirstItem,

    // 네비게이션
    goToNext,
    goToPrev,
    goToIndex,

    // 아이템 완료
    markItemCompleted,
    completeAndNext,

    // 직접 상태 변경 (필요시)
    setCurrentIndex,
    setCompletedItems,
  };
}
