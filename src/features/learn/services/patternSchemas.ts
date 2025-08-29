// src/features/learn/services/patternSchemas.ts
import type { PatternSchema } from "../types/patternCore.types";

export const PATTERN_SCHEMAS: PatternSchema[] = [
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
        semanticConstraint: "BEVERAGE",
      },
      { name: "TIME", accept: ["TIME"] },
    ],
  },
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
        semanticConstraint: "FOOD",
      },
      { name: "TIME", accept: ["TIME"] },
    ],
  },
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
        semanticConstraint: "COOKABLE",
      },
      { name: "TIME", accept: ["TIME"] },
    ],
  },
  {
    id: "HAVE-ITEMS",
    category: "daily",
    level: "beginner",
    surface: "I have [ITEM].",
    koSurface: "[ITEM] 있어.",
    slots: [{ name: "ITEM", accept: ["ITEM", "NOUN"] }],
  },
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
