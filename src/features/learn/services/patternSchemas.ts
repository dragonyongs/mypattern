// src/features/learn/services/patternSchemas.ts
import type { PatternSchema } from "../types/patternCore.types";

export const PATTERN_SCHEMAS: PatternSchema[] = [
  // 길찾기
  {
    id: "WH-BE-PLACE",
    category: "directions",
    level: "beginner",
    surface: "Where is the [PLACE]?",
    koSurface: "[PLACE] 어디 있어?",
    slots: [{ name: "PLACE", accept: ["PLACE"], required: true }],
  },
  {
    id: "HOW-GET-PLACE",
    category: "directions",
    level: "beginner",
    surface: "How do I get to the [PLACE]?",
    koSurface: "[PLACE] 어떻게 가?",
    slots: [{ name: "PLACE", accept: ["PLACE"], required: true }],
  },

  // 학교/준비
  {
    id: "NEED-ITEM-TIME",
    category: "school",
    level: "beginner",
    surface: "Do I need to bring [ITEM] for [TIME]?",
    koSurface: "[TIME]에 [ITEM] 가져와야 해?",
    slots: [
      { name: "ITEM", accept: ["ITEM"], required: true },
      { name: "TIME", accept: ["TIME"], required: true },
    ],
  },

  // 일상 - 만남 계획
  {
    id: "MEET-PERSON-PLACE",
    category: "daily",
    level: "beginner",
    surface: "I'm meeting my [PERSON] at the [PLACE].",
    koSurface: "[PLACE]에서 [PERSON] 만날 거야.",
    slots: [
      { name: "PERSON", accept: ["PERSON"], required: true },
      { name: "PLACE", accept: ["PLACE"], required: true },
    ],
  },

  // 일상 - 이동 계획
  {
    id: "GO-PLACE-TIME",
    category: "daily",
    level: "beginner",
    surface: "I'm going to the [PLACE] [TIME].",
    koSurface: "[TIME] [PLACE] 갈 거야.",
    slots: [
      { name: "PLACE", accept: ["PLACE"], required: true },
      { name: "TIME", accept: ["TIME"] },
    ],
  },

  // 과거 이동
  {
    id: "PAST-WENT-PLACE",
    category: "daily",
    level: "beginner",
    surface: "I went to the [PLACE] [TIME].",
    koSurface: "[TIME] [PLACE] 갔어.",
    slots: [
      { name: "PLACE", accept: ["PLACE"], required: true },
      { name: "TIME", accept: ["TIME"] },
    ],
  },

  // ✅ 음료 전용 패턴
  {
    id: "DRANK-BEVERAGE",
    category: "daily",
    level: "beginner",
    surface: "I drank [BEVERAGE] [TIME].",
    koSurface: "[TIME] [BEVERAGE] 마셨어.",
    slots: [
      {
        name: "BEVERAGE",
        accept: ["ITEM"],
        required: true,
        semanticConstraint: "BEVERAGE", // ✅ 음료만 허용
      },
      { name: "TIME", accept: ["TIME"] },
    ],
  },

  // ✅ 음식 전용 패턴
  {
    id: "ATE-FOOD",
    category: "daily",
    level: "beginner",
    surface: "I ate [FOOD] [TIME].",
    koSurface: "[TIME] [FOOD] 먹었어.",
    slots: [
      {
        name: "FOOD",
        accept: ["ITEM", "NOUN"],
        required: true,
        semanticConstraint: "FOOD", // ✅ 음식만 허용
      },
      { name: "TIME", accept: ["TIME"] },
    ],
  },

  // ✅ 제작/준비 패턴
  {
    id: "MADE-COOKABLE",
    category: "daily",
    level: "beginner",
    surface: "I made [COOKABLE] [TIME].",
    koSurface: "[TIME] [COOKABLE] 만들었어.",
    slots: [
      {
        name: "COOKABLE",
        accept: ["ITEM", "NOUN"],
        required: true,
        semanticConstraint: "COOKABLE", // ✅ 요리/제작 가능한 것만
      },
      { name: "TIME", accept: ["TIME"] },
    ],
  },

  // 소유 표현
  {
    id: "HAVE-ITEMS",
    category: "daily",
    level: "beginner",
    surface: "I have [ITEM].",
    koSurface: "[ITEM] 있어.",
    slots: [{ name: "ITEM", accept: ["ITEM", "NOUN"] }],
  },

  // 3인칭 단수
  {
    id: "HE-SHE-DOES",
    category: "daily",
    level: "beginner",
    surface: "He [VERB] [OBJECT].",
    koSurface: "그는 [OBJECT] [VERB].",
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
