// src/schedule.ts
import { addDays, parseISO, formatISO, isToday, isPast } from "date-fns";
import type { Sentence, SentenceStatus, ReviewInterval } from "@/entities";

/**
 * 상태별 복습 간격(reviewInterval)에서 일수(days)를 가져와 다음 기한 날짜(YYYY-MM-DD)를 계산
 */
export function calculateNextDue(
  status: SentenceStatus,
  reviewInterval: ReviewInterval
): string {
  const days = reviewInterval[status];
  const nextDate = addDays(new Date(), days);
  return formatISO(nextDate, { representation: "date" }); // YYYY-MM-DD
}

/**
 * 오늘 기준으로 기한이 도래한 문장들만 우선순위(빨>노>초)와 더 오래된 순으로 정렬해 반환
 */
export function generateDailyQueue(sentences: Sentence[]): Sentence[] {
  const today = formatISO(new Date(), { representation: "date" });
  return sentences
    .filter((sentence) => sentence.nextDue <= today)
    .sort((a, b) => {
      // 우선순위: red > yellow > green
      const statusPriority: Record<SentenceStatus, number> = {
        red: 3,
        yellow: 2,
        green: 1,
      };
      const aPriority = statusPriority[a.status];
      const bPriority = statusPriority[b.status];
      if (aPriority !== bPriority) {
        return bPriority - aPriority; // 높은 우선순위 먼저
      }
      // 동일 우선순위면 nextDue가 더 오래된 것 먼저
      return new Date(a.nextDue).getTime() - new Date(b.nextDue).getTime();
    });
}

/**
 * 정답/오답 결과에 따라 박스 상태를 갱신하고, 연습 카운트/마지막 연습/다음 기한을 업데이트
 */
export function updateSentenceStatus(
  sentence: Sentence,
  correct: boolean,
  reviewInterval: ReviewInterval
): Sentence {
  let newStatus: SentenceStatus = sentence.status;

  if (correct) {
    // 정답: red -> yellow -> green (green은 유지)
    if (sentence.status === "red") newStatus = "yellow";
    else if (sentence.status === "yellow") newStatus = "green";
  } else {
    // 오답: 항상 red로 강등
    newStatus = "red";
  }

  return {
    ...sentence,
    status: newStatus,
    practiceCount: sentence.practiceCount + 1,
    lastPracticed: new Date().toISOString(),
    nextDue: calculateNextDue(newStatus, reviewInterval),
  };
}

/**
 * 오늘 기준으로 연체인지 여부
 */
export function isOverdue(sentence: Sentence): boolean {
  const dueDate = parseISO(sentence.nextDue);
  return isPast(dueDate) && !isToday(dueDate);
}

/**
 * 다음 복습까지 남은 일수(오늘 포함하여 올림 처리)
 */
export function getDaysUntilDue(sentence: Sentence): number {
  const dueDate = parseISO(sentence.nextDue);
  const today = new Date();
  const diffTime = dueDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
