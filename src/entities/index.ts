// src/entities/index.ts - 기존 타입과 새로운 타입 통합
import { formatISO } from "date-fns";

// ============ 기존 타입들 (SRS 시스템) ============
export type SentenceStatus = "red" | "yellow" | "green";

export interface ReviewInterval {
  red: number;
  yellow: number;
  green: number;
}

export interface Sentence {
  id: string;
  text: string;
  translation?: string;
  patternId?: string | null;
  chunkIds?: string[];
  tags?: string[];
  status: SentenceStatus;
  practiceCount: number;
  lastPracticed?: string | null;
  nextDue: string; // YYYY-MM-DD
}

export interface Pattern {
  id: string;
  title: string;
  description?: string;
  examples?: string[];
}

export interface Chunk {
  id: string;
  text: string;
  meaning?: string;
}

export interface Settings {
  language: "ko" | "en";
  dailyGoal: number;
  reviewInterval: ReviewInterval;
  theme?: "light" | "dark" | "system";
  voice?: string;
  timezone?: string;
}

export interface PracticeSession {
  id: string;
  sentenceId: string;
  correct: boolean;
  ts: string;
  elapsedMs?: number;
}

// ============ 리얼보카 학습을 위한 새로운 타입들 ============
export interface VocaItem {
  id: string;
  headword: string;
  definition?: string;
  exampleEn?: string;
  exampleKo?: string;
  imageUrl?: string;
  audioUrl?: string;
  tags?: string[];
  difficulty?: 1 | 2 | 3;
  category?: string;
  pos?: string; // part of speech
}

export interface LearningStep {
  id: string;
  type: "flashcard" | "overview" | "pronunciation" | "dictation";
  title: string;
  description: string;
  items: VocaItem[];
  completed: boolean;
  score?: number;
  completedAt?: string;
  timeSpent?: number; // seconds
}

export interface DailyLesson {
  day: number;
  date: string;
  title: string;
  description: string;
  steps: LearningStep[];
  estimatedTime: number; // minutes
  completed: boolean;
  completedAt?: string;
  totalScore?: number;
}

export interface StudyPlan {
  id: string;
  packId: string;
  packTitle: string;
  totalDays: number;
  currentDay: number;
  lessons: DailyLesson[];
  startDate: string;
  targetEndDate: string;
  completedDays: number;
}

export interface LearningSession {
  id: string;
  stepId: string;
  stepType: LearningStep["type"];
  itemId: string;
  correct: boolean;
  timeSpent: number;
  timestamp: string;
}

// Progress tracking
export interface DayProgress {
  day: number;
  completed: boolean;
  score: number;
  timeSpent: number;
  completedAt?: string;
}

// ============ 기본값 정의 ============
export const defaultSettings: Settings = {
  language: "ko",
  dailyGoal: 20,
  reviewInterval: {
    red: 0, // 오답/신규는 오늘 다시
    yellow: 1, // 중간 단계는 +1일
    green: 3, // 숙달 단계는 +3일
  },
  theme: "system",
  voice: "en-US",
  timezone: "Asia/Seoul",
};

// ============ 유틸리티 함수 ============
// VocaItem을 Sentence로 변환하는 함수 (기존 SRS 시스템과 호환)
export function vocaItemToSentence(item: VocaItem): Sentence {
  const today = formatISO(new Date(), { representation: "date" });

  return {
    id: item.id,
    text: item.exampleEn || item.headword,
    translation: item.exampleKo || item.definition,
    tags: item.tags || [],
    status: "red", // 새로운 항목은 red로 시작
    practiceCount: 0,
    lastPracticed: null,
    nextDue: today,
  };
}

// Sentence를 VocaItem으로 변환하는 함수
export function sentenceToVocaItem(sentence: Sentence): VocaItem {
  return {
    id: sentence.id,
    headword: extractHeadword(sentence.text),
    exampleEn: sentence.text,
    exampleKo: sentence.translation,
    tags: sentence.tags,
  };
}

// 문장에서 핵심 단어 추출 (간단한 구현)
function extractHeadword(sentence: string): string {
  // 첫 번째 단어를 헤드워드로 사용하거나, 더 정교한 로직 구현 가능
  const words = sentence.split(" ");
  return words.find((word) => word.length > 3) || words[0] || sentence;
}

// 기본 더미 VocaItem 생성
export function createDummyVocaItems(
  count: number,
  packId: string
): VocaItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${packId}-${i + 1}`,
    headword: `Word${i + 1}`,
    definition: `Definition for word ${i + 1}`,
    exampleEn: `This is an example sentence for word ${i + 1}.`,
    exampleKo: `이것은 단어 ${i + 1}의 예문입니다.`,
    difficulty: Math.ceil(Math.random() * 3) as 1 | 2 | 3,
    category: `category-${Math.ceil(i / 5)}`,
    pos: ["noun", "verb", "adjective", "adverb"][Math.floor(Math.random() * 4)],
  }));
}

export default {};
