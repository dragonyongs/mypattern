// src/features/daily-plan/ui/DailyPlanCard.tsx
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDailyPlan } from "@/shared/hooks";
import { useDailyPlanStore } from "@/stores/dailyPlanStore";
import { logger } from "@/shared/utils/logger";
import {
  Play,
  CheckCircle,
  Clock,
  BookOpen,
  Mic,
  Edit,
  Eye,
  Volume2,
  RotateCcw,
  Award,
  ChevronRight,
  Trophy,
  Calendar,
  Target,
} from "lucide-react";

// 오늘의 학습 계획 표시 섹션
const StudyPlanSection: React.FC = () => {
  const getTodaysStudyPlan = useDailyPlanStore(
    (state) => state.getTodaysStudyPlan
  );
  const startDay = useDailyPlanStore((state) => state.startDay);
  const completedDays = useDailyPlanStore((state) => state.completedDays);
  const reviewQueue = useDailyPlanStore((state) => state.reviewQueue);

  const studyPlan = getTodaysStudyPlan();

  const handleStartReview = (day: number) => {
    console.log("🔥 Starting review for day:", day);
    startDay(day, true);
  };

  const handleStartNew = (day: number) => {
    console.log("🔥 Starting new learning for day:", day);
    startDay(day, false);
  };

  // 표시할 데이터가 없으면 숨김
  if (
    studyPlan.reviews.length === 0 &&
    !studyPlan.newDay &&
    completedDays.length === 0
  ) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-6 shadow-sm border border-blue-100">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-blue-900">📚 오늘의 학습 계획</h3>
      </div>

      {/* 복습 계획 */}
      {studyPlan.reviews.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-1">
            <RotateCcw className="w-4 h-4" />
            🔄 복습 ({studyPlan.reviews.length}개)
          </h4>
          <div className="flex flex-wrap gap-2">
            {studyPlan.reviews.map((day) => (
              <button
                key={day}
                onClick={() => handleStartReview(day)}
                className="px-3 py-2 bg-orange-100 hover:bg-orange-200 text-orange-800 text-sm rounded-lg transition-colors flex items-center gap-1 font-medium"
              >
                <RotateCcw className="w-3 h-3" />
                Day {day}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 새 학습 계획 */}
      {studyPlan.newDay && (
        <div className="mb-3">
          <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-1">
            <Target className="w-4 h-4" />✨ 새 학습
          </h4>
          <button
            onClick={() => handleStartNew(studyPlan.newDay!)}
            className="px-3 py-2 bg-green-100 hover:bg-green-200 text-green-800 text-sm rounded-lg transition-colors flex items-center gap-1 font-medium"
          >
            <Play className="w-3 h-3" />
            Day {studyPlan.newDay}
          </button>
        </div>
      )}

      {/* 완료된 Day가 있지만 오늘 할 일이 없는 경우 */}
      {studyPlan.reviews.length === 0 &&
        !studyPlan.newDay &&
        completedDays.length > 0 && (
          <div className="flex items-center gap-2 text-blue-600">
            <Trophy className="w-4 h-4" />
            <div>
              <p className="text-sm font-medium">오늘은 쉬는 날입니다! 🎉</p>
              <p className="text-xs text-blue-500">
                복습 대기: {reviewQueue.length}개 Day
              </p>
            </div>
          </div>
        )}
    </div>
  );
};

// 메인 DailyPlanCard 컴포넌트
export const DailyPlanCard: React.FC = () => {
  const navigate = useNavigate();
  const { todayLesson, currentPlan } = useDailyPlan();

  // Zustand 스토어에서 직접 가져오기
  const completedDays = useDailyPlanStore((state) => state.completedDays);
  const isReviewMode = useDailyPlanStore((state) => state.isReviewMode);
  const reviewQueue = useDailyPlanStore((state) => state.reviewQueue);

  // 상태 관리
  const [allStepsCompleted, setAllStepsCompleted] = useState(false);
  const [todayProgress, setTodayProgress] = useState(0);

  // 현재 상태 계산
  const isDayCompleted = todayLesson && completedDays.includes(todayLesson.day);
  const nextDay = isDayCompleted ? todayLesson.day + 1 : todayLesson?.day;
  const canStartNextDay = nextDay && nextDay <= 14;
  const isAllCompleted = completedDays.length >= 14;

  // 단계별 아이콘 매핑
  const getStepIcon = (stepType: string) => {
    switch (stepType) {
      case "flashcard":
        return <Eye className="w-5 h-5" />;
      case "overview":
        return <BookOpen className="w-5 h-5" />;
      case "pronunciation":
        return <Mic className="w-5 h-5" />;
      case "dictation":
        return <Edit className="w-5 h-5" />;
      default:
        return <BookOpen className="w-5 h-5" />;
    }
  };

  // 진행률 계산
  useEffect(() => {
    if (todayLesson) {
      const completedSteps = todayLesson.steps.filter(
        (step) => step.completed
      ).length;
      const totalSteps = todayLesson.steps.length;
      const progress = Math.round((completedSteps / totalSteps) * 100);

      setTodayProgress(progress);
      setAllStepsCompleted(completedSteps === totalSteps);

      logger.log("Progress updated:", {
        day: todayLesson.day,
        completedSteps,
        totalSteps,
        progress,
        isDayCompleted,
        isReviewMode,
      });
    }
  }, [todayLesson, isDayCompleted, isReviewMode]);

  // 단계별 페이지 이동
  const navigateToStep = useCallback(
    (step: any) => {
      const stepRoutes = {
        flashcard: "/app/learn/flashcard",
        overview: "/app/learn/overview",
        pronunciation: "/app/learn/pronunciation",
        dictation: "/app/learn/dictation",
      };

      const route = stepRoutes[step.type as keyof typeof stepRoutes];
      if (route) {
        console.log("🔥 Navigating to:", route, "with state:", step);
        navigate(route, {
          state: {
            stepId: step.id,
            stepTitle: step.title,
            items: step.items,
            isReviewMode,
          },
        });
      } else {
        logger.error(`Unknown step type: ${step.type}`);
      }
    },
    [navigate, isReviewMode]
  );

  // 학습 시작/계속하기 핸들러
  const handleStartDay = useCallback(() => {
    if (!todayLesson) {
      logger.error("No today lesson available");
      return;
    }

    const nextStep = todayLesson.steps.find((step) => !step.completed);
    if (nextStep) {
      logger.log(`Starting step: ${nextStep.type} (${nextStep.id})`);
      navigateToStep(nextStep);
    } else {
      logger.warn("No available step to start");
    }
  }, [todayLesson, navigateToStep]);

  // 로딩 중이거나 플랜이 없는 경우
  if (!currentPlan || !todayLesson) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="text-center">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            학습 계획이 없습니다.
          </h3>
          <p className="text-gray-500">먼저 학습할 팩을 선택해주세요.</p>
        </div>
      </div>
    );
  }

  // 모든 학습 완료된 경우
  if (isAllCompleted) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 shadow-sm border border-green-200">
        <div className="text-center">
          <Trophy className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-green-800 mb-2">
            🎉 14일 완주 축하합니다! 🎉
          </h3>
          <p className="text-green-600 mb-4">
            총 {currentPlan.totalDays}일 학습을 모두 완료했습니다.
          </p>
          <div className="bg-white rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-600">
              완료된 학습:{" "}
              <span className="font-semibold text-green-600">
                {completedDays.length}일
              </span>
            </p>
          </div>
          <button
            onClick={() => navigate("/app/review")}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            복습하러 가기
          </button>
        </div>
      </div>
    );
  }

  // 현재 진행 중인 학습
  const nextStep = todayLesson.steps.find((step) => !step.completed);
  const completedStepsCount = todayLesson.steps.filter(
    (step) => step.completed
  ).length;

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      {/* 오늘의 학습 계획 섹션 */}
      <StudyPlanSection />

      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-semibold text-gray-900">
              {todayLesson.title.replace("Day 1: ", "")}
            </h3>
            {isReviewMode && (
              <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full font-medium">
                🔄 복습
              </span>
            )}
          </div>
          <p className="text-gray-600 mt-1">{todayLesson.description}</p>
        </div>
      </div>

      {/* 진행률 */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            {isReviewMode ? "복습 진행률" : "오늘의 진행률"}
          </span>
          <span className="text-sm text-gray-600">{todayProgress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              isReviewMode ? "bg-orange-500" : "bg-blue-500"
            }`}
            style={{ width: `${todayProgress}%` }}
          />
        </div>
      </div>

      {/* 단계별 상태 */}
      <div className="space-y-3 mb-6">
        {todayLesson.steps.map((step, index) => (
          <div
            key={step.id}
            className={`flex items-center gap-3 p-3 rounded-lg ${
              step.completed
                ? "bg-green-50 border border-green-200"
                : step === nextStep
                ? isReviewMode
                  ? "bg-orange-50 border border-orange-200"
                  : "bg-blue-50 border border-blue-200"
                : "bg-gray-50 border border-gray-200"
            }`}
          >
            <div className="flex-shrink-0">
              {step.completed ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center">
                  {step === nextStep && (
                    <div
                      className={`w-2 h-2 rounded-full ${
                        isReviewMode ? "bg-orange-500" : "bg-blue-500"
                      }`}
                    />
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-1">
              {getStepIcon(step.type)}
              <span
                className={`font-medium ${
                  step.completed
                    ? "text-green-800"
                    : step === nextStep
                    ? isReviewMode
                      ? "text-orange-800"
                      : "text-blue-800"
                    : "text-gray-600"
                }`}
              >
                {step.title}
              </span>
            </div>
            <div className="text-right text-sm text-gray-500">
              <div>{step.items?.length || 0}개 항목</div>
              {step.completed && step.score && (
                <div className="font-semibold text-green-600">
                  {step.score}점
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 시작/계속하기 버튼 */}
      <button
        onClick={handleStartDay}
        className={`w-full font-medium py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 ${
          isReviewMode
            ? "bg-orange-600 hover:bg-orange-700 text-white"
            : "bg-blue-600 hover:bg-blue-700 text-white"
        }`}
      >
        <Play className="w-5 h-5" />
        {isReviewMode
          ? "복습 계속하기"
          : completedStepsCount > 0
          ? "학습 계속하기"
          : "오늘 학습 시작하기"}
      </button>

      {/* 다음 단계 안내 */}
      {nextStep && (
        <div
          className={`mt-4 p-3 rounded-lg ${
            isReviewMode ? "bg-orange-50" : "bg-blue-50"
          }`}
        >
          <p
            className={`text-sm ${
              isReviewMode ? "text-orange-800" : "text-blue-800"
            }`}
          >
            <span className="font-semibold">다음 단계:</span> {nextStep.title} (
            {nextStep.items?.length || 0}개 항목)
          </p>
        </div>
      )}

      {/* 전체 진행률 */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>
            {completedDays.length}일 / {currentPlan.totalDays}일 완료
          </span>
          <span>
            전체{" "}
            {Math.round((completedDays.length / currentPlan.totalDays) * 100)}%
            진행
          </span>
        </div>
        {reviewQueue.length > 0 && (
          <div className="mt-2 text-xs text-gray-500">
            복습 대기: {reviewQueue.length}개 Day
          </div>
        )}
      </div>
    </div>
  );
};
