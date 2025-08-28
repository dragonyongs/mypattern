// src/features/learn/services/wordCategories.ts (확장)
export const WORD_CATEGORIES = {
  // ✅ 음료 - 마실 수 있는 것들
  BEVERAGES: [
    "coffee",
    "tea",
    "water",
    "juice",
    "milk",
    "soda",
    "wine",
    "beer",
    "커피",
    "차",
    "물",
    "주스",
    "우유",
    "소다",
    "맥주",
  ],

  // ✅ 음식 - 먹을 수 있는 것들
  FOODS: [
    "bread",
    "apple",
    "banana",
    "lunch",
    "dinner",
    "breakfast",
    "rice",
    "meat",
    "pasta",
    "pizza",
    "sandwich",
    "cake",
    "cookie",
    "빵",
    "사과",
    "바나나",
    "점심",
    "저녁",
    "아침",
    "밥",
    "고기",
  ],

  // ✅ 요리 가능한 것들
  COOKABLE: [
    "coffee",
    "tea",
    "food",
    "lunch",
    "dinner",
    "breakfast",
    "bread",
    "rice",
    "pasta",
    "pizza",
    "sandwich",
    "cake",
    "cookie",
    "커피",
    "차",
    "음식",
    "점심",
    "저녁",
    "아침",
    "빵",
    "밥",
  ],

  // ✅ 절대 먹거나 마실 수 없는 것들
  NON_CONSUMABLES: [
    "key",
    "book",
    "phone",
    "pen",
    "computer",
    "chair",
    "table",
    "car",
    "house",
    "window",
    "door",
    "wall",
    "floor",
    "ceiling",
    "열쇠",
    "책",
    "전화기",
    "펜",
    "컴퓨터",
    "의자",
    "테이블",
    "자동차",
  ],

  // ✅ 도구/물건
  TOOLS_ITEMS: [
    "key",
    "pen",
    "book",
    "phone",
    "computer",
    "bag",
    "wallet",
    "watch",
    "열쇠",
    "펜",
    "책",
    "전화기",
    "컴퓨터",
    "가방",
    "지갑",
    "시계",
  ],
};

// ✅ 단어 카테고리 확인 함수 개선
export function getWordCategory(word: string): string[] {
  const categories = [];
  const lowerWord = word.toLowerCase().trim();

  // 정확한 매칭 우선
  if (WORD_CATEGORIES.BEVERAGES.includes(lowerWord)) {
    categories.push("BEVERAGE");
  }
  if (WORD_CATEGORIES.FOODS.includes(lowerWord)) {
    categories.push("FOOD");
  }
  if (WORD_CATEGORIES.COOKABLE.includes(lowerWord)) {
    categories.push("COOKABLE");
  }
  if (WORD_CATEGORIES.NON_CONSUMABLES.includes(lowerWord)) {
    categories.push("NON_CONSUMABLE");
  }
  if (WORD_CATEGORIES.TOOLS_ITEMS.includes(lowerWord)) {
    categories.push("TOOL");
  }

  console.log(`📋 단어 "${word}" 분류: [${categories.join(", ")}]`);

  return categories;
}

// ✅ 더 엄격한 동작 검증
export function canPerformAction(verb: string, object: string): boolean {
  const categories = getWordCategory(object);
  const verbLower = verb.toLowerCase();

  switch (verbLower) {
    case "drink":
    case "drank":
      // 음료가 아니면 절대 불가
      if (categories.includes("NON_CONSUMABLE")) {
        console.log(`🚫 "${object}"는 마실 수 없는 물건입니다`);
        return false;
      }
      return categories.includes("BEVERAGE");

    case "eat":
    case "ate":
      // 비식품이면 절대 불가
      if (categories.includes("NON_CONSUMABLE")) {
        console.log(`🚫 "${object}"는 먹을 수 없는 물건입니다`);
        return false;
      }
      return categories.includes("FOOD");

    case "make":
    case "made":
    case "prepare":
    case "prepared":
      return categories.includes("COOKABLE") || categories.includes("TOOL");

    case "have":
      return true; // 소유는 모든 것에 가능

    default:
      return true;
  }
}
