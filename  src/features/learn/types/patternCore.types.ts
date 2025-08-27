// src/features/learn/types/patternCore.types.ts
export type POS =
  | "NOUN"
  | "VERB"
  | "PLACE"
  | "PERSON"
  | "ITEM"
  | "TIME"
  | "PRON";
export type LangTag = "daily" | "directions" | "school" | "business";

export interface Lexeme {
  id: string;
  en: string;
  ko: string;
  pos: POS;
  tags: LangTag[];
  createdAt: string;
  updatedAt?: string;
}

export interface SlotSpec {
  name: string; // 예: SUBJECT, VERB, OBJECT, PLACE
  accept: POS[]; // 허용 품사 집합
  required?: boolean; // 필수 여부
  preferTags?: LangTag[]; // 태그 가중치
}

export interface PatternSchema {
  id: string; // 예: "WH-BE-PLACE"
  category: LangTag; // directions 등
  surface: string; // "Where is [PLACE]?"
  slots: SlotSpec[]; // [{name:"PLACE", accept:["PLACE"]}]
  level: "beginner" | "intermediate" | "advanced";
}
