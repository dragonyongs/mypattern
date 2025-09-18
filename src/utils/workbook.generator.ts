// src/utils/workbook.generator.ts
import { shuffleWithSeed } from "./workbook.utils";
import { matchesTag, surfaceForTag, normalize } from "./workbook.patterns";
import type { WorkbookItem } from "@/types/workbook.types";

export function generateSafeOptions(
  item: WorkbookItem,
  pool: string[],
  tags: string[],
  distractorCount = 3
) {
  // 정답 표시용 문구 선택(태그 → 표현)
  const preferred = tags.length ? surfaceForTag(tags[0], pool) : null;
  const correctSurface = preferred || item.answer || item.correctAnswer || "";

  const isCorrectish = (s: string) => tags.some((t) => matchesTag(s, t));

  // 태그에 매칭되는 후보는 전부 제외 → 모호성 차단
  const wrongs = pool.filter(
    (s) => !isCorrectish(s) && normalize(s) !== normalize(correctSurface)
  );

  const base = [correctSurface, ...wrongs.slice(0, distractorCount)];
  return shuffleWithSeed(base, item.id);
}
