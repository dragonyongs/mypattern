// src/features/learn/services/naturalVerbMapper.ts
export const NATURAL_VERB_MAPPINGS: Record<string, Record<string, string>> = {
  // 음료 관련
  coffee: {
    make: "brew", // make coffee → brew coffee
    have: "drink", // have coffee → drink coffee
    get: "get",
  },
  tea: {
    make: "brew",
    have: "drink",
    get: "get",
  },
  water: {
    make: "get",
    have: "drink",
    get: "get",
  },
  juice: {
    make: "make",
    have: "drink",
    get: "get",
  },

  // 음식 관련
  food: {
    make: "prepare",
    have: "eat",
    get: "get",
  },
  lunch: {
    make: "prepare",
    have: "eat",
    get: "get",
  },
  dinner: {
    make: "prepare",
    have: "eat",
    get: "get",
  },
  breakfast: {
    make: "prepare",
    have: "eat",
    get: "get",
  },
};

export function getNaturalVerb(object: string, baseVerb: string): string {
  const mapping = NATURAL_VERB_MAPPINGS[object.toLowerCase()];
  return mapping?.[baseVerb.toLowerCase()] || baseVerb;
}
