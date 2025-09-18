// src/types/workbook.types.ts
import { StudySettings } from "@/types";
export type GradingMode = "single" | "any" | "all" | "regex"; // 채점 모드

export interface BaseWorkbookItem {
  id: string;
  sentence: string;
  blank: string;
  options: string[];
  answer: string;
  explanation?: string;
  question?: string;
  prompt?: string; // 선택적으로 쓰는 경우 대비
} // 기존 키 유지

export interface EvalExtension {
  correctAnswer?: string; // 레거시 호환
  correctAnswers?: string[]; // 다중 정답
  targetWords?: string[]; // 콘텐츠에서 온 타깃 [attached_file:4]
  evaluation?: { mode?: GradingMode; tags?: string[] }; // 정책
} // 확장 전용

export type WorkbookItem = BaseWorkbookItem & EvalExtension;

export interface WorkbookModeProps {
  items: WorkbookItem[];
  dayNumber: number;
  category?: string;
  packId: string;
  onComplete?: () => void;
  initialItemIndex?: number;
  settings?: StudySettings;
}

export interface WorkbookState {
  currentIndex: number;
  selectedAnswers: Record<number, string>;
  answeredQuestions: Set<number>;
  correctAnswers: Set<number>;
  showResult: Record<number, boolean>;
  showExplanation: Record<number, boolean>;
}
