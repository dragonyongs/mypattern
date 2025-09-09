// src/types/index.ts

// =================================================================
// 1. 기본 엔티티 타입
// =================================================================
export interface User {
  id: string;
  name: string | null;
  email: string | null;
  avatarUrl?: string;
}

export interface StudySettings {
  ttsRate?: number;
  autoAdvance?: boolean;
  showMeaningEnabled: boolean;
  autoProgressEnabled: boolean;
  studyMode: "immersive" | "assisted";
  autoPlayOnSelect?: boolean; // 🔥 새로 추가
}

// =================================================================
// 2. 새로운 Pack 데이터 구조 (핵심 개선 사항)
// =================================================================

// 2-1. 콘텐츠 아이템 타입
// -----------------------------------------------------------------

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
  question: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
  relatedSentenceId?: string;
}

export type ContentItem = VocabularyItem | SentenceItem | WorkbookItem;

// 2-2. 학습 계획 타입
// -----------------------------------------------------------------

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

// 2-3. 학습 팩 전체 데이터 타입
// -----------------------------------------------------------------

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

// =================================================================
// 3. 학습 진행률 상태 타입 (Zustand Store용)
// =================================================================

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
