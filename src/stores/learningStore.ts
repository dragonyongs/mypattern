// src/stores/learningStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type StudyMode = "daily-plan" | "flashcard" | "dictation" | "pronunciation";

interface LearningState {
  studyMode: StudyMode;
  currentStepId: string | null;
  isSessionActive: boolean;
}

interface LearningActions {
  setStudyMode: (mode: StudyMode) => void;
  setCurrentStepId: (stepId: string | null) => void;
  startSession: () => void;
  endSession: () => void;
}

export const useLearningStore = create<LearningState & LearningActions>()(
  persist(
    (set) => ({
      // State
      studyMode: "daily-plan",
      currentStepId: null,
      isSessionActive: false,

      // Actions
      setStudyMode: (mode) => set({ studyMode: mode }),
      setCurrentStepId: (stepId) => set({ currentStepId: stepId }),
      startSession: () => set({ isSessionActive: true }),
      endSession: () => set({ isSessionActive: false, currentStepId: null }),
    }),
    {
      name: "learning-session-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
