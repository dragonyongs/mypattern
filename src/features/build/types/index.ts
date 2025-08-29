// src/features/build/types/index.ts
export interface UserIntent {
  korean: string;
  category: "question" | "request" | "information" | "greeting";
  confidence: number;
}

export interface SentenceCard {
  id: string;
  text: string;
  korean: string;
  pos: "SUBJECT" | "VERB" | "OBJECT" | "PLACE" | "TIME" | "MODAL";
  isPlaced: boolean;
  isCorrect: boolean;
  feedbackColor: "default" | "success" | "warning" | "error";
}

export interface ConversationPattern {
  id: string;
  scenario: string;
  userSide: {
    korean: string;
    english: string;
    structure: string;
    cards: SentenceCard[];
  };
  responseSide: {
    korean: string;
    english: string;
    variations: string[];
  };
}

export interface BuildState {
  currentIntent: UserIntent | null;
  matchedPatterns: ConversationPattern[];
  selectedPattern: ConversationPattern | null;
  placedCards: SentenceCard[];
  availableCards: SentenceCard[];
  attemptCount: number;
  showHint: boolean;
  isComplete: boolean;
}
