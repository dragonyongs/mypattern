// src/entities/chunk.ts
export type ChunkFunction =
  | "progress"
  | "polite"
  | "schedule"
  | "request"
  | "response"
  | "other";

export type Register = "formal" | "informal" | "neutral";

export interface Chunk {
  id: string;
  text: string; // "I'm still working on it"
  slots: string[]; // 빈 배열이거나 슬롯 포함
  function: ChunkFunction; // 기능별 분류
  register: Register; // 격식 수준
  frequencyHint: number; // 0-100, 사용 빈도
  examples: string[]; // 유사한 표현들
  koLiteral?: string; // 직역 대비용 "아직 갈 길이 멀어요"
}

// Delexicalised verbs를 위한 Collocation 타입
export interface Collocation {
  id: string;
  verb: "get" | "make" | "have" | "go" | "do" | "take";
  object: string;
  prep?: string; // 전치사 (선택적)
  example: string;
  notes?: string;
  chunkIds: string[]; // 연관된 청크 ID들
}

// K→E 간섭 차단을 위한 대비 프롬프트
export interface InterferencePrompt {
  id: string;
  koLiteral: string; // "갈 길이 멀다"
  targetChunkId: string; // "I'm still working on it"
  contrastExamples: string[]; // 다른 변형들
}
