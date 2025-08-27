export interface PracticeSession {
  id: string;
  date: string; // ISO date string
  attemptedIds: string[]; // 시도한 문장 ID들
  correctRate: number; // 0-1 정확률
  durationSec: number; // 세션 지속 시간(초)
  type: "learn" | "build" | "review"; // 세션 타입
}

// 개별 시도 기록
export interface PracticeAttempt {
  id: string;
  sentenceId: string;
  sessionId: string;
  correct: boolean;
  responseTime: number; // 반응 시간(ms)
  timestamp: string; // ISO timestamp
}

// 학습 통계
export interface LearningStats {
  totalSentences: number;
  masteredSentences: number; // green 상태
  dailyStreak: number; // 연속 학습일
  averageAccuracy: number;
  totalStudyTime: number; // 총 학습 시간(분)
}
