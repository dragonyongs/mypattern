// src/features/learn/types/patternCore.types.ts

// 공통 라벨
export type POS =
  | "NOUN"
  | "VERB"
  | "PLACE"
  | "PERSON"
  | "ITEM"
  | "TIME"
  | "PRON";

export type LangTag = "daily" | "directions" | "school" | "business";

// 시제/상/극성/인칭/수
export type Tense = "present" | "past" | "future";
export type Aspect = "simple" | "progressive" | "perfect";
export type Polarity = "affirmative" | "negative";
export type Person = "first" | "second" | "third";
export type GramNumber = "singular" | "plural"; // 단수/복수: 동사·명사 공통

// 명사 속성
export type Countability = "countable" | "uncountable" | "both";

// 동사 요구 특성(스키마→엔진 전달)
export interface VerbFeatures {
  tense: Tense;
  aspect: Aspect;
  polarity: Polarity;
  person: Person;
  number: GramNumber; // 3인칭 단수 등
}

// 슬롯 스펙(스키마 단위)
export interface SlotSpec {
  name: string; // 예: SUBJECT, VERB, OBJECT, PLACE
  accept: POS[]; // 허용 품사
  required?: boolean;
  preferTags?: LangTag[]; // 후보 가중치
  morph?: Partial<VerbFeatures>; // VERB 전용: 시제/상/인칭/수
  nounNumber?: GramNumber; // NOUN 전용: 단수/복수 요구
}

// 패턴 스키마
export interface PatternSchema {
  id: string; // 예: "GO-PLACE-TIME"
  category: LangTag; // daily/directions/...
  surface: string; // "I [VERB] to [PLACE] [TIME]."
  slots: SlotSpec[];
  level: "beginner" | "intermediate" | "advanced";
}

// 사용자/글로벌 단어(lemma 중심)
export interface Lexeme {
  id: string;
  en: string; // lemma (예: tooth, go)
  ko: string; // 한국어 기본형
  pos: POS;
  tags: LangTag[]; // 맥락 태그
  countability?: Countability; // 명사: 가산성
  irregularPlural?: string; // 명사: 불규칙 복수(예: teeth)
  register?: ("formal" | "casual" | "medical" | "animal")[]; // 치아/이빨 구분
  createdAt: string;
  updatedAt?: string;
}
