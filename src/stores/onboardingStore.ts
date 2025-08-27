import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface LevelTestAnswer {
  questionId: string;
  selectedOption: number;
  isCorrect: boolean;
}

export interface OnboardingState {
  // 레벨 테스트 관련
  levelTestAnswers: LevelTestAnswer[];
  currentQuestionIndex: number;
  calculatedLevel: "beginner" | "intermediate" | "advanced" | null;

  // 관심사 선택 관련
  selectedInterests: string[];

  // 진행 상태
  levelTestCompleted: boolean;
  interestsSelected: boolean;
  onboardingCompleted: boolean;

  // 메타데이터
  startedAt: string | null;
  completedAt: string | null;
}

interface OnboardingActions {
  // 레벨 테스트 액션
  answerQuestion: (
    questionId: string,
    selectedOption: number,
    isCorrect: boolean
  ) => void;
  setCurrentQuestion: (index: number) => void;
  calculateAndSetLevel: () => void;
  completeLevelTest: () => void;

  // 관심사 액션
  toggleInterest: (interestId: string) => void;
  setInterests: (interests: string[]) => void;
  completeInterests: () => void;

  // 전체 온보딩 관리
  startOnboarding: () => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;

  // 유틸리티
  getProgress: () => number;
}

const initialState: OnboardingState = {
  levelTestAnswers: [],
  currentQuestionIndex: 0,
  calculatedLevel: null,
  selectedInterests: [],
  levelTestCompleted: false,
  interestsSelected: false,
  onboardingCompleted: false,
  startedAt: null,
  completedAt: null,
};

export const useOnboardingStore = create<OnboardingState & OnboardingActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // 레벨 테스트 액션
      answerQuestion: (questionId, selectedOption, isCorrect) => {
        const currentAnswers = get().levelTestAnswers;
        const newAnswer: LevelTestAnswer = {
          questionId,
          selectedOption,
          isCorrect,
        };

        // 기존 답변이 있으면 업데이트, 없으면 추가
        const existingIndex = currentAnswers.findIndex(
          (a) => a.questionId === questionId
        );
        const newAnswers =
          existingIndex >= 0
            ? currentAnswers.map((a, i) =>
                i === existingIndex ? newAnswer : a
              )
            : [...currentAnswers, newAnswer];

        set({ levelTestAnswers: newAnswers });
        console.log("🟡 답변 저장:", newAnswer);
      },

      setCurrentQuestion: (index) => {
        set({ currentQuestionIndex: index });
      },

      calculateAndSetLevel: () => {
        const answers = get().levelTestAnswers;
        const correctCount = answers.filter((a) => a.isCorrect).length;
        const totalQuestions = answers.length;

        let level: "beginner" | "intermediate" | "advanced";
        const accuracy = correctCount / totalQuestions;

        // 기본 정확도 계산
        if (accuracy >= 0.8) {
          level = "advanced";
        } else if (accuracy >= 0.5) {
          level = "intermediate";
        } else {
          level = "beginner";
        }

        console.log("🎯 레벨 계산:", {
          correctCount,
          totalQuestions,
          accuracy,
          level,
        });

        set({ calculatedLevel: level });
        return level;
      },

      completeLevelTest: () => {
        const level = get().calculateAndSetLevel();
        set({
          levelTestCompleted: true,
          calculatedLevel: level,
        });
        console.log("✅ 레벨 테스트 완료:", level);
      },

      // 관심사 액션
      toggleInterest: (interestId) => {
        const current = get().selectedInterests;
        const newInterests = current.includes(interestId)
          ? current.filter((id) => id !== interestId)
          : [...current, interestId];

        set({ selectedInterests: newInterests });
        console.log("🎨 관심사 변경:", newInterests);
      },

      setInterests: (interests) => {
        set({ selectedInterests: interests });
      },

      completeInterests: () => {
        set({
          interestsSelected: true,
          onboardingCompleted: true,
          completedAt: new Date().toISOString(),
        });
        console.log("✅ 관심사 선택 완료");
      },

      // 전체 온보딩 관리
      startOnboarding: () => {
        set({
          startedAt: new Date().toISOString(),
          onboardingCompleted: false,
        });
        console.log("🚀 온보딩 시작");
      },

      completeOnboarding: () => {
        set({
          onboardingCompleted: true,
          completedAt: new Date().toISOString(),
        });
        console.log("🎉 온보딩 완전 완료");
      },

      resetOnboarding: () => {
        set(initialState);
        console.log("🔄 온보딩 초기화");
      },

      // 유틸리티
      getProgress: () => {
        const state = get();
        let progress = 0;

        if (state.levelTestCompleted) progress += 50;
        if (state.interestsSelected) progress += 50;

        return progress;
      },
    }),
    {
      name: "mypattern-onboarding",
      partialize: (state) => ({
        levelTestAnswers: state.levelTestAnswers,
        currentQuestionIndex: state.currentQuestionIndex,
        calculatedLevel: state.calculatedLevel,
        selectedInterests: state.selectedInterests,
        levelTestCompleted: state.levelTestCompleted,
        interestsSelected: state.interestsSelected,
        onboardingCompleted: state.onboardingCompleted,
        startedAt: state.startedAt,
        completedAt: state.completedAt,
      }),
    }
  )
);
