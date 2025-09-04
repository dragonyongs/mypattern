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
} from "lucide-react";

import { useAppStore } from "../stores/appStore";
import { useStudyProgressStore } from "../stores/studyProgressStore";
import {
  useCalendarDayStatus,
  useSelectedPack,
} from "@/shared/hooks/useAppHooks";
import type { StudyMode, Day } from "@/types";

type StatCardProps = {
  icon: React.ComponentType<any>;
  value: number | string;
  label: string;
  colorClass?: string;
};

const StatCard: React.FC<StatCardProps> = ({
  icon: Icon,
  value,
  label,
  colorClass = "",
}) => (
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

type DayCardProps = {
  day: Day & {
    pageRange?: string;
    hasContent?: boolean;
    isCompleted?: boolean;
  };
  status: "current" | "completed" | "locked" | "available";
  onSelect?: (day: Day) => void;
  packId?: string | null;
};

const DayCardInner: React.FC<DayCardProps> = ({
  day,
  status,
  onSelect,
  packId,
}) => {
  const { vocabCompleted, sentenceCompleted, workbookCompleted } =
    useCalendarDayStatus(packId || "", day.day);

  const isDay1Introduction = day.day === 1 && day.type === "introduction";

  const handleClick = () => {
    if (status === "locked") return;
    if (typeof onSelect === "function") onSelect(day);
  };

  return (
    <div
      onClick={handleClick}
      className={`
        relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md
        ${
          status === "locked"
            ? "border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"
            : status === "completed"
            ? "border-green-200 bg-green-50 hover:bg-green-100"
            : status === "current"
            ? "border-blue-400 bg-blue-50 hover:bg-blue-100 shadow-md"
            : "border-gray-200 bg-white hover:bg-gray-50"
        }
      `}
    >
      <div className="absolute top-3 right-3">
        {status === "locked" && <Lock className="w-4 h-4 text-gray-400" />}
        {status === "completed" && (
          <CheckCircle className="w-4 h-4 text-green-600" />
        )}
        {status === "current" && <Play className="w-4 h-4 text-blue-600" />}
      </div>

      <div className="mb-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg font-bold text-gray-800">Day {day.day}</span>
          {status === "current" && (
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
              진행중
            </span>
          )}
        </div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">{day.title}</h3>
      </div>

      {!isDay1Introduction && (
        <div className="flex gap-2 mb-3">
          <div
            className={`w-2 h-2 rounded-full ${
              vocabCompleted ? "bg-green-500" : "bg-gray-200"
            }`}
            title="단어 학습"
          />
          <div
            className={`w-2 h-2 rounded-full ${
              sentenceCompleted ? "bg-blue-500" : "bg-gray-200"
            }`}
            title="문장 학습"
          />
          <div
            className={`w-2 h-2 rounded-full ${
              workbookCompleted ? "bg-purple-500" : "bg-gray-200"
            }`}
            title="워크북"
          />
        </div>
      )}

      {isDay1Introduction && (
        <div className="flex items-center gap-1 mb-3 text-xs text-gray-500">
          <Lightbulb className="w-3 h-3" />
          <span>학습 방법 소개</span>
          <CheckCircle className="w-3 h-3 text-green-500 ml-auto" />
        </div>
      )}

      <div className="space-y-1 text-xs text-gray-500">
        {day.content?.vocabularies?.length > 0 && (
          <div className="flex items-center gap-1">
            <BookOpen className="w-3 h-3" />
            <span>단어 {day.content.vocabularies.length}개</span>
          </div>
        )}
        {day.content?.sentences?.length > 0 && (
          <div className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            <span>문장 {day.content.sentences.length}개</span>
          </div>
        )}
        {day.content?.workbook?.length > 0 && (
          <div className="flex items-center gap-1">
            <PenTool className="w-3 h-3" />
            <span>문제 {day.content.workbook.length}개</span>
          </div>
        )}
      </div>

      {day.pageRange && (
        <div className="mt-2 text-xs text-gray-400">{day.pageRange}</div>
      )}

      {!day.pageRange && (
        <div className="mt-2 text-xs">
          {status === "locked" && (
            <span className="text-gray-400">준비 중</span>
          )}
          {status === "completed" && (
            <span className="text-green-600">완료됨</span>
          )}
        </div>
      )}
    </div>
  );
};

const DayCard = React.memo(DayCardInner);

export default function CalendarPage(): JSX.Element {
  const navigate = useNavigate();
  const { currentDay, setCurrentDay } = useAppStore();
  const { getProgress, getDayProgress } = useStudyProgressStore();
  const { packId, packData: selectedPackData } = useSelectedPack();

  const getDayStatus = useCallback(
    (dayNumber: number): "current" | "completed" | "locked" | "available" => {
      if (!packId) return "locked";
      if (dayNumber === currentDay) return "current";

      const progress = getProgress(packId);
      const dayProgress = progress?.perDay?.[dayNumber - 1];
      if (dayProgress?.dayCompleted) return "completed";

      const prevDayProgress = progress?.perDay?.[dayNumber - 2];
      if (dayNumber === 1 || prevDayProgress?.dayCompleted) return "available";

      return "locked";
    },
    [packId, currentDay, getProgress]
  );

  const determineStudyMode = useCallback(
    (d: any): StudyMode => {
      // day 타입이 정확하지 않을 수 있으므로 안전하게 접근
      const dayObj = d as Day;
      if (dayObj.day === 1 && dayObj.type === "introduction") return "vocab";

      let dayProgress = null;
      if (selectedPackData?.id) {
        try {
          dayProgress = getDayProgress(selectedPackData.id, dayObj.day);
        } catch (e) {
          // 실패 시 기본 동작으로 계속 진행
          console.warn(`[CalendarPage] getDayProgress error:`, e);
        }
      }

      if (!dayProgress?.vocabDone && (dayObj.vocabularies?.length ?? 0) > 0)
        return "vocab";
      if (!dayProgress?.sentenceDone && (dayObj.sentences?.length ?? 0) > 0)
        return "sentence";
      if (!dayProgress?.workbookDone && (dayObj.workbook?.length ?? 0) > 0)
        return "workbook";
      if ((dayObj.vocabularies?.length ?? 0) > 0) return "vocab";
      if ((dayObj.sentences?.length ?? 0) > 0) return "sentence";
      if ((dayObj.workbook?.length ?? 0) > 0) return "workbook";
      return "vocab";
    },
    [selectedPackData?.id, getDayProgress]
  );

  const calendarData = useMemo(() => {
    if (!selectedPackData) return null;

    const { days = [], totalDays = 14 } = selectedPackData;
    if (!Array.isArray(days))
      return { availableDays: 0, completedDays: 0, allDays: [] as any[] };

    let completedDaysCount = 0;
    const allDays: any[] = [];

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
          const dp = getDayProgress(selectedPackData.id, dayNum);
          isCompleted = !!dp?.dayCompleted;
          if (isCompleted) completedDaysCount++;
        } catch (e) {
          // ignore
        }

        allDays.push({
          ...jsonDay,
          day: dayNum,
          hasContent,
          isCompleted,
          pageRange: jsonDay.page ? `p.${jsonDay.page}` : null,
        });
      } else {
        allDays.push({
          day: dayNum,
          type: "locked",
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

    return {
      ...selectedPackData,
      allDays,
      availableDays: allDays.filter((d) => d.hasContent && !d.isCompleted)
        .length,
      completedDays: completedDaysCount,
    };
  }, [selectedPackData, getDayProgress]);

  const getCardStatus = useCallback((d: any) => {
    if (d.isCompleted) return "completed";
    if (d.hasContent) return "available";
    return "locked";
  }, []);

  const handleDaySelect = useCallback(
    (day: any) => {
      const status = getCardStatus(day);
      if (status === "locked") return;

      const studyMode = determineStudyMode(day);
      setCurrentDay(day.day);
      navigate(`/study/${day.day}`, {
        state: { mode: studyMode, from: "calendar" },
      });
    },
    [getCardStatus, determineStudyMode, setCurrentDay, navigate]
  );

  const handleBack = useCallback(() => navigate("/pack-select"), [navigate]);

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
            />
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
            <Calendar className="mr-3 h-5 w-5 text-slate-500" />
            학습 캘린더
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {calendarData.allDays.map((d: any) => (
              <DayCard
                key={d.day}
                day={d}
                status={getDayStatus(d.day)}
                onSelect={handleDaySelect}
                packId={packId}
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
