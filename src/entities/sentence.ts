// src/entities/sentence.ts
export type SentenceStatus = "red" | "yellow" | "green";
export type Level = "beginner" | "intermediate" | "advanced";

export interface Sentence {
  id: string;
  korean: string;
  english: string;
  patternId: string;
  status: SentenceStatus;
  level: Level;
  linkedAnswer?: string;
  createdAt: string; // ISO string
  practiceCount: number;
  lastPracticed?: string; // ISO string
  nextDue: string; // ISO date (YYYY-MM-DD)
  categories: string[];
}

// 타입 가드 함수
export function isSentenceStatus(value: string): value is SentenceStatus {
  return ["red", "yellow", "green"].includes(value);
}
