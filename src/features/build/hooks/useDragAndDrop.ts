// src/features/build/hooks/useDragAndDrop.ts
import { useState, useCallback } from "react";
import type { SentenceCard } from "../types";

export const useDragAndDrop = (
  cards: SentenceCard[],
  onCardsChange: (cards: SentenceCard[]) => void
) => {
  const [draggedCard, setDraggedCard] = useState<SentenceCard | null>(null);

  const handleDragStart = useCallback((card: SentenceCard) => {
    setDraggedCard(card);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedCard(null);
  }, []);

  const handleDrop = useCallback(
    (targetIndex: number) => {
      if (!draggedCard) return;

      const newCards = [...cards];
      const draggedIndex = newCards.findIndex(
        (card) => card.id === draggedCard.id
      );

      if (draggedIndex !== -1) {
        // 카드 위치 교환
        [newCards[draggedIndex], newCards[targetIndex]] = [
          newCards[targetIndex],
          newCards[draggedIndex],
        ];
        onCardsChange(newCards);
      }
    },
    [draggedCard, cards, onCardsChange]
  );

  return {
    draggedCard,
    handleDragStart,
    handleDragEnd,
    handleDrop,
  };
};
