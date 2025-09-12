// src/utils/workbook.utils.ts (개선된 버전)
import type { WorkbookItem } from "@/types/workbook.types";

/**
 * 더 안정적인 시드 기반 랜덤 생성기
 */
class SeededRandom {
  private seed: number;

  constructor(seedString: string) {
    // 더 안정적인 해시 생성
    let hash = 0;
    if (seedString.length === 0) hash = 1;
    for (let i = 0; i < seedString.length; i++) {
      const char = seedString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 32비트 정수로 변환
    }
    this.seed = Math.abs(hash) % 2147483647;
  }

  next(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }
}

/**
 * 시드 기반으로 배열을 일관성있게 섞기
 */
export function shuffleWithSeed<T>(array: T[], seedString: string): T[] {
  const rng = new SeededRandom(seedString);
  const shuffled = [...array];

  // Fisher-Yates 알고리즘
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

/**
 * 워크북 아이템의 선택지를 일관성있게 섞기
 */
export function shuffleWorkbookOptions(item: WorkbookItem): WorkbookItem {
  if (!item.options || item.options.length <= 1) {
    return item;
  }

  const correctAnswer = item.correctAnswer || item.answer || "";

  // 🔥 더 고유한 시드 생성 (항목 ID + 선택지 내용 조합)
  const seedString = `${item.id}-${item.options.join("|")}`;
  const shuffledOptions = shuffleWithSeed(item.options, seedString);

  console.debug(`[워크북 섞기] ${item.id}:`, {
    original: item.options,
    shuffled: shuffledOptions,
    correctAnswer,
    originalIndex: item.options.indexOf(correctAnswer) + 1,
    shuffledIndex: shuffledOptions.indexOf(correctAnswer) + 1,
    seed: seedString,
  });

  return {
    ...item,
    options: shuffledOptions,
    correctAnswer,
    answer: correctAnswer,
  };
}

/**
 * 전체 워크북 데이터의 선택지 섞기
 */
export function shuffleWorkbookData(workbook: WorkbookItem[]): WorkbookItem[] {
  console.log("🔀 워크북 선택지 섞기 시작:", workbook.length);

  const shuffledWorkbook = workbook.map(shuffleWorkbookOptions);

  console.log("✅ 워크북 선택지 섞기 완료");
  return shuffledWorkbook;
}
