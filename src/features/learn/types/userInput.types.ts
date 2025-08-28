// src/features/learn/types/userInput.types.ts
export interface UserInput {
  type: "freeform" | "keyword" | "intent";
  content: string;
  targetLanguage: "en" | "ko";
}

export interface GrammarFeedback {
  isCorrect: boolean;
  errors: GrammarError[];
  suggestions: string[];
  score: number;
}

export interface GrammarError {
  type: "spelling" | "grammar" | "word-order" | "article";
  message: string;
  suggestion: string;
  position: [number, number];
}

export interface PatternMatch {
  schemaId: string;
  similarity: number;
  original: string;
  matched: string;
}

export interface ImprovementSuggestion {
  type: "grammar" | "vocabulary" | "style";
  original: string;
  improved: string;
  reason: string;
}
