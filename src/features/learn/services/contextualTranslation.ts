// src/features/learn/services/contextualTranslation.ts
export function getContextualKorean(
  englishPattern: string,
  items: Record<string, string>
): string {
  // 음료 관련
  if (
    englishPattern.includes("have") &&
    ["coffee", "tea", "water", "juice"].some((drink) =>
      Object.values(items).some((item) => item.includes(drink))
    )
  ) {
    return Object.values(items)[0] + " 마셨어";
  }

  // 음식 관련
  if (
    englishPattern.includes("have") &&
    ["food", "lunch", "dinner", "bread"].some((food) =>
      Object.values(items).some((item) => item.includes(food))
    )
  ) {
    return Object.values(items)[0] + " 먹었어";
  }

  // 장소 이동
  if (englishPattern.includes("went to")) {
    const place = items.PLACE || "";
    const time = items.TIME || "";
    return `${time} ${place} 갔어`.trim();
  }

  return ""; // 기본 패턴 사용
}
