// src/types/workbook.types.ts
export interface WorkbookItem {
  id: string;
  type?: "fill-blank" | "multiple-choice";
  sentence?: string;
  question?: string;
  options: string[];
  answer?: string;
  correctAnswer?: string;
  explanation?: string;
}

export interface WorkbookModeProps {
  items: WorkbookItem[];
  initialItemIndex?: number;
  dayNumber: number;
  category: string;
  packId: string;
  onComplete?: () => void;
}

export interface WorkbookState {
  currentIndex: number;
  selectedAnswers: Record<number, string>;
  answeredQuestions: Set<number>;
  correctAnswers: Set<number>;
  showResult: Record<number, boolean>;
  showExplanation: Record<number, boolean>;
}
