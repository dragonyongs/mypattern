// src/features/drawing/hooks/useDebouncedSave.ts
import { useCallback, useRef } from "react";

export const useDebouncedSave = (
  saveFunction: Function,
  delay: number = 1000
) => {
  const timeoutRef = useRef<NodeJS.Timeout>();

  const debouncedSave = useCallback(
    (...args: any[]) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        saveFunction(...args);
      }, delay);
    },
    [saveFunction, delay]
  );

  return debouncedSave;
};
