import { useCallback, useRef } from "react";

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

interface TouchData {
  startX: number;
  startY: number;
  startTime: number;
}

export function useSwipeGesture(handlers: SwipeHandlers, threshold = 50) {
  const touchDataRef = useRef<TouchData | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches; // ✅ 수정: 배열 인덱스 추가
    touchDataRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
    };
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchDataRef.current) return;

      const touch = e.changedTouches; // ✅ 수정: 배열 인덱스 추가
      const { startX, startY, startTime } = touchDataRef.current;

      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;
      const deltaTime = Date.now() - startTime;

      // 너무 느린 스와이프는 무시
      if (deltaTime > 300) return;

      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      // 수평 스와이프
      if (absDeltaX > absDeltaY && absDeltaX > threshold) {
        if (deltaX > 0) {
          handlers.onSwipeRight?.();
        } else {
          handlers.onSwipeLeft?.();
        }
      }
      // 수직 스와이프
      else if (absDeltaY > threshold) {
        if (deltaY > 0) {
          handlers.onSwipeDown?.();
        } else {
          handlers.onSwipeUp?.();
        }
      }

      touchDataRef.current = null;
    },
    [handlers, threshold]
  );

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
  };
}
