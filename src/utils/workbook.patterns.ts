// src/utils/workbook.patterns.ts

export const SURFACES: Record<string, string[]> = {
  "#dir-left": ["turn left", "take a left", "make a left", "go left"],
  "#dir-right": ["turn right", "take a right", "make a right", "go right"],
  "#dir-straight": [
    "go straight",
    "straight ahead",
    "keep going straight",
    "continue straight",
  ],
};

export const PATTERNS: Record<string, RegExp[]> = {
  "#dir-left": [/\b(turn|take|make|go)\s+(a\s+)?left\b/i, /\bleft\s+turn\b/i],
  "#dir-right": [
    /\b(turn|take|make|go)\s+(a\s+)?right\b/i,
    /\bright\s+turn\b/i,
  ],
  "#dir-straight": [/\b(go|keep|continue|head)\s+(straight|straight ahead)\b/i],
};

export const normalize = (s = "") =>
  s.toLowerCase().replace(/\s+/g, " ").trim();

export function surfaceForTag(tag: string, pool?: string[]) {
  const list = SURFACES[tag] || [];
  if (!pool || !pool.length) return list[0] ?? null;
  const found = list.find((s) => pool.map(normalize).includes(normalize(s)));
  return found ?? list[0] ?? null;
}

export function matchesTag(choice: string, tag: string) {
  return (PATTERNS[tag] || []).some((rx) => rx.test(choice));
}

// 문장에 첫 매칭을 '_____'로 치환
export function makeBlank(text: string, tags: string[]) {
  for (const tag of tags) {
    for (const rx of PATTERNS[tag] || []) {
      if (rx.test(text)) return text.replace(rx, "_____");
    }
    for (const s of SURFACES[tag] || []) {
      const rx = new RegExp(`\\b${s.replace(/\s+/g, "\\s+")}\\b`, "i");
      if (rx.test(text)) return text.replace(rx, "_____");
    }
  }
  return text; // 매칭 실패 시 원문 유지
}
