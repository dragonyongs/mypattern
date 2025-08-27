export type Language = "ko" | "en";

export interface ReviewInterval {
  red: number; // 1일
  yellow: number; // 3일
  green: number; // 7일
}

export interface Settings {
  dailyGoal: number; // 기본값: 3
  reviewInterval: ReviewInterval;
  language: Language; // 기본값: 'ko'
  hideL1: boolean; // L1 숨김 여부 (기본값: true)
  soundEnabled?: boolean; // 음성 재생 여부
  autoAdvance?: boolean; // 자동 진행 여부
}

// 기본 설정값
export const defaultSettings: Settings = {
  dailyGoal: 3,
  reviewInterval: {
    red: 1,
    yellow: 3,
    green: 7,
  },
  language: "ko",
  hideL1: true,
  soundEnabled: true,
  autoAdvance: false,
};

// 설정 검증 함수
export function isValidSettings(
  settings: Partial<Settings>
): settings is Settings {
  return !!(
    typeof settings.dailyGoal === "number" &&
    settings.reviewInterval &&
    typeof settings.reviewInterval.red === "number" &&
    typeof settings.reviewInterval.yellow === "number" &&
    typeof settings.reviewInterval.green === "number" &&
    settings.language &&
    ["ko", "en"].includes(settings.language) &&
    typeof settings.hideL1 === "boolean"
  );
}
