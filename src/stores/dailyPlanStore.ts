import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { DailyLesson, StudyPlan, VocaItem } from "@/entities";

interface DailyPlanState {
  currentPlan: StudyPlan | null;
  todayLesson: DailyLesson | null;
  completedDays: Set<number>;
  isLoading: boolean;
}

interface DailyPlanActions {
  initializePlan: (
    packId: string,
    packTitle: string,
    items: VocaItem[]
  ) => void;
  startDay: (day: number) => void;
  completeStep: (stepId: string, score: number, timeSpent: number) => void;
  completeDay: (day: number) => void;
  resetPlan: () => void;
  getCurrentDayItems: () => VocaItem[];
}

// 14일 학습 계획 생성
const createStudyPlan = (
  packId: string,
  packTitle: string,
  items: VocaItem[]
): StudyPlan => {
  const itemsPerDay = Math.ceil(items.length / 14);
  const lessons: DailyLesson[] = [];

  for (let day = 1; day <= 14; day++) {
    const startIndex = (day - 1) * itemsPerDay;
    const endIndex = Math.min(startIndex + itemsPerDay, items.length);
    const dayItems = items.slice(startIndex, endIndex);

    const lesson: DailyLesson = {
      day,
      date: new Date(Date.now() + (day - 1) * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      title: `Day ${day}: ${getDayTitle(day)}`,
      description: getDayDescription(day),
      steps: [
        {
          id: `day${day}-flashcard`,
          type: "flashcard",
          title: "1단계: 상상하기",
          description: "이미지로 단어 의미 파악하기",
          items: dayItems,
          completed: false,
        },
        {
          id: `day${day}-overview`,
          type: "overview",
          title: "2단계: 훑기",
          description: "전체 단어 빠르게 살펴보기",
          items: dayItems,
          completed: false,
        },
        {
          id: `day${day}-pronunciation`,
          type: "pronunciation",
          title: "3단계: 말하기",
          description: "발음 연습하기",
          items: dayItems,
          completed: false,
        },
        {
          id: `day${day}-dictation`,
          type: "dictation",
          title: "4단계: 확인하기",
          description: "빈칸 채우기로 확인",
          items: dayItems,
          completed: false,
        },
      ],
      estimatedTime: 30,
      completed: false,
    };

    lessons.push(lesson);
  }

  return {
    id: `plan-${packId}-${Date.now()}`,
    packId,
    packTitle,
    totalDays: 14,
    currentDay: 1,
    lessons,
    startDate: new Date().toISOString().split("T")[0],
    targetEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    completedDays: 0,
  };
};

const getDayTitle = (day: number): string => {
  const titles = [
    "기초 단어 익히기",
    "일상 표현",
    "동작 동사",
    "감정 표현",
    "시간 관련",
    "장소와 방향",
    "음식과 식사",
    "쇼핑과 구매",
    "직장과 업무",
    "취미와 여가",
    "건강과 운동",
    "날씨와 계절",
    "가족과 친구",
    "종합 복습",
  ];
  return titles[day - 1] || `Day ${day}`;
};

const getDayDescription = (day: number): string => {
  return `${day}일차 학습으로 오늘의 핵심 어휘를 4단계로 체계적으로 학습합니다.`;
};

export const useDailyPlanStore = create<DailyPlanState & DailyPlanActions>()(
  persist(
    (set, get) => ({
      // State
      currentPlan: null,
      todayLesson: null,
      completedDays: new Set(),
      isLoading: false,

      // Actions
      initializePlan: (packId, packTitle, items) => {
        const plan = createStudyPlan(packId, packTitle, items);
        const todayLesson = plan.lessons[0];

        set({
          currentPlan: plan,
          todayLesson,
          completedDays: new Set(),
        });
      },

      startDay: (day) => {
        const { currentPlan } = get();
        if (!currentPlan) return;

        const lesson = currentPlan.lessons.find((l) => l.day === day);
        if (lesson) {
          set({
            todayLesson: lesson,
            currentPlan: {
              ...currentPlan,
              currentDay: day,
            },
          });
        }
      },

      completeStep: (stepId, score, timeSpent) => {
        const { currentPlan, todayLesson } = get();
        if (!currentPlan || !todayLesson) return;

        const updatedSteps = todayLesson.steps.map((step) =>
          step.id === stepId
            ? { ...step, completed: true, score, timeSpent }
            : step
        );

        const updatedLesson = { ...todayLesson, steps: updatedSteps };
        const allStepsCompleted = updatedSteps.every((step) => step.completed);

        if (allStepsCompleted) {
          updatedLesson.completed = true;
          updatedLesson.completedAt = new Date().toISOString();
          updatedLesson.totalScore = updatedSteps.reduce(
            (sum, step) => sum + (step.score || 0),
            0
          );
        }

        const updatedLessons = currentPlan.lessons.map((lesson) =>
          lesson.day === todayLesson.day ? updatedLesson : lesson
        );

        set({
          todayLesson: updatedLesson,
          currentPlan: {
            ...currentPlan,
            lessons: updatedLessons,
          },
        });
      },

      completeDay: (day) => {
        const { completedDays, currentPlan } = get();
        const newCompletedDays = new Set(completedDays).add(day);

        set({
          completedDays: newCompletedDays,
          currentPlan: currentPlan
            ? {
                ...currentPlan,
                completedDays: newCompletedDays.size,
              }
            : null,
        });
      },

      resetPlan: () => {
        set({
          currentPlan: null,
          todayLesson: null,
          completedDays: new Set(),
          isLoading: false,
        });
      },

      getCurrentDayItems: () => {
        const { todayLesson } = get();
        return todayLesson?.steps[0]?.items || [];
      },
    }),
    {
      name: "daily-plan-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentPlan: state.currentPlan,
        completedDays: Array.from(state.completedDays), // Set을 Array로 직렬화
      }),
      onRehydrateStorage: () => (state, error) => {
        if (state && Array.isArray(state.completedDays)) {
          // Array를 다시 Set으로 변환
          (state as any).completedDays = new Set(state.completedDays);
        }
      },
    }
  )
);
