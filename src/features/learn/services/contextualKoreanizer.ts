// src/features/learn/services/contextualKoreanizer.ts
export function applyContextualKorean(
  koSurface: string,
  slotValues: Record<string, { word: string; pos: string; lexeme?: any }>,
  schemaId: string
): string {
  let result = koSurface;

  // 음식/음료 문맥 처리
  if (schemaId === "HAD-FOOD-DRINK") {
    const item = slotValues.ITEM?.word || "";
    const time = slotValues.TIME?.word || "";

    // 음료 판단
    if (
      ["coffee", "tea", "water", "juice", "커피", "차", "물", "주스"].some(
        (drink) => item.toLowerCase().includes(drink)
      )
    ) {
      result = `${time} ${item} 마셨어`.trim();
    }
    // 음식 판단
    else if (
      ["food", "lunch", "dinner", "bread", "밥", "점심", "저녁", "빵"].some(
        (food) => item.toLowerCase().includes(food)
      )
    ) {
      result = `${time} ${item} 먹었어`.trim();
    }
    // 기타
    else {
      result = `${time} ${item} 했어`.trim();
    }
  }

  // [ACTION] 플레이스홀더 처리
  result = result.replace(/\[ACTION\]/g, "마셨어");

  // 조사 처리
  result = attachParticles(result, slotValues);

  return result;
}

// 조사 자동 첨부
function attachParticles(
  text: string,
  slotValues: Record<string, any>
): string {
  return text.replace(/\[(\w+)\]/g, (match, slotName) => {
    const slotData = slotValues[slotName];
    if (!slotData) return match;

    return slotData.word;
  });
}
