// src/shared/services/workbook.builder.ts
import type { PackData } from "@/types";
import type { WorkbookItem } from "@/types/workbook.types";
import { generateSafeOptions } from "@/utils/workbook.generator";
import { packDataService } from "@/shared/services/packDataService"; // Proxy용 [서비스 의존]
import { makeBlank, surfaceForTag } from "@/utils/workbook.patterns"; // 추가

// 태그 매핑
const tagOf = (w: string) => {
  const s = w.toLowerCase();
  if (s.includes("turn left")) return "#dir-left";
  if (s.includes("turn right")) return "#dir-right";
  if (s.includes("straight")) return "#dir-straight";
  return `#${s}`;
};

// 도메인 풀 생성
const directionsPoolFrom = (data: PackData) =>
  (data.contents || [])
    .filter((c: any) => c.type === "vocabulary" && c.category === "directions")
    .map((c: any) => c.word);

// 동기: 메모리에 로드된 PackData로부터 생성
export function buildWorkbookForDayFromPack(
  data: PackData,
  dayNumber: number,
  optionCount = 4
): WorkbookItem[] {
  const day = data.learningPlan.days.find((d: any) => d.day === dayNumber);
  if (!day) return [];
  const pool = directionsPoolFrom(data);

  const sentenceIds = (day.modes || []).flatMap((m: any) =>
    m.type?.includes("sentence") ? m.contentIds || [] : []
  );

  const sentences = (data.contents || []).filter(
    (c: any) =>
      c.type === "sentence" &&
      (sentenceIds.length === 0 || sentenceIds.includes(c.id))
  );

  const prioritized = sentences.filter((s: any) => s.category === "directions");
  const picked = (prioritized.length ? prioritized : sentences).slice(0, 12);

  // workbook.builder.ts에서
  return picked.map((raw: any) => {
    const tags = raw.targetWords?.map(tagOf) || [];
    const pool = directionsPoolFrom(data);

    const displayAnswer = tags.length
      ? surfaceForTag(tags[0], pool) ?? raw.targetWords?.[0]
      : raw.targetWords?.[0];

    const questionBlank = makeBlank(raw.text, tags);

    const base: WorkbookItem = {
      id: `wb-${raw.id}`, // ← 수정: 워크북 전용 ID로 변경
      sentence: raw.text,
      blank: questionBlank,
      question: questionBlank,
      options: [],
      answer: displayAnswer,
      explanation: raw.translation ?? "",
      correctAnswers: tags,
      evaluation: { mode: "single" },
      tags,
    };

    const opts = generateSafeOptions(base, pool, tags, optionCount - 1);
    return { ...base, options: opts };
  });
}

// 비동기 Proxy: packId로 로드 → FromPack 호출
export async function buildWorkbookForDay(
  packId: string,
  dayNumber: number,
  optionCount = 4
): Promise<WorkbookItem[]> {
  const data = await packDataService.loadPackData(packId);
  return buildWorkbookForDayFromPack(data, dayNumber, optionCount);
}
