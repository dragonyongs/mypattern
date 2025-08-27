// src/features/learn/services/phraseBank.types.ts
export interface Chunk {
  id: string;
  text: string;
  type: "delex_verb" | "collocation" | "place" | "landmark" | "filler";
  level: "beginner" | "intermediate" | "advanced";
  tags: string[];
  usFreq: number;
}
export interface Template {
  id: string;
  english: string;
  korean: string;
  category: "directions" | "request" | "greeting" | "smalltalk" | "order";
  slots: ("PLACE" | "LANDMARK" | "ACTION" | "TIME")[];
  level: "beginner" | "intermediate" | "advanced";
  patterns: string[];
}
export interface Collocation {
  id: string;
  verb: string;
  object?: string;
  prep?: string;
  example: string;
  notes?: string;
}
export interface ComposeContext {
  intent: string;
  place: string;
  keywords: string[];
  level: "beginner" | "intermediate" | "advanced";
}
export interface ComposeResult {
  text: string;
  korean: string;
  templateId: string;
  usedChunks: string[];
  notes?: string[];
}
