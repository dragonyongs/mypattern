import { Pattern, Chunk, Sentence } from "@/entities";

export const seedPatterns: Pattern[] = [
  {
    id: "p001",
    template: "Excuse me, do you know where X is?",
    slots: ["PLACE"],
    category: "location",
    level: "beginner",
    examples: ["the bank", "the restroom", "the subway station"],
  },
  {
    id: "p002",
    template: "Would you like to X?",
    slots: ["ACTION"],
    category: "request",
    level: "beginner",
    examples: ["have lunch", "join us", "help me"],
  },
];

export const seedChunks: Chunk[] = [
  {
    id: "c001",
    text: "I'm still working on it",
    slots: [],
    function: "progress",
    register: "informal",
    frequencyHint: 85,
    examples: ["I'm getting there", "It's in progress", "I'm on it"],
    koLiteral: "아직 갈 길이 멀어요",
  },
  {
    id: "c002",
    text: "Could you help me?",
    slots: [],
    function: "polite",
    register: "formal",
    frequencyHint: 90,
    examples: ["Would you mind helping?", "Can you assist me?"],
  },
];

export const seedSentences: Sentence[] = [
  {
    id: "s001",
    korean: "실례합니다, 버스 정류장이 어디 있는지 아세요?",
    english: "Excuse me, do you know where the bus stop is?",
    patternId: "p001",
    status: "red",
    level: "beginner",
    createdAt: "2025-08-26T00:00:00.000Z",
    practiceCount: 0,
    nextDue: "2025-08-26",
    categories: ["location", "daily"],
  },
];
