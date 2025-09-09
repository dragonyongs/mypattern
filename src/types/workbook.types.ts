// src/types/workbook.types.ts
import { StudySettings } from "@/types";
export interface WorkbookItem {
  id: string;
  sentence: string;
  blank: string;
  options: string[];
  answer: string;
  explanation?: string;
  question?: string;
}

export interface WorkbookModeProps {
  items: WorkbookItem[];
  dayNumber: number;
  category?: string;
  packId: string;
  onComplete?: () => void;
  initialItemIndex?: number;
  settings?: StudySettings; // 🔥 새로 추가
}

export interface WorkbookState {
  currentIndex: number;
  selectedAnswers: Record<number, string>;
  answeredQuestions: Set<number>;
  correctAnswers: Set<number>;
  showResult: Record<number, boolean>;
  showExplanation: Record<number, boolean>;
}
