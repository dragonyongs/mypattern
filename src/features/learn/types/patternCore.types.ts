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
export type PackStatus = "active" | "deprecated" | "draft";

export type Tense = "present" | "past" | "future";
export type Aspect = "simple" | "progressive" | "perfect";
export type Polarity = "affirmative" | "negative";
export type Person = "first" | "second" | "third";
export type GramNumber = "singular" | "plural";
export type Countability = "countable" | "uncountable" | "both";

// 시맨틱 제약 타입 추가
export type SemanticConstraint =
  | "BEVERAGE"
  | "FOOD"
  | "WEARABLE"
  | "PAYMENT_METHOD"
  | "SIZE_TYPE"
  | "MILK_TYPE"
  | "CAFE_CUSTOMIZATION"
  | "CAFE_ADDON"
  | "MEETING_TYPE"
  | "DOCUMENT"
  | "APPROVABLE"
  | "EVENT";

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
  semanticConstraint?: SemanticConstraint; // ✅ 강타입화
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
  semanticCategory?: SemanticConstraint[];
}

// 사용자 입력 처리를 위한 타입들
export interface UserInput {
  type: "freeform" | "keyword" | "intent";
  content: string;
  targetLanguage: "en" | "ko";
}

// 패키지 인덱스 타입
export interface PackIndex {
  schemaVersion: string;
  lastUpdated: string;
  packs: PackMeta[];
}

export interface PackMeta {
  packId: string;
  file: string;
  version: string;
  status: PackStatus;
  domains: LangTag[];
  size: number;
  hasPatterns: boolean;
}

// Pack 인터페이스
export interface VocabularyPack {
  packId: string;
  version: string; // SemVer 형식
  domains: LangTag[];
  category: LangTag;
  size: number;
  lexemes: Lexeme[];
  patterns?: PatternSchema[];
  meta?: {
    status: PackStatus;
    createdAt?: string;
    updatedAt?: string;
  };
}

// 검증 인터페이스
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

// 사용자 입력 처리를 위한 타입들
export interface UserInput {
  type: "freeform" | "keyword" | "intent";
  content: string;
  targetLanguage: "en" | "ko";
}
