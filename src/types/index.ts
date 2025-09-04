// src/types/index.ts

export interface StudySettings {
  showMeaningEnabled: boolean;
  autoProgressEnabled: boolean;
  studyMode: "immersive" | "assisted";
}

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface VocabItem {
  id: string;
  word: string;
  meaning: string;
  emoji: string;
  pronunciation?: string;
  usage?: string;
}

export interface SentenceItem {
  id: string;
  text: string;
  translation: string;
  targetWords: string[];
  situation?: string;
}

export interface WorkbookItem {
  id: string;
  type: "fill-blank" | "multiple-choice";
  sentence: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface LearningMethod {
  phase: number;
  name: string;
  icon: string;
  description: string;
  days: string;
}

// export interface DayContent {
//   introduction?: boolean;
//   learningGuide?: Record<string, string>;
//   targetWords?: string[];
//   vocabulary?: VocabItem[];
//   sentences?: SentenceItem[];
//   workbook?: WorkbookItem[];
// }

export interface DayData {
  day: number;
  type: "introduction" | "vocabulary";
  category?: string;
  page?: number;
  title: string;
  methods: string[];
  vocabularies: VocabItem[]; // ✅ 직접 접근
  sentences: SentenceItem[]; // ✅ 직접 접근
  workbook: WorkbookItem[]; // ✅ 직접 접근
  // Day 1 전용 필드들
  introduction?: boolean;
  learningGuide?: Record<string, string>;
  targetWords?: string[];
}

export interface PackData {
  id: string;
  title: string;
  subtitle: string;
  totalDays: number;
  learningMethods: LearningMethod[];
  categories: Array<{
    name: string;
    page: number;
  }>;
  days: DayData[];
}

export type StudyMode = "vocab" | "sentence" | "workbook";

export interface DayProgress {
  vocab: boolean;
  sentence: boolean;
  workbook: boolean;
  completed: boolean;
}

export interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  selectedPackId: string | null;
  selectedPackData: PackData | null;
  currentDay: number;
  studyStartDate: string | null;
  completedDays: number[];
  dayProgress: Record<number, DayProgress>;
}
