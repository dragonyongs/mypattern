// src/constants/workbook.constants.ts
export const WORKBOOK_CONSTANTS = {
  SCORE_THRESHOLDS: {
    PERFECT: 1.0,
    GOOD: 0.7,
  },
  TTS_CONFIG: {
    LANG: "en-US" as const,
    RATE: 0.8,
  },
  ANIMATIONS: {
    PROGRESS_DURATION: 500,
  },
} as const;

export const WORKBOOK_MESSAGES = {
  PERFECT: "완벽합니다!",
  GOOD: "잘하셨어요!",
  RETRY: "다시 도전해보세요!",
  CORRECT: "정답입니다! 🎉",
  INCORRECT: (answer: string) => `아쉽네요! 정답: ${answer}`,
  STUDY_HINTS: {
    IMMERSIVE: "🧠 영어로 직접 문제를 해결해보세요",
    ASSISTED: "💡 필요시 설명을 확인하며 학습하세요",
  },
} as const;
