// src/features/learn/services/naturalVerbMapper.ts

import { getWordCategory } from "./wordCategories";

export const NATURAL_VERB_MAPPINGS: Record<string, Record<string, string>> = {
  // 음료 관련 - 더 세분화
  coffee: {
    make: "brew",
    have: "drink",
    get: "order",
    take: "drink",
    do: "drink", // 부적절한 "do coffee" 방지
  },
  tea: {
    make: "brew",
    have: "drink",
    get: "order",
    take: "drink",
  },
  water: {
    make: "get",
    have: "drink",
    get: "get",
    take: "drink",
  },
  juice: {
    make: "squeeze", // 더 자연스러운 표현
    have: "drink",
    get: "get",
    take: "drink",
  },

  // 음식 관련
  food: {
    make: "prepare",
    have: "eat",
    get: "get",
    take: "eat",
    do: "eat", // "do food" → "eat food"
  },
  lunch: {
    make: "prepare",
    have: "eat",
    get: "get",
    take: "eat",
  },
  dinner: {
    make: "prepare",
    have: "eat",
    get: "get",
    take: "eat",
  },
  breakfast: {
    make: "prepare",
    have: "eat",
    get: "get",
    take: "eat",
  },
  sandwich: {
    make: "make",
    have: "eat",
    get: "get",
    take: "eat",
  },

  // ✅ 신체 부위 - 부적절한 조합 차단
  teeth: {
    make: "clean", // "make teeth" → "clean teeth"
    have: "have",
    get: "clean",
    take: "brush", // "take teeth" → "brush teeth"
    do: "brush", // "do teeth" → "brush teeth"
    go: "have", // "go teeth" → "have teeth" (최악의 경우)
  },
  hair: {
    make: "style",
    have: "have",
    get: "wash",
    take: "brush",
    do: "style",
    go: "have",
  },
  eyes: {
    make: "check",
    have: "have",
    get: "check",
    take: "check",
    do: "check",
    go: "have",
  },

  // 장소 관련
  home: {
    make: "build", // "make home" → "build home"
    have: "have",
    get: "reach", // "get home" → "reach home"
    take: "reach",
    do: "reach",
    go: "go", // "go home"은 자연스러움
  },
  school: {
    make: "build",
    have: "attend", // "have school" → "attend school"
    get: "reach",
    take: "attend",
    do: "attend",
    go: "attend", // "go school" → "attend school" (더 자연스럽게)
  },
  hospital: {
    make: "build",
    have: "visit", // "have hospital" → "visit hospital"
    get: "reach",
    take: "visit",
    do: "visit",
    go: "visit", // "go hospital" → "visit hospital"
  },
};

// ✅ 카테고리 기반 동사 매핑 추가
export const CATEGORY_VERB_MAPPINGS: Record<string, Record<string, string>> = {
  BEVERAGE: {
    make: "brew",
    have: "drink",
    get: "order",
    take: "drink",
    do: "drink",
    go: "get", // "go coffee" → "get coffee"
  },
  FOOD: {
    make: "prepare",
    have: "eat",
    get: "get",
    take: "eat",
    do: "eat",
    go: "get", // "go food" → "get food"
  },
  BODY_PART: {
    make: "check",
    have: "have",
    get: "check",
    take: "care", // "take care of"
    do: "check",
    go: "have", // 최악의 경우 기본값
  },
  LOCATION: {
    make: "build",
    have: "visit",
    get: "reach",
    take: "visit",
    do: "visit",
    go: "visit", // "go place" → "visit place" (더 자연스럽게)
  },
};

export function getNaturalVerb(object: string, baseVerb: string): string {
  const lowerObject = object.toLowerCase();
  const lowerVerb = baseVerb.toLowerCase();

  // ✅ 1단계: 직접 매핑 확인
  const directMapping = NATURAL_VERB_MAPPINGS[lowerObject];
  if (directMapping && directMapping[lowerVerb]) {
    const naturalVerb = directMapping[lowerVerb];
    console.log(
      `🎯 직접 매핑: ${baseVerb} ${object} → ${naturalVerb} ${object}`
    );
    return naturalVerb;
  }

  // ✅ 2단계: 카테고리 기반 매핑
  const categories = getWordCategory(object);
  for (const category of categories) {
    const categoryMapping = CATEGORY_VERB_MAPPINGS[category];
    if (categoryMapping && categoryMapping[lowerVerb]) {
      const naturalVerb = categoryMapping[lowerVerb];
      console.log(
        `🏷️ 카테고리 매핑: ${baseVerb} ${object} (${category}) → ${naturalVerb} ${object}`
      );
      return naturalVerb;
    }
  }

  // ✅ 3단계: 부적절한 조합 차단 및 대안 제시
  if (isInappropriateCombination(lowerVerb, lowerObject)) {
    const suggestedVerb = getSuggestedVerbForObject(lowerObject);
    console.log(
      `⚠️ 부적절한 조합 차단: ${baseVerb} ${object} → ${suggestedVerb} ${object}`
    );
    return suggestedVerb;
  }

  // 4단계: 기본값 반환
  return baseVerb;
}

// ✅ 부적절한 조합 감지
function isInappropriateCombination(verb: string, object: string): boolean {
  const inappropriateCombos = [
    { verbs: ["go", "goes"], objects: ["teeth", "hair", "eyes", "nose"] },
    { verbs: ["eat", "eats"], objects: ["water", "coffee", "tea", "juice"] },
    {
      verbs: ["drink", "drinks"],
      objects: ["bread", "sandwich", "food", "rice"],
    },
  ];

  return inappropriateCombos.some(
    (combo) => combo.verbs.includes(verb) && combo.objects.includes(object)
  );
}

// ✅ 목적어에 적합한 동사 제안
function getSuggestedVerbForObject(object: string): string {
  const categories = getWordCategory(object);

  if (categories.includes("BEVERAGE")) return "drink";
  if (categories.includes("FOOD")) return "eat";
  if (categories.includes("COOKABLE")) return "make";
  if (categories.includes("BODY_PART")) return "have";
  if (categories.includes("LOCATION")) return "visit";

  return "have"; // 기본값
}

// ✅ 더 자연스러운 동사 조합 추천
export function getOptimalVerbForContext(
  object: string,
  context?: string
): string {
  const categories = getWordCategory(object);

  // 문맥별 최적 동사 선택
  if (context === "morning" && categories.includes("BEVERAGE")) {
    return object === "coffee" ? "brew" : "drink";
  }

  if (context === "restaurant" && categories.includes("FOOD")) {
    return "order";
  }

  if (context === "kitchen" && categories.includes("COOKABLE")) {
    return "prepare";
  }

  return getSuggestedVerbForObject(object);
}

// ✅ 동사-목적어 호환성 검증
export function validateVerbObjectCompatibility(
  verb: string,
  object: string
): {
  isValid: boolean;
  suggestion?: string;
  reason?: string;
} {
  const naturalVerb = getNaturalVerb(object, verb);

  if (naturalVerb !== verb) {
    return {
      isValid: false,
      suggestion: naturalVerb,
      reason: `"${verb} ${object}"보다 "${naturalVerb} ${object}"가 더 자연스럽습니다.`,
    };
  }

  return { isValid: true };
}
