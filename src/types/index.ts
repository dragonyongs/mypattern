// src/types/index.ts

export interface User {
  id: string;
  name: string | null;
  email: string | null;
  avatarUrl?: string;
}

export interface StudySettings {
  studyMode?: "immersive" | "assisted";
  showMeaningEnabled?: boolean;
  autoProgressEnabled?: boolean;
  autoPlayOnSelect?: boolean;
}

export type StudyModeType = "immersive" | "assisted";

export interface BaseContent {
  id: string;
  type:
    | "vocabulary"
    | "sentence"
    | "workbook"
    | "illustration"
    | "audio"
    | "introduction";
  page?: number;
  tags?: string[];
}

export interface VocabularyItem extends BaseContent {
  type: "vocabulary";
  word: string;
  meaning: string;
  pronunciation?: string;
  emoji?: string;
}

export interface SentenceItem extends BaseContent {
  type: "sentence";
  text: string;
  translation: string;
  targetWords?: string[];
  relatedVocabIds?: string[];
}

export interface WorkbookItem extends BaseContent {
  type: "workbook";
  //type: "fill-blank" | "multiple-choice";
  question: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
  relatedSentenceId?: string;
}

export type StudyMode = "introduction" | "vocab" | "sentence" | "workbook";

export type ContentItem = VocabularyItem | SentenceItem | WorkbookItem;

export interface LearningMode {
  type: string;
  displayName: string;
  contentIds: string[];
  icon?: string;
}

export interface DayPlan {
  day: number;
  title: string;
  modes: LearningMode[];
}

export interface LearningPlan {
  totalDays: number;
  days: DayPlan[];
}

export interface LearningMethod {
  phase: number;
  name: string;
  icon: string;
  description: string;
  days: string;
}

export interface PackData {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  level?: "beginner" | "intermediate" | "advanced";
  tags?: string[];
  contents: ContentItem[];
  learningPlan: LearningPlan;
}

interface DayProgress {
  day: number;
  completedModes: Record<string, boolean>; // 기존 모드 완료
  completedItems: Record<string, boolean>; // ✅ 개별 아이템 완료
  isCompleted: boolean;
  lastStudiedAt?: string;
}

export interface PackProgress {
  packId: string;
  lastStudiedDay: number;
  completedDaysCount: number;
  progressByDay: Record<number, DayProgress>; // { 1: DayProgress, ... }
  lastStudiedAt?: string;
  settings?: StudySettings;
}
