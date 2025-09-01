import { formatISO } from "date-fns";

// 데이터팩 항목 형태(유연)
type PackItem = {
  id?: string | number;
  headword?: string;
  definition?: string;
  exampleEn?: string;
  exampleKo?: string;
};

// App에서 사용하는 최소 Sentence 형태(로컬 타입)
type SentenceLike = {
  id: string;
  text: string;
  translation?: string;
  status: "red" | "yellow" | "green";
  practiceCount: number;
  lastPracticed?: string | null;
  nextDue: string; // YYYY-MM-DD
};

function normalizeItemsToSentences(
  packId: string,
  items: PackItem[]
): SentenceLike[] {
  const today = formatISO(new Date(), { representation: "date" });
  return items.map((it, idx) => ({
    id: `${packId}-${it.id ?? idx + 1}`,
    text: it.exampleEn || it.headword || `Sample sentence ${idx + 1}`,
    translation: it.exampleKo || it.definition || "",
    status: "red",
    practiceCount: 0,
    lastPracticed: null,
    nextDue: today,
  }));
}

async function tryImportJson(path: string): Promise<any | null> {
  try {
    // Vite의 정적 import 경로 기준
    const mod = await import(/* @vite-ignore */ path);
    return mod.default ?? mod;
  } catch {
    return null;
  }
}

/**
 * packId로 데이터팩을 로드하고 SentenceLike[]로 정규화
 * - real-voca-basic → /src/data/books/real-voca-basic.json
 * - real-voca-advanced → /src/data/books/real-voca-advanced.json
 */
export async function loadPackById(packId: string): Promise<SentenceLike[]> {
  const mapping: Record<string, string> = {
    "real-voca-basic": "@/data/books/real-voca-basic.json",
    "real-voca-advanced": "@/data/books/real-voca-advanced.json",
  };

  const jsonPath = mapping[packId];
  let items: PackItem[] | null = null;

  if (jsonPath) {
    const data = await tryImportJson(jsonPath);
    // 데이터 구조 유연 대응: data.items || data.lessons?.flatMap(l => l.items) || data
    if (data) {
      if (Array.isArray(data)) items = data;
      else if (Array.isArray(data.items)) items = data.items;
      else if (Array.isArray(data.lessons))
        items = data.lessons.flatMap((l: any) => l.items ?? []);
      else items = null;
    }
  }

  // 파일이 없거나 비어 있으면 더미 생성
  if (!items || items.length === 0) {
    items = Array.from({ length: 10 }).map((_, i) => ({
      id: i + 1,
      exampleEn: `I will master real vocabulary #${i + 1}.`,
      exampleKo: `리얼 보카 #${i + 1}을(를) 익힙니다.`,
    }));
  }

  return normalizeItemsToSentences(packId, items);
}
