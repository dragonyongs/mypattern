// src/shared/hooks/useItemCompletion.ts
import { useMemo, useCallback } from "react";
import { useItemProgress } from "@/shared/hooks/useAppHooks";

export function useItemCompletion(
  packId: string,
  day: number,
  itemIds: string[]
) {
  const { markItemCompleted, isItemCompleted, getCompletedCount } =
    useItemProgress(packId, day);

  const completedCount = useMemo(() => {
    if (!Array.isArray(itemIds) || itemIds.length === 0) return 0;
    return getCompletedCount(itemIds);
  }, [itemIds, getCompletedCount]);

  const allCompleted = itemIds.length > 0 && completedCount === itemIds.length;

  const completeIfNeeded = useCallback(
    (itemId: string) => {
      if (!isItemCompleted(itemId)) {
        markItemCompleted(itemId);
        return true;
      }
      return false;
    },
    [isItemCompleted, markItemCompleted]
  );

  return {
    isItemCompleted,
    markItemCompleted,
    completedCount,
    allCompleted,
    completeIfNeeded,
  };
}
