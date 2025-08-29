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

export type Tense = "present" | "past" | "future";
export type Aspect = "simple" | "progressive" | "perfect";
export type Polarity = "affirmative" | "negative";
export type Person = "first" | "second" | "third";
export type GramNumber = "singular" | "plural";
export type Countability = "countable" | "uncountable" | "both";

export interface VerbFeatures {
  tense: Tense;
  aspect: Aspect;
  polarity?: Polarity;
  person: Person;
  number: GramNumber;
}

export interface SlotSpec {
  name: string;
  accept: POS[];
  required?: boolean;
  preferTags?: LangTag[];
  morph?: Partial<VerbFeatures>;
  nounNumber?: GramNumber;
  fixedVerb?: string;
  semanticFilter?: boolean;
  contextualMapping?: boolean;
  semanticConstraint?: string; // ✅ "BEVERAGE", "FOOD", "COOKABLE" 등
}

export interface PatternSchema {
  id: string;
  category: LangTag;
  surface: string;
  koSurface: string;
  slots: SlotSpec[];
  level: "beginner" | "intermediate" | "advanced";
}

export interface Lexeme {
  id: string;
  en: string;
  ko: string;
  pos: POS;
  tags: LangTag[];
  countability?: Countability;
  irregularPlural?: string;
  register?: ("formal" | "casual" | "medical" | "animal")[];
  createdAt: string;
  updatedAt?: string;
  source?: "user" | "global";
}

// 사용자 입력 처리를 위한 타입들
export interface UserInput {
  type: "freeform" | "keyword" | "intent";
  content: string;
  targetLanguage: "en" | "ko";
}
