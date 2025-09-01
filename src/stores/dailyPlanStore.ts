// src/stores/dailyPlanStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { DailyLesson, StudyPlan, VocaItem } from "@/entities";
import { logger } from "@/shared/utils/logger";

interface ReviewItem {
  day: number;
  lastReviewed: string; // ISO date
  nextReviewDate: string; // ISO date
  reviewCount: number;
  averageScore: number;
  interval: number; // days until next review
}

interface DailyPlanState {
  currentPlan: StudyPlan | null;
  todayLesson: DailyLesson | null;
  completedDays: number[];
  reviewQueue: ReviewItem[];
  todayReviews: number[];
  newLearningDay: number;
  isReviewMode: boolean;
  studyHistory: Record<
    string,
    { day: number; score: number; type: "new" | "review" }[]
  >;
  isLoading: boolean;
}

interface DailyPlanActions {
  initializePlan: (
    packId: string,
    packTitle: string,
    items: VocaItem[]
  ) => void;
  startDay: (day: number, isReview?: boolean) => void;
  completeStep: (stepId: string, score: number, timeSpent: number) => void;
  completeDay: (day: number, score: number, isReview?: boolean) => void;
  getTodaysStudyPlan: () => { reviews: number[]; newDay: number | null };
  scheduleReview: (day: number, score: number) => void;
  resetPlan: () => void;
  getCurrentDayItems: () => VocaItem[];
  isCompletedDay: (day: number) => boolean;
}

// 복습 스케줄링 로직 (SM-2 기반)
const calculateNextReviewInterval = (
  currentInterval: number,
  score: number
): number => {
  if (score >= 80) {
    return Math.min(currentInterval * 2, 14); // 최대 2주
  } else if (score >= 60) {
    return currentInterval; // 동일 간격
  } else {
    return Math.max(1, Math.floor(currentInterval / 2)); // 최소 1일
  }
};

const createStudyPlan = (
  packId: string,
  packTitle: string,
  items: VocaItem[]
): StudyPlan => {
  const itemsPerDay = Math.ceil(items.length / 14);
  const lessons: DailyLesson[] = [];
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

  for (let day = 1; day <= 14; day++) {
    const startIndex = (day - 1) * itemsPerDay;
    const endIndex = Math.min(startIndex + itemsPerDay, items.length);
    const dayItems = items.slice(startIndex, endIndex);

    const lesson: DailyLesson = {
      day,
      date: new Date(Date.now() + (day - 1) * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      title: `Day ${day}: ${titles[day - 1]}`,
      description: `${day}일차 학습으로 오늘의 핵심 어휘를 4단계로 체계적으로 학습합니다.`,
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

export const useDailyPlanStore = create<DailyPlanState & DailyPlanActions>()(
  persist(
    (set, get) => ({
      // State
      currentPlan: null,
      todayLesson: null,
      completedDays: [],
      reviewQueue: [],
      todayReviews: [],
      newLearningDay: 1,
      isReviewMode: false,
      studyHistory: {},
      isLoading: false,

      // Actions
      initializePlan: (packId, packTitle, items) => {
        const plan = createStudyPlan(packId, packTitle, items);

        set({
          currentPlan: plan,
          todayLesson: plan.lessons[0],
          completedDays: [],
          reviewQueue: [],
          todayReviews: [],
          newLearningDay: 1,
          isReviewMode: false,
          studyHistory: {},
        });

        console.log(`✅ 학습팩 ${packTitle} 초기화 완료`);
      },

      startDay: (day, isReview = false) => {
        const { currentPlan } = get();
        if (!currentPlan) return;

        const lesson = currentPlan.lessons.find((l) => l.day === day);
        if (lesson) {
          set({
            todayLesson: lesson,
            isReviewMode: isReview,
            currentPlan: {
              ...currentPlan,
              currentDay: day,
            },
          });

          console.log(
            `📚 ${isReview ? "복습" : "새 학습"} Day ${day} 시작:`,
            lesson.title
          );
        }
      },

      completeStep: (stepId, score, timeSpent) => {
        const { currentPlan, todayLesson, isReviewMode } = get();
        if (!currentPlan || !todayLesson) return;

        const updatedSteps = todayLesson.steps.map((step) =>
          step.id === stepId
            ? {
                ...step,
                completed: true,
                score,
                timeSpent,
                completedAt: new Date().toISOString(),
              }
            : step
        );

        const updatedLesson = { ...todayLesson, steps: updatedSteps };
        const allStepsCompleted = updatedSteps.every((step) => step.completed);

        if (allStepsCompleted) {
          const avgScore = Math.round(
            updatedSteps.reduce((sum, step) => sum + (step.score || 0), 0) /
              updatedSteps.length
          );
          get().completeDay(todayLesson.day, avgScore, isReviewMode);
        } else {
          set({
            todayLesson: updatedLesson,
            currentPlan: {
              ...currentPlan,
              lessons: currentPlan.lessons.map((lesson) =>
                lesson.day === todayLesson.day ? updatedLesson : lesson
              ),
            },
          });
        }
      },

      completeDay: (day, score, isReview = false) => {
        const { completedDays, studyHistory } = get();
        const today = new Date().toISOString().split("T")[0];

        if (isReview) {
          // 복습 완료 처리
          get().scheduleReview(day, score);

          set((state) => ({
            todayReviews: state.todayReviews.filter((d) => d !== day),
          }));

          console.log(`✅ Day ${day} 복습 완료 (점수: ${score})`);
        } else {
          // 새 학습 완료 처리
          const newCompletedDays = completedDays.includes(day)
            ? completedDays
            : [...completedDays, day];

          set({
            completedDays: newCompletedDays,
            newLearningDay: day < 14 ? day + 1 : day,
          });

          // 첫 복습 스케줄링
          get().scheduleReview(day, score);

          console.log(`✅ Day ${day} 새 학습 완료 (점수: ${score})`);
        }

        // 학습 기록 저장
        const newHistory = {
          ...studyHistory,
          [today]: [
            ...(studyHistory[today] || []),
            {
              day,
              score,
              type: isReview ? "review" : ("new" as const),
            },
          ],
        };

        set({ studyHistory: newHistory });

        // 다음 학습 계획 자동 설정
        setTimeout(() => {
          const nextStudyPlan = get().getTodaysStudyPlan();

          if (nextStudyPlan.reviews.length > 0) {
            get().startDay(nextStudyPlan.reviews[0], true);
          } else if (nextStudyPlan.newDay) {
            get().startDay(nextStudyPlan.newDay, false);
          } else {
            console.log("🎉 모든 학습 완료!");
          }
        }, 2000);
      },

      getTodaysStudyPlan: () => {
        const { reviewQueue, newLearningDay, completedDays } = get();
        const today = new Date().toISOString().split("T")[0];

        // 오늘 복습할 Day들
        const todayReviews = reviewQueue
          .filter((item) => {
            const reviewDate = new Date(item.nextReviewDate);
            const todayDate = new Date(today);
            return reviewDate <= todayDate;
          })
          .map((item) => item.day)
          .slice(0, 3); // 하루 최대 3개 복습

        // 새로 배울 Day
        const newDay =
          newLearningDay <= 14 && !completedDays.includes(newLearningDay)
            ? newLearningDay
            : null;

        return { reviews: todayReviews, newDay };
      },

      scheduleReview: (day, score) => {
        const { reviewQueue } = get();
        const today = new Date().toISOString().split("T")[0];

        const existingReview = reviewQueue.find((item) => item.day === day);

        if (existingReview) {
          // 기존 복습 아이템 업데이트
          const newInterval = calculateNextReviewInterval(
            existingReview.interval,
            score
          );
          const nextReviewDate = new Date(
            Date.now() + newInterval * 24 * 60 * 60 * 1000
          )
            .toISOString()
            .split("T")[0];

          const updatedReview: ReviewItem = {
            ...existingReview,
            lastReviewed: today,
            nextReviewDate,
            reviewCount: existingReview.reviewCount + 1,
            averageScore: Math.round((existingReview.averageScore + score) / 2),
            interval: newInterval,
          };

          set({
            reviewQueue: reviewQueue.map((item) =>
              item.day === day ? updatedReview : item
            ),
          });
        } else {
          // 새 복습 아이템 생성
          const initialInterval = score >= 80 ? 3 : score >= 60 ? 2 : 1;
          const nextReviewDate = new Date(
            Date.now() + initialInterval * 24 * 60 * 60 * 1000
          )
            .toISOString()
            .split("T")[0];

          const newReview: ReviewItem = {
            day,
            lastReviewed: today,
            nextReviewDate,
            reviewCount: 1,
            averageScore: score,
            interval: initialInterval,
          };

          set({
            reviewQueue: [...reviewQueue, newReview],
          });
        }
      },

      resetPlan: () => {
        set({
          currentPlan: null,
          todayLesson: null,
          completedDays: [],
          reviewQueue: [],
          todayReviews: [],
          newLearningDay: 1,
          isReviewMode: false,
          studyHistory: {},
          isLoading: false,
        });
      },

      getCurrentDayItems: () => {
        const { todayLesson } = get();
        return todayLesson?.steps[0]?.items || [];
      },

      isCompletedDay: (day) => {
        const { completedDays } = get();
        return completedDays.includes(day);
      },
    }),
    {
      name: "daily-plan-storage",
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: (persistedState: any, version: number) => {
        if (!persistedState) return persistedState;

        if (version < 2) {
          return {
            ...persistedState,
            reviewQueue: [],
            todayReviews: [],
            newLearningDay: 1,
            isReviewMode: false,
            studyHistory: {},
            currentPlan: persistedState.currentPlan || null,
            todayLesson: persistedState.todayLesson || null,
            completedDays: persistedState.completedDays || [],
            isLoading: false,
          };
        }
        return persistedState;
      },
      partialize: (state) => ({
        currentPlan: state.currentPlan,
        todayLesson: state.todayLesson,
        completedDays: state.completedDays,
        reviewQueue: state.reviewQueue,
        todayReviews: state.todayReviews,
        newLearningDay: state.newLearningDay,
        studyHistory: state.studyHistory,
      }),
    }
  )
);
