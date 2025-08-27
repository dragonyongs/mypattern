// src/shared/config/featureFlags.ts
export const featureFlags = {
  speechLessonEnabled: true, // 음성 학습 모달 항상 ON
  ruleBasedWritingEnabled: true, // 규칙 기반 영작 ON
  webTTSEnabled: true, // 브라우저 TTS ON
} as const;
