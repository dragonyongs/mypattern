// src/shared/hooks/useStudyNavigation.ts
import { useState, useCallback, useEffect, useRef } from "react";
import { useSwipeGesture } from "@/shared/hooks/useSwipeGesture";

export type StudyMode = "immersive" | "assisted";

export interface StudySettings {
  studyMode: StudyMode;
  autoProgressEnabled: boolean;
  autoPlay: boolean;
  skipCompleted?: boolean;
}

export interface ProgressInfo {
  isCompleted: boolean;
  lastStudied?: string | null;
}

interface ItemBase {
  id: string;
}

export default function useStudyNavigation<T extends ItemBase>(cfg: {
  items: T[];
  initialIndex?: number;
  settings: StudySettings;
  getProgress?: (item: T) => ProgressInfo;
  onItemComplete?: (item: T, index: number) => void;
  onComplete?: () => void;
  speak?: (text: string) => void;
}) {
  const {
    items,
    initialIndex = 0,
    settings,
    getProgress,
    onItemComplete,
    onComplete,
    speak,
  } = cfg;

  const [index, setIndex] = useState(() =>
    Math.min(Math.max(initialIndex, 0), Math.max(items.length - 1, 0))
  );
  const timeoutRef = useRef<number | null>(null);

  const isCompleted = useCallback(
    (i: number) => {
      const item = items[i];
      if (!item || !getProgress) return false;
      return getProgress(item)?.isCompleted ?? false;
    },
    [items, getProgress]
  );

  const findNext = useCallback(
    (from: number) => {
      if (!settings.skipCompleted) return Math.min(from + 1, items.length - 1);
      for (let i = from + 1; i < items.length; i++) {
        if (!isCompleted(i)) return i;
      }
      return Math.min(from + 1, items.length - 1);
    },
    [items.length, settings.skipCompleted, isCompleted]
  );

  const findPrev = useCallback((from: number) => Math.max(from - 1, 0), []);

  // 내부 공통 이동: manual=false(자동)이면 게이트 적용
  const move = useCallback(
    (to: number, manual: boolean) => {
      if (
        !manual &&
        (!settings.autoProgressEnabled || settings.studyMode === "immersive")
      )
        return;
      const safe = Math.min(Math.max(to, 0), Math.max(items.length - 1, 0));
      setIndex(safe);

      // 수동 이동만 TTS
      if (manual && settings.autoPlay && speak && items[safe]) {
        speak(items[safe].id);
      }

      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    },
    [
      items,
      settings.autoPlay,
      settings.autoProgressEnabled,
      settings.studyMode,
      speak,
    ]
  );

  // 수동 이동은 기본 manual = true
  const goTo = useCallback(
    (to: number, manual: boolean = true) => move(to, manual),
    [move]
  );
  const next = useCallback(
    (manual: boolean = true) => setIndex((i) => findNext(i)),
    [findNext]
  );
  const prev = useCallback(
    (manual: boolean = true) => setIndex((i) => findPrev(i)),
    [findPrev]
  );

  // 현재 아이템 완료 → 자동 진행은 manual=false로 위임
  const completeCurrent = useCallback(
    (completed: boolean = true) => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (!completed) return;

      const item = items[index];
      if (item) onItemComplete?.(item, index);

      if (settings.autoProgressEnabled && settings.studyMode === "assisted") {
        timeoutRef.current = window.setTimeout(() => {
          goTo(Math.min(index + 1, Math.max(items.length - 1, 0)), false); // 자동 이동
        }, 400);
      }
    },
    [
      items,
      index,
      onItemComplete,
      settings.autoProgressEnabled,
      settings.studyMode,
      goTo,
    ]
  );

  // 스와이프/키보드: 수동 이동
  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: () => next(true),
    onSwipeRight: () => prev(true),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next(true);
      if (e.key === "ArrowLeft") prev(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  // 전체 완료 콜백
  useEffect(() => {
    if (!items.length) return;
    const all = items.every((_, i) => isCompleted(i));
    if (all) onComplete?.();
  }, [items, isCompleted, onComplete]);

  return {
    index,
    currentItem: items[index] ?? null,
    canGoPrev: index > 0,
    canGoNext: index < items.length - 1,
    goTo,
    next,
    prev,
    completeCurrent,
    swipeHandlers,
  };
}
