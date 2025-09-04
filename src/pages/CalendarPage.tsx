// src/pages/CalendarPage.tsx
import React, { useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Lock,
  CheckCircle,
  Play,
  ArrowLeft,
  BookOpen,
  MessageSquare,
  PenTool,
  Lightbulb,
  ChevronRight,
} from "lucide-react";

import { useAppStore } from "../stores/appStore";
import { useStudyProgressStore } from "../stores/studyProgressStore";
import type { StudyMode, Day } from "@/types";

// --- Helper Components for Clean UI ---

/**
 * 상단 통계 정보를 표시하는 카드 컴포넌트
 */
const StatCard = ({ icon: Icon, value, label, colorClass }) => (
  <div className="bg-white p-4 rounded-xl shadow-sm flex items-center border border-slate-200">
    <div className={`mr-4 p-3 rounded-lg ${colorClass}`}>
      <Icon className="h-5 w-5 text-white" />
    </div>
    <div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-sm font-medium text-slate-500">{label}</p>
    </div>
  </div>
);

/**
 * 학습 캘린더의 각 날짜를 표시하는 카드 컴포넌트
 */
const DayCard = ({ day, status, onSelect, isCurrent }) => {
  const statusConfig = {
    completed: {
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      icon: <CheckCircle className="h-4 w-4 text-green-500" />,
    },
    available: {
      bgColor: "bg-white",
      borderColor: "border-slate-200",
      hoverBorderColor: "hover:border-blue-400",
      icon: <ChevronRight className="h-5 w-5 text-blue-500" />,
    },
    locked: {
      bgColor: "bg-slate-100",
      borderColor: "border-slate-200",
      textColor: "text-slate-400",
      icon: <Lock className="h-4 w-4 text-slate-400" />,
    },
  };

  const config = statusConfig[status];
  const isIntro = day.type === "introduction" || day.introduction;

  return (
    <div
      onClick={status !== "locked" ? onSelect : undefined}
      className={`
        group p-4 rounded-xl border-2 flex flex-col justify-between
        ${config.bgColor} ${
        isCurrent ? "ring-2 ring-blue-500 ring-offset-1" : config.borderColor
      }
        ${
          status !== "locked"
            ? `cursor-pointer transition-all duration-200 ${config.hoverBorderColor} shadow-sm hover:shadow-md`
            : "cursor-not-allowed opacity-70"
        }
      `}
    >
      <div>
        <div className="flex justify-between items-start mb-2">
          <div className="-mt-1">
            <p
              className={`font-bold text-lg ${
                config.textColor || "text-slate-800"
              }`}
            >
              Day {day.day}
            </p>
            <p className="text-sm text-slate-500">{day.title}</p>
          </div>
          {config.icon}
        </div>

        {status === "available" && !isIntro && (
          <div className="space-y-1 text-xs mt-3">
            {day.vocabularies?.length > 0 && (
              <p className="text-slate-600 font-medium">
                단어 {day.vocabularies.length}개
              </p>
            )}
            {day.sentences?.length > 0 && (
              <p className="text-slate-600 font-medium">
                문장 {day.sentences.length}개
              </p>
            )}
            {day.workbook?.length > 0 && (
              <p className="text-slate-600 font-medium">
                문제 {day.workbook.length}개
              </p>
            )}
          </div>
        )}

        {isIntro && status === "available" && (
          <div className="mt-3 bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-1 rounded-md inline-block">
            학습 가이드
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-between items-center">
        <p className="text-xs font-medium text-slate-400">
          {day.pageRange || " "}
        </p>
        <p
          className={`text-xs font-semibold ${
            status === "completed" ? "text-green-600" : "text-slate-400"
          }`}
        >
          {status === "locked" && "준비 중"}
          {status === "completed" && "완료됨"}
        </p>
      </div>
    </div>
  );
};

export default function CalendarPage() {
  // --- 기존 로직 (수정되지 않음) ---
  const navigate = useNavigate();
  const { selectedPackData, currentDay, setCurrentDay } = useAppStore();
  const { getDayProgress } = useStudyProgressStore();

  const determineStudyMode = useCallback(
    (day) => {
      if (day.day === 1 && day.type === "introduction") {
        return "vocab";
      }
      let dayProgress = null;
      try {
        if (selectedPackData?.id) {
          dayProgress = getDayProgress(selectedPackData.id, day.day);
        }
      } catch (error) {
        console.warn(
          `[CalendarPage] getDayProgress error for day ${day.day}:`,
          error
        );
      }
      if (!dayProgress?.vocabDone && day.vocabularies?.length > 0)
        return "vocab";
      if (!dayProgress?.sentenceDone && day.sentences?.length > 0)
        return "sentence";
      if (!dayProgress?.workbookDone && day.workbook?.length > 0)
        return "workbook";
      if (day.vocabularies?.length > 0) return "vocab";
      if (day.sentences?.length > 0) return "sentence";
      if (day.workbook?.length > 0) return "workbook";
      return "vocab";
    },
    [selectedPackData?.id, getDayProgress]
  );

  const calendarData = useMemo(() => {
    if (!selectedPackData) {
      console.log("[CalendarPage] selectedPackData is null/undefined");
      return null;
    }
    if (!selectedPackData?.days) {
      console.log("[CalendarPage] selectedPackData.days is missing");
      return { availableDays: 0, completedDays: 0, allDays: [] };
    }
    const { days = [], totalDays = 14 } = selectedPackData;
    if (!Array.isArray(days)) {
      console.error("[CalendarPage] days is not an array:", days);
      return { availableDays: 0, completedDays: 0, allDays: [] };
    }
    console.log(
      `[CalendarPage] Processing ${days.length} days out of ${totalDays} total days`
    );

    let completedDaysCount = 0;
    const allDays = [];

    for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
      const jsonDay = days.find((d) => d.day === dayNum);
      if (jsonDay) {
        const hasContent =
          (dayNum === 1 && jsonDay.type === "introduction") ||
          jsonDay.introduction === true ||
          (jsonDay.learningGuide &&
            Object.keys(jsonDay.learningGuide).length > 0) ||
          (jsonDay.vocabularies && jsonDay.vocabularies.length > 0) ||
          (jsonDay.sentences && jsonDay.sentences.length > 0) ||
          (jsonDay.workbook && jsonDay.workbook.length > 0) ||
          (jsonDay.targetWords && jsonDay.targetWords.length > 0);

        let isCompleted = false;
        try {
          const dayProgress = getDayProgress(selectedPackData.id, dayNum);
          isCompleted = dayProgress?.dayCompleted || false;
          if (isCompleted) completedDaysCount++;
        } catch (error) {
          console.warn(
            `[CalendarPage] getDayProgress error for day ${dayNum}:`,
            error
          );
          isCompleted = false;
        }
        console.log(
          `[CalendarPage] Day ${dayNum}: hasContent=${hasContent}, isCompleted=${isCompleted}`
        );

        allDays.push({
          day: dayNum,
          type: jsonDay.type || "vocabulary",
          category: jsonDay.category || jsonDay.title || `Day ${dayNum}`,
          page: jsonDay.page,
          title: jsonDay.title || jsonDay.category || `Day ${dayNum}`,
          methods: jsonDay.methods || [],
          vocabularies: jsonDay.vocabularies || [],
          sentences: jsonDay.sentences || [],
          workbook: jsonDay.workbook || [],
          introduction: jsonDay.introduction,
          learningGuide: jsonDay.learningGuide,
          targetWords: jsonDay.targetWords,
          hasContent: hasContent,
          isCompleted: isCompleted,
          pageRange: jsonDay.page ? `p.${jsonDay.page}` : null,
        });
      } else {
        console.log(`[CalendarPage] Day ${dayNum}: no data found`);
        allDays.push({
          day: dayNum,
          type: "locked",
          category: `Day ${dayNum}`,
          page: null,
          title: `Day ${dayNum}`,
          methods: [],
          vocabularies: [],
          sentences: [],
          workbook: [],
          hasContent: false,
          isCompleted: false,
          pageRange: null,
        });
      }
    }
    const result = {
      ...selectedPackData,
      allDays,
      availableDays: allDays.filter((d) => d.hasContent && !d.isCompleted)
        .length,
      completedDays: completedDaysCount,
    };
    console.log(
      `[CalendarPage] Final result: ${result.availableDays} available days, ${result.completedDays} completed days out of ${result.allDays.length}`
    );
    console.log(
      "[CalendarPage] Available days:",
      allDays.filter((d) => d.hasContent).map((d) => `Day ${d.day}`)
    );
    return result;
  }, [selectedPackData, getDayProgress]);

  const getCardStatus = useCallback((day) => {
    if (day.isCompleted) return "completed";
    if (day.hasContent) return "available";
    return "locked";
  }, []);

  const handleDaySelect = useCallback(
    (day) => {
      const status = getCardStatus(day);
      console.log("[CalendarPage] Day selected:", day.day, "status:", status);
      if (status === "locked") {
        console.log("[CalendarPage] Day is locked, cannot proceed");
        return;
      }
      const studyMode = determineStudyMode(day);
      console.log("[CalendarPage] Determined study mode:", studyMode);
      setCurrentDay(day.day);
      navigate(`/study/${day.day}`, {
        state: { mode: studyMode, from: "calendar" },
      });
    },
    [getCardStatus, determineStudyMode, setCurrentDay, navigate]
  );

  const handleBack = useCallback(() => {
    navigate("/pack-select");
  }, [navigate]);

  // --- 개선된 렌더링 로직 ---

  if (!calendarData || !selectedPackData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 p-4">
        <div className="text-center">
          <BookOpen className="mx-auto h-12 w-12 text-slate-400" />
          <h2 className="mt-4 text-xl font-semibold text-slate-700">
            학습팩 로딩 중...
          </h2>
          <p className="mt-2 text-slate-500">
            데이터를 불러오고 있습니다. 문제가 지속되면 뒤로 가서 다시
            시도해주세요.
          </p>
          <button
            onClick={handleBack}
            className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            학습팩 선택으로
          </button>
        </div>
      </div>
    );
  }

  const { totalDays = 14, availableDays, completedDays } = calendarData;
  const progressPercentage =
    totalDays > 0 ? (completedDays / totalDays) * 100 : 0;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <header className="sticky top-0 bg-slate-50/80 backdrop-blur-lg z-10 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-lg p-2 -ml-2"
            >
              <ArrowLeft size={18} />
              뒤로가기
            </button>
            <div className="text-center">
              <h1 className="text-lg font-bold text-slate-800">
                {selectedPackData.title}
              </h1>
              {selectedPackData.subtitle && (
                <p className="text-sm text-slate-500">
                  {selectedPackData.subtitle}
                </p>
              )}
            </div>
            <div className="w-24 text-right">
              <Calendar className="h-6 w-6 text-slate-400 inline-block" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={Calendar}
            value={totalDays}
            label="총 일수"
            colorClass="bg-blue-500"
          />
          <StatCard
            icon={Play}
            value={availableDays}
            label="학습 가능"
            colorClass="bg-amber-500"
          />
          <StatCard
            icon={CheckCircle}
            value={completedDays}
            label="완료한 날"
            colorClass="bg-green-500"
          />
          <StatCard
            icon={Lightbulb}
            value={currentDay}
            label="현재 날짜"
            colorClass="bg-purple-500"
          />
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 mb-8">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-base font-bold text-slate-800">학습 진도</h3>
            <span className="text-lg font-bold text-blue-600">
              {completedDays}
              <span className="text-sm font-medium text-slate-500">
                /{totalDays}일 완료
              </span>
            </span>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            현재 {availableDays}일 분량의 학습 콘텐츠가 준비되어 있습니다.
          </p>
          <div className="w-full bg-slate-200 rounded-full h-2.5">
            <div
              className="bg-blue-500 h-2.5 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
            <Calendar className="mr-3 h-5 w-5 text-slate-500" />
            학습 캘린더
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {calendarData.allDays.map((day) => (
              <DayCard
                key={day.day}
                day={day}
                status={getCardStatus(day)}
                isCurrent={day.day === currentDay}
                onSelect={() => handleDaySelect(day)}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
          <div className="flex items-center space-x-4 text-slate-600">
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-white border-2 border-slate-400 mr-2"></span>
              학습 가능
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-green-50 border-2 border-green-200 mr-2"></span>
              완료됨
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-slate-100 border-2 border-slate-200 mr-2"></span>
              준비 중
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-3 flex items-start w-full sm:w-auto mt-4 sm:mt-0">
            <Lightbulb className="h-4 w-4 mr-2.5 flex-shrink-0 mt-0.5" />
            <div>
              <strong>학습 팁:</strong> 각 날짜를 클릭하여 학습을 시작하세요.
              완료된 학습은 언제든지 복습할 수 있습니다.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
