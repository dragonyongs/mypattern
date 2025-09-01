// src/shared/lib/schedule.ts
import type { Sentence, SentenceStatus } from "@/entities";

/**
 * 오늘 복습해야 할 문장들을 생성합니다.
 * @param sentences 전체 문장 배열
 * @returns 오늘 복습해야 할 문장들
 */
export function generateDailyQueue(sentences: Sentence[]): Sentence[] {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD 형식

  return sentences.filter((sentence) => {
    // 완전히 숙달되지 않았거나 (red, yellow)
    // 숙달되었어도 복습 날짜가 도래한 경우
    return sentence.status !== "green" || sentence.nextDue <= today;
  });
}

/**
 * 문장 상태에 따른 다음 복습 날짜를 계산합니다.
 * @param status 현재 문장 상태
 * @param reviewInterval 복습 간격 설정
 * @returns 다음 복습 날짜 (YYYY-MM-DD)
 */
export function calculateNextDue(
  status: SentenceStatus,
  reviewInterval: { red: number; yellow: number; green: number }
): string {
  const today = new Date();
  const daysToAdd = reviewInterval[status];

  const nextDate = new Date(today);
  nextDate.setDate(today.getDate() + daysToAdd);

  return nextDate.toISOString().split("T")[0];
}

/**
 * 문장 상태를 업데이트합니다.
 * @param sentence 업데이트할 문장
 * @param correct 정답 여부
 * @param reviewInterval 복습 간격 설정
 * @returns 업데이트된 문장
 */
export function updateSentenceStatus(
  sentence: Sentence,
  correct: boolean,
  reviewInterval: { red: number; yellow: number; green: number }
): Sentence {
  const now = new Date().toISOString();
  let newStatus: SentenceStatus;

  // SRS 로직: 정답이면 단계 상승, 오답이면 red로 돌아감
  if (correct) {
    switch (sentence.status) {
      case "red":
        newStatus = "yellow";
        break;
      case "yellow":
        newStatus = "green";
        break;
      case "green":
        newStatus = "green"; // 유지
        break;
    }
  } else {
    newStatus = "red"; // 오답시 처음부터 다시
  }

  return {
    ...sentence,
    status: newStatus,
    practiceCount: sentence.practiceCount + 1,
    lastPracticed: now,
    nextDue: calculateNextDue(newStatus, reviewInterval),
  };
}

/**
 * 복습 통계를 계산합니다.
 * @param sentences 문장 배열
 * @returns 상태별 통계
 */
export function getReviewStats(sentences: Sentence[]) {
  const stats = {
    red: 0,
    yellow: 0,
    green: 0,
    total: sentences.length,
  };

  sentences.forEach((sentence) => {
    stats[sentence.status]++;
  });

  const dailyQueue = generateDailyQueue(sentences);

  return {
    ...stats,
    dueToday: dailyQueue.length,
    masteryRate: Math.round((stats.green / stats.total) * 100) || 0,
  };
}
