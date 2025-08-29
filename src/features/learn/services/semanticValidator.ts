// src/features/learn/services/semanticValidator.ts
import { getWordCategory, canPerformAction } from "./wordCategories";

export const PLACE_ACTIVITY_MAP: Record<
  string,
  { appropriate: string[]; inappropriate: string[] }
> = {
  hospital: {
    appropriate: ["visit", "go", "work", "wait", "study"],
    inappropriate: ["make", "cook", "play", "sleep"],
  },
  school: {
    appropriate: ["study", "learn", "teach", "go", "work"],
    inappropriate: ["sleep", "cook", "make"],
  },
  office: {
    appropriate: ["work", "meet", "study", "go"],
    inappropriate: ["cook", "sleep", "play", "make"],
  },
  home: {
    appropriate: ["make", "cook", "study", "work", "sleep", "go", "prepare"],
    inappropriate: [],
  },
  kitchen: {
    appropriate: ["make", "cook", "prepare", "work"],
    inappropriate: ["study", "sleep"],
  },
  library: {
    appropriate: ["study", "work", "read", "go"],
    inappropriate: ["cook", "make", "sleep", "play"],
  },
};

export function validateSemanticFit(verb: string, target: string): boolean {
  const coreWord = findWordInCoreVocabulary(target);
  if (!coreWord) return true; // 알 수 없는 단어는 허용

  const incompatibleActions = coreWord.incompatibleActions || [];
  const isIncompatible = incompatibleActions.includes(verb.toLowerCase());

  if (isIncompatible) {
    console.log(`🚫 부적절한 조합: ${verb} + ${target}`);
    return false;
  }

  return true;
}

function findWordInCoreVocabulary(word: string) {
  // core-vocabulary.json import 필요
  const coreVocabulary = require("@/data/core-vocabulary.json");
  const allWords = [
    ...coreVocabulary.places,
    ...coreVocabulary.items,
    ...coreVocabulary.people,
    ...coreVocabulary.time,
  ];
  return allWords.find((w: any) => w.en.toLowerCase() === word.toLowerCase());
}

export function getSuggestedVerb(place: string): string {
  const placeData = PLACE_ACTIVITY_MAP[place.toLowerCase()];
  if (!placeData || placeData.appropriate.length === 0) return "go";

  // 첫 번째 적절한 동사 반환 (go 제외하고 더 구체적인 것)
  const specificVerbs = placeData.appropriate.filter((v) => v !== "go");
  return specificVerbs[0] || "go";
}

export function validateVerbObjectCombination(
  verb: string,
  object: string
): boolean {
  if (!canPerformAction(verb, object)) {
    console.log(`부적절한 조합: ${verb} + ${object}`);
    return false;
  }
  return true;
}

export function getSuggestedVerbForObject(object: string): string {
  const categories = getWordCategory(object);

  // 음료 → drink
  if (categories.includes("BEVERAGE")) return "drink";

  // 음식 → eat
  if (categories.includes("FOOD")) return "eat";

  // 요리 가능한 것 → make/prepare
  if (categories.includes("COOKABLE")) return "make";

  // 도구/물건 → have/use
  if (categories.includes("TOOL")) return "have";

  return "have"; // 기본값
}

export function getAlternativeVerb(
  currentVerb: string,
  object: string
): string {
  if (!validateVerbObjectCombination(currentVerb, object)) {
    return getSuggestedVerbForObject(object);
  }
  return currentVerb;
}

// getContextualVerb는 getSuggestedVerb의 별칭
export const getContextualVerb = getSuggestedVerb;
