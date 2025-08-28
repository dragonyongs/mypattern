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

export function validateSemanticFit(verb: string, place: string): boolean {
  const placeData = PLACE_ACTIVITY_MAP[place.toLowerCase()];
  if (!placeData) return true; // 알려지지 않은 장소는 허용

  const isInappropriate = placeData.inappropriate.includes(verb.toLowerCase());
  if (isInappropriate) return false;

  const isAppropriate = placeData.appropriate.includes(verb.toLowerCase());
  return isAppropriate;
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
