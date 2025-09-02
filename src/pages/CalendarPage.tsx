// src/pages/CalendarPage.tsx
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Lock,
  CheckCircle,
  Play,
  Book,
  MessageSquare,
  PenTool,
} from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { useStudyProgressStore } from "@/stores/studyProgressStore";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { StudyMode } from "@/types";

const StudyModeIcon: React.FC<{
  mode: StudyMode;
  completed: boolean;
  size?: "sm" | "md";
}> = ({ mode, completed, size = "sm" }) => {
  const iconSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  const iconClass = completed ? "text-green-600" : "text-gray-400";

  switch (mode) {
    case "vocab":
      return <Book className={`${iconSize} ${iconClass}`} />;
    case "sentence":
      return <MessageSquare className={`${iconSize} ${iconClass}`} />;
    case "workbook":
      return <PenTool className={`${iconSize} ${iconClass}`} />;
  }
};

export default function CalendarPage() {
  const navigate = useNavigate();
  const {
    selectedPackData,
    currentDay,
    setCurrentDay,
    dayProgress,
    getAvailableDay,
    getCompletionRate,
    studyStartDate,
  } = useAppStore();

  const availableDay = getAvailableDay();
  const completionRate = getCompletionRate();
  const { getProgress, isNextDayAvailable } = useStudyProgressStore();
  const packProgress = selectedPackData
    ? getProgress(selectedPackData.id)
    : null;

  const calendarData = useMemo(() => {
    if (!selectedPackData) return [];

    return selectedPackData.days.map((dayData) => {
      const dayProgress = packProgress?.perDay[dayData.day - 1] || {
        vocabDone: false,
        sentenceDone: false,
        workbookDone: false,
        dayCompleted: false,
      };

      // 🎯 Day availability 로직 수정
      const isAvailable = dayData.day <= availableDay;
      const isLocked = !isAvailable;
      const isCurrent = dayData.day === currentDay;

      return {
        ...dayData,
        progress: dayProgress,
        isAvailable,
        isLocked,
        isCurrent,
        status: dayProgress.dayCompleted
          ? "completed"
          : isAvailable
          ? "available"
          : "locked",
      };
    });
  }, [selectedPackData, packProgress, isNextDayAvailable]);

  // 🎯 Day 선택 핸들러 수정
  const handleDaySelect = (day: number) => {
    console.log("Day clicked:", day); // 디버깅용

    const dayData = calendarData.find((d) => d.day === day);
    if (!dayData || dayData.isLocked) {
      console.log("Day is locked or not found:", day);
      return;
    }

    console.log("Setting current day and navigating:", day);
    setCurrentDay(day);

    // 🎯 라우팅 수정 - /study/:day 형태로 이동
    navigate(`/study/${day}`);
  };

  if (!selectedPackData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600 mb-4">
            학습팩이 선택되지 않았습니다.
          </p>
          <button
            onClick={() => navigate("/packs")}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            팩 선택하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                {selectedPackData.title}
              </h1>
              <p className="text-gray-600 mt-1">{selectedPackData.subtitle}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-500" />
          </div>

          {/* 진행률 표시 */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                학습 진행률
              </h3>
              <span className="text-2xl font-bold text-blue-600">
                {Math.round(completionRate)}%
              </span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
              <div
                className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-sm text-gray-600">
              <span>
                {Object.values(dayProgress).filter((p) => p.completed).length} /{" "}
                {selectedPackData.totalDays}일 완료
              </span>
              {studyStartDate && (
                <span>
                  시작일:{" "}
                  {format(new Date(studyStartDate), "PPP", { locale: ko })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 달력 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-4">
          {calendarData.map((dayData) => (
            <div
              key={dayData.day}
              onClick={() => handleDaySelect(dayData.day)} // 🎯 클릭 핸들러
              className={`
                relative bg-white rounded-xl p-4 border-2 transition-all duration-200 
                ${
                  dayData.status === "completed"
                    ? "border-green-300 bg-green-50 hover:border-green-400"
                    : dayData.status === "available"
                    ? "border-blue-200 hover:border-blue-400 cursor-pointer hover:shadow-md"
                    : "border-gray-200 opacity-60 cursor-not-allowed"
                }
                ${dayData.isCurrent ? "ring-2 ring-blue-500 ring-offset-2" : ""}
              `}
            >
              {/* 헤더 */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-bold text-gray-700">
                  Day {dayData.day}
                </span>
                {dayData.status === "completed" && (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
                {dayData.status === "locked" && (
                  <Lock className="w-4 h-4 text-gray-400" />
                )}
                {dayData.status === "available" &&
                  !dayData.progress.completed && (
                    <Play className="w-4 h-4 text-blue-500" />
                  )}
              </div>

              {/* 카테고리/제목 */}
              <h4 className="font-medium text-gray-800 mb-2 text-sm leading-tight">
                {dayData.category || dayData.title}
              </h4>

              {/* 페이지 정보 */}
              {dayData.page && (
                <p className="text-xs text-gray-500 mb-3">p.{dayData.page}</p>
              )}

              {/* Day 1 특별 처리 */}
              {dayData.day === 1 ? (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-blue-600 font-medium">
                    학습 방법 소개
                  </span>
                  {dayData.progress.completed && (
                    <CheckCircle className="w-3 h-3 text-green-500" />
                  )}
                </div>
              ) : (
                /* 학습 모드 진행률 */
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    <StudyModeIcon
                      mode="vocab"
                      completed={dayData.progress.vocab}
                    />
                    <StudyModeIcon
                      mode="sentence"
                      completed={dayData.progress.sentence}
                    />
                    <StudyModeIcon
                      mode="workbook"
                      completed={dayData.progress.workbook}
                    />
                  </div>

                  <span className="text-xs text-gray-500">
                    {
                      [
                        dayData.progress.vocab,
                        dayData.progress.sentence,
                        dayData.progress.workbook,
                      ].filter(Boolean).length
                    }
                    /3
                  </span>
                </div>
              )}

              {/* 현재 학습중 표시 */}
              {dayData.isCurrent && dayData.status !== "completed" && (
                <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                  학습중
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 학습 가이드 */}
        <div className="mt-8 bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            학습 가이드
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {selectedPackData.learningMethods.map((method) => (
              <div key={method.phase} className="text-center">
                <div className="text-3xl mb-2">{method.icon}</div>
                <h4 className="font-medium text-gray-800 mb-1">
                  {method.name}
                </h4>
                <p className="text-xs text-gray-600 mb-2">
                  {method.description}
                </p>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                  Day {method.days}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
