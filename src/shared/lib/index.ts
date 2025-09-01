// src/shared/lib/index.ts - 배럴 익스포트
export {
  generateDailyQueue,
  calculateNextDue,
  updateSentenceStatus,
  getReviewStats,
} from "./schedule";

// 날짜 유틸리티
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("ko-KR").format(new Date(date));
}

export function isToday(dateString: string): boolean {
  const today = new Date().toISOString().split("T")[0];
  return dateString === today;
}

export function daysFromNow(days: number): string {
  const future = new Date();
  future.setDate(future.getDate() + days);
  return future.toISOString().split("T")[0];
}
