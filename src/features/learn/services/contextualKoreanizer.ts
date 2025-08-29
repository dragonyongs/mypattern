// src/features/learn/services/contextualKoreanizer.ts

import { getWordCategory } from "./wordCategories";

export function applyContextualKorean(
  koSurface: string,
  slotValues: Record<string, { word: string; pos: string; lexeme: any }>,
  schemaId: string
): string {
  let result = koSurface;

  // ✅ 의미적 검증 추가
  if (!validateSemanticMeaning(slotValues, schemaId)) {
    console.warn(`❌ 의미적으로 부적절한 조합 감지: ${schemaId}`);
    return result; // 기본값 반환
  }

  // 음식/음료 문맥 처리 강화
  if (
    schemaId === "HAD-FOOD-DRINK" ||
    schemaId === "ATE-FOOD" ||
    schemaId === "DRANK-BEVERAGE"
  ) {
    result = processFoodDrinkContext(result, slotValues, schemaId);
  }

  // 장소 관련 문맥 처리
  else if (schemaId === "GO-PLACE-TIME" || schemaId === "MEET-PERSON-PLACE") {
    result = processPlaceContext(result, slotValues, schemaId);
  }

  // 사람 관련 문맥 처리
  else if (schemaId === "MEET-PERSON-PLACE" || schemaId === "HAVE-ITEMS") {
    result = processPersonContext(result, slotValues, schemaId);
  }

  // [ACTION] 플레이스홀더 처리
  result = result.replace(
    /\[ACTION\]/g,
    getContextualAction(slotValues, schemaId)
  );

  // 조사 처리
  result = attachParticles(result, slotValues);

  // 최종 검증
  if (hasInvalidPlaceholders(result)) {
    console.warn(`❌ 미완성 플레이스홀더 발견: ${result}`);
  }

  return result.trim();
}

// ✅ 의미적 검증 함수
function validateSemanticMeaning(
  slotValues: Record<string, { word: string; pos: string; lexeme: any }>,
  schemaId: string
): boolean {
  const verb = Object.values(slotValues).find((v) => v.pos === "VERB");
  const item = Object.values(slotValues).find((v) => v.pos === "ITEM");
  const place = Object.values(slotValues).find((v) => v.pos === "PLACE");
  const person = Object.values(slotValues).find((v) => v.pos === "PERSON");

  // 동사 + 목적어 조합 검증
  if (verb && item) {
    if (!isValidVerbObjectCombination(verb.word, item.word)) {
      return false;
    }
  }

  // 동사 + 장소 조합 검증
  if (verb && place) {
    if (!isValidVerbPlaceCombination(verb.word, place.word)) {
      return false;
    }
  }

  // 신체 부위 관련 부적절한 조합 차단
  if (item && isBodyPart(item.word)) {
    if (verb && !isValidBodyPartAction(verb.word)) {
      console.log(`🚫 신체 부위 "${item.word}"에 부적절한 동작 "${verb.word}"`);
      return false;
    }
  }

  return true;
}

// 음식/음료 문맥 처리 강화
function processLoadDrinkContext(
  result: string,
  slotValues: Record<string, { word: string; pos: string; lexeme: any }>,
  schemaId: string
): string {
  const item = slotValues.ITEM?.word || "";
  const time = slotValues.TIME?.word || "";

  if (!item) return result;

  const categories = getWordCategory(item);

  // 음료 판단 - 더 정확한 카테고리 기반
  if (categories.includes("BEVERAGE")) {
    result = `${time} ${item} 마셨어`.trim();
  }
  // 음식 판단
  else if (categories.includes("FOOD") || categories.includes("COOKABLE")) {
    result = `${time} ${item} 먹었어`.trim();
  }
  // 신체 부위면 적절한 동작으로 변경
  else if (categories.includes("BODY_PART")) {
    result = `${item} 있어`.trim(); // "have teeth" → "치아 있어"
  }
  // 기타
  else {
    result = `${time} ${item} 했어`.trim();
  }

  return result;
}

// 장소 문맥 처리
function processPlaceContext(
  result: string,
  slotValues: Record<string, { word: string; pos: string; lexeme: any }>,
  schemaId: string
): string {
  const place = slotValues.PLACE?.word || "";
  const time = slotValues.TIME?.word || "";

  if (place === "home") {
    // "go to the home" → "집에 가다" (자연스럽게 처리)
    result = result.replace(/the home/g, "집");
  }

  return result;
}

// 사람 문맥 처리
function processPersonContext(
  result: string,
  slotValues: Record<string, { word: string; pos: string; lexeme: any }>,
  schemaId: string
): string {
  const person = slotValues.PERSON?.word || "";
  const place = slotValues.PLACE?.word || "";

  if (person && place) {
    result = `${place}에서 ${person} 만날 거야`;
  }

  return result;
}

// 문맥적 액션 결정
function getContextualAction(
  slotValues: Record<string, { word: string; pos: string; lexeme: any }>,
  schemaId: string
): string {
  const item = slotValues.ITEM?.word;

  if (!item) return "했어";

  const categories = getWordCategory(item);

  if (categories.includes("BEVERAGE")) return "마셨어";
  if (categories.includes("FOOD")) return "먹었어";
  if (categories.includes("COOKABLE")) return "만들었어";

  return "했어";
}

// 조사 자동 첨부 개선
function attachParticles(
  text: string,
  slotValues: Record<string, { word: string; pos: string; lexeme: any }>
): string {
  return text.replace(/\[(\w+)\]/g, (match, slotName) => {
    const slotData = slotValues[slotName];
    if (!slotData) return match;

    // 조사 자동 선택
    if (slotName === "PLACE" && slotData.word) {
      return addLocationParticle(slotData.word);
    }

    return slotData.word;
  });
}

// 장소 조사 추가
function addLocationParticle(place: string): string {
  // 집 → 집에, 학교 → 학교에
  if (place === "home" || place === "집") return "집에";
  if (place.endsWith("에")) return place; // 이미 조사가 있으면 그대로
  return place + "에";
}

// ✅ 검증 헬퍼 함수들
function isValidVerbObjectCombination(verb: string, object: string): boolean {
  const invalidCombinations = [
    { verb: "go", objects: ["teeth", "hair", "eyes", "치아", "머리", "눈"] },
    { verb: "goes", objects: ["teeth", "hair", "eyes", "치아", "머리", "눈"] },
    { verb: "drink", objects: ["bread", "rice", "meat", "빵", "밥", "고기"] },
    { verb: "eat", objects: ["water", "coffee", "tea", "물", "커피", "차"] },
  ];

  return !invalidCombinations.some(
    (combo) =>
      combo.verb === verb.toLowerCase() &&
      combo.objects.includes(object.toLowerCase())
  );
}

function isValidVerbPlaceCombination(verb: string, place: string): boolean {
  // "go home"은 OK, "go to home"은 부자연스럽지만 허용
  return true; // 장소는 대부분 허용
}

function isBodyPart(word: string): boolean {
  const bodyParts = [
    "teeth",
    "hair",
    "eyes",
    "nose",
    "mouth",
    "치아",
    "머리",
    "눈",
    "코",
    "입",
  ];
  return bodyParts.includes(word.toLowerCase());
}

function isValidBodyPartAction(verb: string): boolean {
  const validBodyPartActions = [
    "have",
    "brush",
    "clean",
    "wash",
    "있다",
    "닦다",
    "씻다",
  ];
  return validBodyPartActions.includes(verb.toLowerCase());
}

function hasInvalidPlaceholders(text: string): boolean {
  return /\[[A-Z_]+\]/.test(text);
}
