// src/shared/lib/lang.ts
export type Lang = "ko" | "en" | "mixed" | "empty";

export const splitKeywords = (input: string): string[] =>
  input
    .split(/[,\n]/g)
    .map((s) => s.trim())
    .filter(Boolean);

export function detectLang(input: string): Lang {
  if (!input.trim()) return "empty";
  const hasKo = /[가-힣]/.test(input);
  const hasEn = /[A-Za-z]/.test(input);
  if (hasKo && hasEn) return "mixed";
  if (hasKo) return "ko";
  if (hasEn) return "en";
  return "empty";
}

export function normalizeEn(s: string) {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}
