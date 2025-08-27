export interface LearningContent {
  id: string;
  title: string;
  description: string;
  patterns: string[];
  color: string;
  level: "beginner" | "intermediate" | "advanced";
}

export interface RecommendedItem {
  interest: string;
  content: string[];
  priority: number;
}

export interface DailyPattern {
  id: string;
  text: string;
  korean?: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  category: string;
  estimatedTime: number;
  completed: boolean;
}

export interface LearningStats {
  totalPatterns: number;
  completedPatterns: number;
  currentStreak: number;
  todayProgress: number;
}

export interface UserProgress {
  level: "beginner" | "intermediate" | "advanced";
  interests: string[];
  dailyGoal: number;
  completedToday: number;
}

export interface PatternPracticeSession {
  id: string;
  patternId: string;
  startTime: string;
  steps: PracticeStep[];
  currentStepIndex: number;
  completed: boolean;
  accuracy: number;
  attempts: number;
}

export interface PracticeStep {
  id: string;
  type: "listen" | "speak" | "type" | "choose" | "build";
  instruction: string;
  content: string;
  expectedAnswer: string;
  userAnswer?: string;
  isCorrect?: boolean;
  feedback?: string;
  attempts: number;
  maxAttempts: number;
}

export type PatternLearningMode =
  | "preview" // 패턴 소개
  | "listen" // 음성 듣기
  | "repeat" // 따라 말하기
  | "type" // 타이핑 연습
  | "build" // 문장 구성하기
  | "review" // 복습
  | "completed"; // 완료

export interface PatternSession {
  id: string;
  patternId: string;
  mode: PatternLearningMode;
  currentStep: number;
  totalSteps: number;
  accuracy: number;
  startTime: string;
  responses: UserResponse[];
}

export interface UserResponse {
  stepId: string;
  userInput: string;
  expectedAnswer: string;
  isCorrect: boolean;
  timestamp: string;
  attempts: number;
}
