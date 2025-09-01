import React from "react";
import { Calendar, Clock, BookOpen, CheckCircle } from "lucide-react";
import { DailyPlan } from "../model";

interface DailyPlanCardProps {
  plan: DailyPlan;
  onStartDay: (day: number) => void;
  isCompleted: boolean;
  isToday: boolean;
}

export function DailyPlanCard({
  plan,
  onStartDay,
  isCompleted,
  isToday,
}: DailyPlanCardProps) {
  return (
    <div
      className={`relative p-4 rounded-lg border-2 transition-all ${
        isCompleted
          ? "bg-green-50 border-green-200"
          : isToday
          ? "bg-blue-50 border-blue-300 shadow-md"
          : "bg-white border-gray-200 hover:border-gray-300"
      }`}
    >
      {/* 완료 체크 */}
      {isCompleted && (
        <div className="absolute -top-2 -right-2">
          <CheckCircle className="size-6 text-green-500 bg-white rounded-full" />
        </div>
      )}

      {/* 오늘 배지 */}
      {isToday && !isCompleted && (
        <div className="absolute -top-2 left-4">
          <span className="px-2 py-1 text-xs font-bold text-white bg-blue-500 rounded-full">
            TODAY
          </span>
        </div>
      )}

      <div className="space-y-3">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Day {plan.day}</h3>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Clock className="size-4" />
            {plan.estimatedTime}분
          </div>
        </div>

        {/* 학습 목표 */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-1">
            {plan.title}
          </h4>
          <p className="text-xs text-gray-600">{plan.description}</p>
        </div>

        {/* 학습 단계 */}
        <div className="space-y-2">
          {plan.steps.map((step, index) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <div
                className={`w-2 h-2 rounded-full ${
                  isCompleted ? "bg-green-400" : "bg-gray-300"
                }`}
              />
              <span className="text-gray-600">
                {index + 1}. {step.title} ({step.itemCount}개)
              </span>
            </div>
          ))}
        </div>

        {/* 액션 버튼 */}
        <button
          onClick={() => onStartDay(plan.day)}
          disabled={isCompleted}
          className={`w-full py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            isCompleted
              ? "bg-green-100 text-green-700 cursor-default"
              : isToday
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          {isCompleted ? "완료됨" : isToday ? "시작하기" : "학습하기"}
        </button>
      </div>
    </div>
  );
}
