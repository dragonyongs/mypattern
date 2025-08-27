// src/features/learn/services/patternSchemas.ts
import type { PatternSchema } from "../types/patternCore.types";

export const PATTERN_SCHEMAS: PatternSchema[] = [
  // 1) 길찾기(그대로 유지)
  {
    id: "WH-BE-PLACE",
    category: "directions",
    level: "beginner",
    surface: "Where is [PLACE]?",
    slots: [{ name: "PLACE", accept: ["PLACE"], required: true }],
  },
  {
    id: "HOW-GET-PLACE",
    category: "directions",
    level: "beginner",
    surface: "How do I get to [PLACE]?",
    slots: [{ name: "PLACE", accept: ["PLACE"], required: true }],
  },

  // 2) 학교/준비(그대로 유지)
  {
    id: "NEED-ITEM-TIME",
    category: "school",
    level: "beginner",
    surface: "Do I need to bring [ITEM] for [TIME]?",
    slots: [
      { name: "ITEM", accept: ["ITEM"], required: true },
      { name: "TIME", accept: ["TIME"], required: true },
    ],
  },

  // 3) 일상(장소 약속) — 현재진행(keep)
  {
    id: "MEET-PERSON-PLACE",
    category: "daily",
    level: "beginner",
    surface: "I'm meeting my [PERSON] at [PLACE].",
    slots: [
      { name: "PERSON", accept: ["PERSON"], required: true },
      { name: "PLACE", accept: ["PLACE"], required: true },
    ],
  },

  // 4) 일상(이동 계획) — 현재진행·미래 뉘앙스(keep)
  {
    id: "GO-PLACE-TIME",
    category: "daily",
    level: "beginner",
    surface: "I'm going to [PLACE] [TIME].",
    slots: [
      { name: "PLACE", accept: ["PLACE"], required: true },
      { name: "TIME", accept: ["TIME"] },
    ],
  },

  // 5) 일기(과거 단순) — 동사 시제/인칭/수 지정
  {
    id: "DIARY-PAST-WENT",
    category: "daily",
    level: "beginner",
    surface: "I [VERB] to [PLACE] [TIME].",
    slots: [
      {
        name: "VERB",
        accept: ["VERB"],
        required: true,
        morph: {
          tense: "past",
          aspect: "simple",
          person: "first",
          number: "singular",
        },
      },
      { name: "PLACE", accept: ["PLACE"], required: true },
      { name: "TIME", accept: ["TIME"] },
    ],
  },

  // 6) 과거 진행
  {
    id: "PAST-PROGRESSIVE",
    category: "daily",
    level: "beginner",
    surface: "I was [VERB] at [PLACE] [TIME].",
    slots: [
      {
        name: "VERB",
        accept: ["VERB"],
        required: true,
        morph: {
          tense: "past",
          aspect: "progressive",
          person: "first",
          number: "singular",
        },
      },
      { name: "PLACE", accept: ["PLACE"] },
      { name: "TIME", accept: ["TIME"] },
    ],
  },

  // 7) 현재 완료
  {
    id: "PRESENT-PERFECT",
    category: "daily",
    level: "beginner",
    surface: "I have [VERB] [OBJECT].",
    slots: [
      {
        name: "VERB",
        accept: ["VERB"],
        required: true,
        morph: {
          tense: "present",
          aspect: "perfect",
          person: "first",
          number: "singular",
        },
      },
      { name: "OBJECT", accept: ["ITEM", "NOUN"] },
    ],
  },

  // 8) 복수 명사 요구(건강/신체 예시)
  {
    id: "HAVE-PLURAL-NOUN",
    category: "daily",
    level: "beginner",
    surface: "I have [NOUN].",
    slots: [
      { name: "NOUN", accept: ["NOUN"], required: true, nounNumber: "plural" }, // tooth → teeth
    ],
  },

  // 9) 일반 진술(SVO) — 현재 단순 3인칭 단수
  {
    id: "HE-SHE-DOES",
    category: "daily",
    level: "beginner",
    surface: "He [VERB] [OBJECT].",
    slots: [
      {
        name: "VERB",
        accept: ["VERB"],
        required: true,
        morph: {
          tense: "present",
          aspect: "simple",
          person: "third",
          number: "singular",
        },
      },
      { name: "OBJECT", accept: ["ITEM", "NOUN"] },
    ],
  },
];
