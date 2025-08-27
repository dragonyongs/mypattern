export type Level = "beginner" | "intermediate" | "advanced";

export interface Pattern {
  id: string;
  template: string; // "Excuse me, do you know where X is?"
  slots: string[]; // ["PLACE"]
  category: string; // "location", "request", "greeting" 등
  level: Level;
  examples: string[]; // ["bank", "restroom", "subway station"]
}

// 패턴 슬롯 치환을 위한 헬퍼 타입
export interface SlotValue {
  slotName: string;
  value: string;
}

// 패턴에서 문장 생성을 위한 헬퍼 함수
export function generateSentence(
  pattern: Pattern,
  slotValues: SlotValue[]
): string {
  let result = pattern.template;
  slotValues.forEach(({ slotName, value }) => {
    result = result.replace(new RegExp(slotName, "g"), value);
  });
  return result;
}

// 패턴 검증 함수
export function isValidPattern(pattern: Partial<Pattern>): pattern is Pattern {
  return !!(
    pattern.id &&
    pattern.template &&
    pattern.slots &&
    pattern.category &&
    pattern.level &&
    pattern.examples
  );
}
