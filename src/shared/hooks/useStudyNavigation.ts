// src/shared/hooks/useStudyNavigation.ts
import { useState, useCallback, useEffect, useMemo } from "react";
import { useSwipeGesture } from "@/shared/hooks/useSwipeGesture";

export interface StudyNavigationConfig<T> {
  items: T[];
  initialIndex?: number;
  onItemCompleted?: (item: T, index: number) => void;
  onComplete?: () => void;
  getItemProgress?: (item: T) => {
    isCompleted: boolean;
    lastStudied: Date | null;
  };
  settings?: {
    autoProgressEnabled?: boolean;
    skipCompletedItems?: boolean; // 🔥 완료된 아이템 건너뛸지 여부 제어
  };
}

export function useStudyNavigation<T extends { id: string }>({
  items,
  initialIndex = 0,
  onItemCompleted,
  onComplete,
  getItemProgress,
  settings = {},
}: StudyNavigationConfig<T>) {
  const {
    autoProgressEnabled = true,
    skipCompletedItems = false, // 🔥 기본값을 false로 설정하여 순차 진행 보장
  } = settings;

  // 🔥 상태 관리
  const [currentIndex, setCurrentIndex] = useState(() => {
    return Math.max(0, Math.min(initialIndex, items.length - 1));
  });

  const currentItem = useMemo(() => {
    return items[currentIndex] || null;
  }, [items, currentIndex]);

  // 🔥 진행률 계산
  const progress = useMemo(() => {
    if (!items.length) return { completed: 0, total: 0, percentage: 0 };

    const completedCount = items.filter((item) => {
      const progress = getItemProgress?.(item);
      return progress?.isCompleted ?? false;
    }).length;

    return {
      completed: completedCount,
      total: items.length,
      percentage: Math.round((completedCount / items.length) * 100),
    };
  }, [items, getItemProgress]);

  // 🔥 다음 아이템 찾기 (순차 진행 보장)
  const findNextIndex = useCallback(
    (fromIndex: number): number => {
      if (!skipCompletedItems) {
        // 🔥 순차 진행 모드: 단순히 다음 인덱스
        return Math.min(fromIndex + 1, items.length - 1);
      }

      // 🔥 완료된 아이템 건너뛰기 모드 (기존 로직)
      for (let i = fromIndex + 1; i < items.length; i++) {
        const item = items[i];
        const itemProgress = getItemProgress?.(item);
        if (!itemProgress?.isCompleted) {
          return i;
        }
      }
      return Math.min(fromIndex + 1, items.length - 1);
    },
    [items, getItemProgress, skipCompletedItems]
  );

  // 🔥 이전 아이템 찾기
  const findPrevIndex = useCallback((fromIndex: number): number => {
    return Math.max(fromIndex - 1, 0);
  }, []);

  // 🔥 네비게이션 함수들
  const goToNext = useCallback(() => {
    setCurrentIndex((prevIndex) => {
      const nextIndex = findNextIndex(prevIndex);
      console.log(`🔄 Navigation: ${prevIndex} → ${nextIndex}`);
      return nextIndex;
    });
  }, [findNextIndex]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prevIndex) => {
      const prevIdx = findPrevIndex(prevIndex);
      console.log(`🔄 Navigation: ${prevIndex} → ${prevIdx}`);
      return prevIdx;
    });
  }, [findPrevIndex]);

  const goToIndex = useCallback(
    (index: number) => {
      const targetIndex = Math.max(0, Math.min(index, items.length - 1));
      setCurrentIndex(targetIndex);
    },
    [items.length]
  );

  // 🔥 아이템 완료 처리
  const handleItemComplete = useCallback(
    (completed: boolean = true) => {
      if (!currentItem) return;

      console.log(`🎯 Item completed: ${currentItem.id} = ${completed}`);

      // 상위 컴포넌트에 완료 알림
      onItemCompleted?.(currentItem, currentIndex);

      // 🔥 자동 진행이 활성화되고, 완료된 경우에만 다음으로 이동
      if (autoProgressEnabled && completed && currentIndex < items.length - 1) {
        setTimeout(() => {
          goToNext();
        }, 300); // 약간의 딜레이로 UX 개선
      }
    },
    [
      currentItem,
      currentIndex,
      onItemCompleted,
      autoProgressEnabled,
      items.length,
      goToNext,
    ]
  );

  // 🔥 모든 아이템 완료 확인
  const isAllCompleted = useMemo(() => {
    return progress.completed === progress.total && progress.total > 0;
  }, [progress]);

  // 🔥 현재 아이템 완료 상태
  const isCurrentCompleted = useMemo(() => {
    if (!currentItem) return false;
    const itemProgress = getItemProgress?.(currentItem);
    return itemProgress?.isCompleted ?? false;
  }, [currentItem, getItemProgress]);

  // 🔥 스와이프 제스처
  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: goToNext,
    onSwipeRight: goToPrev,
  });

  // 🔥 키보드 이벤트
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goToNext();
      else if (e.key === "ArrowLeft") goToPrev();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrev]);

  // 🔥 완료 체크
  useEffect(() => {
    if (isAllCompleted) {
      onComplete?.();
    }
  }, [isAllCompleted, onComplete]);

  return {
    // 상태
    currentIndex,
    currentItem,
    progress,
    isAllCompleted,
    isCurrentCompleted,

    // 네비게이션
    goToNext,
    goToPrev,
    goToIndex,
    canGoNext: currentIndex < items.length - 1,
    canGoPrev: currentIndex > 0,

    // 완료 처리
    handleItemComplete,

    // 이벤트 핸들러
    swipeHandlers,
  };
}
