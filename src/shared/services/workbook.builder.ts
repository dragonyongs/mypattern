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

  return picked.map((raw: any) => {
    const tags = (raw.targetWords || []).map(tagOf);
    const pool = directionsPoolFrom(data);

    // 표시용 정답(태그 -> 자연스러운 표현)
    const displayAnswer =
      (tags.length ? surfaceForTag(tags[0], pool) : null) ||
      raw.targetWords?.[0] ||
      "";

    // 질문은 영문 원문에 빈칸(_____) 처리
    const questionBlank = makeBlank(raw.text, tags);

    const base: WorkbookItem = {
      id: raw.id,
      sentence: raw.text, // 원문(영문)
      blank: questionBlank, // 빈칸 처리된 원문
      question: questionBlank, // 카드에 노출할 질문
      options: [],
      answer: displayAnswer, // 표시/채점용 정답 표현
      explanation: raw.translation || "", // 번역은 해설로
      correctAnswers: tags,
      evaluation: { mode: "single", tags },
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
