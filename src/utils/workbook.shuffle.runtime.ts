// src/utils/workbook.shuffle.runtime.ts
import type { WorkbookItem } from "@/types/workbook.types";

// 간단 LRU (용량 초과 시 가장 오래된 키 제거)
class LRU<V> {
  private map = new Map<string, V>();
  constructor(private capacity = 500) {}
  has(key: string) {
    return this.map.has(key);
  }
  get(key: string) {
    if (!this.map.has(key)) return undefined;
    const v = this.map.get(key)!;
    this.map.delete(key);
    this.map.set(key, v);
    return v;
  }
  set(key: string, val: V) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, val);
    if (this.map.size > this.capacity) {
      const oldest = this.map.keys().next().value;
      this.map.delete(oldest);
    }
  }
}

const cache = new LRU<string[]>(800);

// 기존 RNG/셔플은 그대로 사용한다고 가정
// import { shuffleWithSeed } from "./workbook.utils";

const scheduled = new Set<string>();

// 날짜/세션별 변주를 주려면 dayKey를 외부에서 주입 (예: YYYY-MM-DD)
const buildKey = (dayKey: string, item: WorkbookItem) =>
  `${dayKey}:${item.id}:${(item.options || []).join("|")}`;

export function getShuffledItem(
  item: WorkbookItem,
  dayKey: string,
  shuffleWithSeed: <T>(a: T[], s: string) => T[]
): WorkbookItem {
  if (!item.options || item.options.length <= 1) return item;
  const key = buildKey(dayKey, item);
  const cached = cache.get(key);
  const correct = item.correctAnswer || item.answer || "";
  if (cached)
    return {
      ...item,
      options: cached,
      correctAnswer: correct,
      answer: correct,
    };

  const shuffled = shuffleWithSeed(item.options, key);
  cache.set(key, shuffled);
  return {
    ...item,
    options: shuffled,
    correctAnswer: correct,
    answer: correct,
  };
}

// requestIdleCallback 폴리필
const ric = (window.requestIdleCallback ||
  ((cb: any) => setTimeout(() => cb({ timeRemaining: () => 50 }), 1))) as any;
const cic = (window.cancelIdleCallback || clearTimeout) as any;

// 현재 인덱스 주변만 유휴 시간에 워밍업
export function warmupShuffles(
  items: WorkbookItem[],
  dayKey: string,
  currentIndex: number,
  radius: number,
  shuffleWithSeed: <T>(a: T[], s: string) => T[]
) {
  const start = Math.max(0, currentIndex - radius);
  const end = Math.min(items.length, currentIndex + radius + 1);

  type Task = { key: string; item: WorkbookItem };
  const tasks: Task[] = [];
  for (let i = start; i < end; i++) {
    const item = items[i];
    if (!item?.options?.length) continue;
    const key = buildKey(dayKey, item);
    // 이미 캐시됨/예약됨이면 스킵
    if (cache.has(key) || scheduled.has(key)) continue;
    scheduled.add(key);
    tasks.push({ key, item });
  }

  let idleId: number | null = null;
  const run = (deadline?: IdleDeadline) => {
    while (tasks.length && (!deadline || deadline.timeRemaining() > 4)) {
      const { key, item } = tasks.shift()!;
      if (!cache.has(key)) {
        const shuffled = shuffleWithSeed(item.options!, key);
        cache.set(key, shuffled);
      }
      scheduled.delete(key);
    }
    if (tasks.length) idleId = ric(run);
  };

  if (tasks.length) idleId = ric(run);

  return {
    cancel: () => {
      if (idleId != null) cic(idleId);
      // 남은 예약 플래그 해제
      tasks.forEach((t) => scheduled.delete(t.key));
      tasks.length = 0;
    },
  };
}
