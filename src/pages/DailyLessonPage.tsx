import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FlashCardSession } from "@/features/flashcard";
import { OverviewSession } from "@/features/overview";
import { PronunciationSession } from "@/features/pronunciation";
import { DictationSession } from "@/features/dictation";
import { ProgressTracker } from "@/features/progress-tracker";
import { useDailyLesson } from "@/shared/hooks";

const STEP_COMPONENTS = {
  flashcard: FlashCardSession,
  overview: OverviewSession,
  pronunciation: PronunciationSession,
  dictation: DictationSession,
} as const;

export default function DailyLessonPage() {
  const { day } = useParams<{ day: string }>();
  const navigate = useNavigate();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const { lesson, updateStepProgress, completeLesson, loading } =
    useDailyLesson(parseInt(day || "1"));

  if (loading || !lesson) {
    return <div className="p-6">로딩 중...</div>;
  }

  const currentStep = lesson.steps[currentStepIndex];
  const StepComponent = STEP_COMPONENTS[currentStep.type];

  const handleStepComplete = (results: any) => {
    updateStepProgress(currentStepIndex, results);

    if (currentStepIndex < lesson.steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      completeLesson();
      navigate("/app/learn", { replace: true });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 진행률 표시 */}
      <ProgressTracker
        currentStep={currentStepIndex + 1}
        totalSteps={lesson.steps.length}
        stepTitles={lesson.steps.map((s) => s.title)}
        lesson={lesson}
      />

      {/* 현재 단계 */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold">{currentStep.title}</h2>
          <p className="text-gray-600 text-sm mt-1">
            {currentStep.description}
          </p>
        </div>

        <div className="p-6">
          <StepComponent
            items={currentStep.items}
            onComplete={handleStepComplete}
          />
        </div>
      </div>
    </div>
  );
}
