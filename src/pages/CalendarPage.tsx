// src/pages/CalendarPage.tsx
import React, { useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Lock,
  Check,
  Play,
  ArrowLeft,
  BookOpen,
  BarChart3,
  Clock,
  Info,
} from "lucide-react";

import { useAppStore } from "../stores/appStore";
import { useStudyProgressStore } from "../stores/studyProgressStore";

type StatCardProps = {
  icon: React.ComponentType<any>;
  value: number | string;
  label: string;
  variant?: "primary" | "success" | "warning" | "info";
};

const StatCard: React.FC<StatCardProps> = ({
  icon: Icon,
  value,
  label,
  variant = "primary",
}) => {
  const iconColors = {
    primary: "text-slate-600",
    success: "text-emerald-600",
    warning: "text-slate-600",
    info: "text-blue-600",
  };

  return (
    <div className="bg-white rounded-lg p-5 border border-slate-200 hover:border-slate-300 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-2xl font-semibold text-slate-900 mb-1">
            {value}
          </div>
          <div className="text-sm font-medium text-slate-500">{label}</div>
        </div>
        <div className="ml-4 flex-shrink-0">
          <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center">
            <Icon className={`h-5 w-5 ${iconColors[variant]}`} />
          </div>
        </div>
      </div>
    </div>
  );
};

type StudyModeIndicatorProps = {
  modes: Array<{
    type: "vocab" | "sentence" | "workbook";
    count: number;
    completed: boolean;
  }>;
  isCompleted?: boolean;
};

const StudyModeIndicator: React.FC<StudyModeIndicatorProps> = ({
  modes,
  isCompleted = false,
}) => {
  if (modes.length === 0) return null;

  const modeLabels = {
    vocab: "단어",
    sentence: "문장",
    workbook: "문제",
  };

  const completedCount = modes.filter((mode) => mode.completed).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className={isCompleted ? "text-slate-400" : "text-slate-500"}>
          진행상태
        </span>
        <span
          className={`font-medium ${
            isCompleted ? "text-green-700" : "text-slate-700"
          }`}
        >
          {completedCount}/{modes.length}
        </span>
      </div>
      <div>
        {modes.map((mode, idx) => (
          <div
            key={idx}
            className={`flex items-center justify-between py-1.5 px-2 rounded text-xs ${
              isCompleted ? "bg-white/10" : "bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  mode.completed
                    ? isCompleted
                      ? "bg-emerald-300"
                      : "bg-slate-300"
                    : isCompleted
                    ? "bg-slate-400"
                    : "bg-slate-300"
                }`}
              />
              <span
                className={`font-medium ${
                  mode.completed
                    ? isCompleted
                      ? "text-emerald-500"
                      : "text-slate-700"
                    : isCompleted
                    ? "text-slate-400"
                    : "text-slate-300"
                }`}
              >
                {modeLabels[mode.type]}
              </span>
            </div>
            <span
              className={`font-medium ${
                isCompleted ? "text-slate-400" : "text-slate-500"
              }`}
            >
              {mode.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

type DayCardProps = {
  day: any;
  status: "current" | "completed" | "locked" | "available";
  onSelect?: (day: any) => void;
  packId?: string | null;
};

const DayCardInner: React.FC<DayCardProps> = ({
  day,
  status,
  onSelect,
  packId,
}) => {
  const dayProgress = useStudyProgressStore((state) =>
    packId ? state.progress[packId]?.progressByDay[day.day] : null
  );

  const vocabCompleted = dayProgress?.completedModes
    ? Object.keys(dayProgress.completedModes).some(
        (mode) => mode.includes("vocab") && dayProgress.completedModes[mode]
      )
    : false;
  const sentenceCompleted = dayProgress?.completedModes
    ? Object.keys(dayProgress.completedModes).some(
        (mode) => mode.includes("sentence") && dayProgress.completedModes[mode]
      )
    : false;
  const workbookCompleted = dayProgress?.completedModes
    ? Object.keys(dayProgress.completedModes).some(
        (mode) => mode.includes("workbook") && dayProgress.completedModes[mode]
      )
    : false;

  // [수정] DayCard는 전달받은 day.type을 기준으로 렌더링하므로, 이 로직은 그대로 유지합니다.
  const isDay1Introduction = day.type === "introduction";

  const studyModes = [];
  if (day.showVocab && day.vocabCount > 0) {
    studyModes.push({
      type: "vocab" as const,
      count: day.vocabCount,
      completed: vocabCompleted,
    });
  }
  if (day.showSentence && day.sentenceCount > 0) {
    studyModes.push({
      type: "sentence" as const,
      count: day.sentenceCount,
      completed: sentenceCompleted,
    });
  }
  if (day.showWorkbook && day.workbookCount > 0) {
    studyModes.push({
      type: "workbook" as const,
      count: day.workbookCount,
      completed: workbookCompleted,
    });
  }

  const handleClick = () => {
    if (status === "locked") return;
    if (typeof onSelect === "function") onSelect(day);
  };

  const getCardStyle = () => {
    switch (status) {
      case "locked":
        return "border-slate-200 bg-slate-50 cursor-not-allowed opacity-50";
      case "completed":
        return "border-green-500 bg-white text-green-600 hover:bg-green-50";
      case "current":
        return "border-blue-500 bg-white hover:bg-blue-50 ring-2 ring-blue-100";
      default:
        return "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300";
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "locked":
        return <Lock className="w-3.5 h-3.5 text-slate-400" />;
      case "completed":
        return <Check className="w-3.5 h-3.5 text-white" />;
      case "current":
        return <Play className="w-3.5 h-3.5 text-blue-500" />;
      default:
        return null;
    }
  };

  const textColor =
    status === "completed" ? "text-green-600" : "text-slate-900";
  const subtextColor =
    status === "completed" ? "text-slate-800" : "text-slate-500";

  return (
    <div
      onClick={handleClick}
      className={`
        relative p-4 rounded-lg border-2 transition-all duration-150 cursor-pointer
        ${getCardStyle()}
      `}
    >
      <div className="absolute top-3 right-3">{getStatusIcon()}</div>

      <div className="pr-6 mb-4">
        <div className="flex items-baseline gap-2 mb-1">
          <span className={`text-sm font-bold ${textColor}`}>
            Day {day.day}
          </span>
          {day.pageRange && (
            <span className={`text-xs font-medium ${subtextColor}`}>
              p.{day.pageRange.replace("_", "-")}
            </span>
          )}
        </div>
        <h3
          className={`text-sm font-medium leading-tight line-clamp-2 ${textColor}`}
        >
          {day.title}
        </h3>
      </div>

      {isDay1Introduction ? (
        <div
          className={`px-2 py-1 rounded text-xs font-medium ${
            status === "completed"
              ? "bg-white/20 text-white"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          학습 안내
        </div>
      ) : (
        <StudyModeIndicator
          modes={studyModes}
          isCompleted={status === "completed"}
        />
      )}
    </div>
  );
};

const DayCard = React.memo(DayCardInner);

export default function CalendarPage(): JSX.Element {
  const navigate = useNavigate();

  const currentDay = useAppStore((state) => state.currentDay);
  const setCurrentDay = useAppStore((state) => state.setCurrentDay);
  const selectedPackData = useAppStore((state) => state.selectedPackData);

  const hasHydrated = useStudyProgressStore((state) => state._hasHydrated);
  const getDayProgress = useStudyProgressStore((state) => state.getDayProgress);
  const getPackProgress = useStudyProgressStore(
    (state) => state.getPackProgress
  );

  const packId = useMemo(() => {
    return selectedPackData?.id;
  }, [selectedPackData]);

  React.useEffect(() => {
    if (packId === undefined || packId === "undefined") {
      console.error("❌ Invalid packId detected in CalendarPage");
    }
  }, [packId]);

  const getDayStatus = useCallback(
    (dayNumber: number): "current" | "completed" | "locked" | "available" => {
      if (!packId || packId === "undefined") {
        return "locked";
      }

      const progress = getPackProgress(packId);

      if (!progress) {
        return dayNumber === 1 ? "available" : "locked";
      }

      const dayProgress = progress.progressByDay?.[dayNumber];

      if (dayProgress?.isCompleted) {
        return "completed";
      }

      if (dayNumber === 1) return "available";

      const prevDayProgress = progress.progressByDay?.[dayNumber - 1];
      if (prevDayProgress?.isCompleted) {
        return "available";
      }

      return "locked";
    },
    [packId, getPackProgress]
  );

  // [핵심 수정] calendarData 생성 로직을 데이터 중심으로 변경
  const calendarData = useMemo(() => {
    if (!selectedPackData) return null;

    const { learningPlan } = selectedPackData;
    const totalDays = learningPlan?.totalDays || 14;

    let completedDaysCount = 0;
    const allDays: any[] = [];

    const getContentCounts = (dayPlan: any) => {
      let vocabCount = 0,
        sentenceCount = 0,
        workbookCount = 0;

      if (dayPlan.modes) {
        dayPlan.modes.forEach((mode: any) => {
          const contentIds = mode.contentIds || [];
          const modeType = mode.type || "";

          if (modeType.includes("vocab")) {
            vocabCount += contentIds.length;
          } else if (modeType.includes("sentence")) {
            sentenceCount += contentIds.length;
          } else if (modeType.includes("workbook")) {
            workbookCount += contentIds.length;
          }
        });
      }
      return { vocabCount, sentenceCount, workbookCount };
    };

    for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
      const dayPlan = learningPlan?.days?.find((d) => d.day === dayNum);

      if (dayPlan) {
        const { vocabCount, sentenceCount, workbookCount } =
          getContentCounts(dayPlan);

        // [수정] dayPlan의 mode type을 직접 확인하여 '학습 안내' 여부 결정
        const isIntroDay =
          dayPlan.modes?.some((mode: any) => mode.type === "introduction") ??
          false;

        let isCompleted = false;
        try {
          const dp = getDayProgress(selectedPackData.id, dayNum);
          isCompleted = !!dp?.isCompleted;
          if (isCompleted) completedDaysCount++;
        } catch (e) {
          // ignore error
        }

        allDays.push({
          day: dayNum,
          title: dayPlan.title,
          // [수정] DayCard가 참조할 type을 isIntroDay 값에 따라 동적으로 설정
          type: isIntroDay ? "introduction" : dayPlan.learningMethod || "study",
          pageRange: dayPlan.pageRange || null,
          hasContent:
            isIntroDay ||
            vocabCount > 0 ||
            sentenceCount > 0 ||
            workbookCount > 0,
          isCompleted,
          vocabCount,
          sentenceCount,
          workbookCount,
          learningMethod:
            dayPlan.learningMethod || (isIntroDay ? "introduction" : "unknown"),
          showVocab: vocabCount > 0,
          showSentence: sentenceCount > 0,
          showWorkbook: workbookCount > 0,
        });
      } else {
        allDays.push({
          day: dayNum,
          type: "locked",
          title: `Day ${dayNum}`,
          hasContent: false,
          isCompleted: false,
          vocabCount: 0,
          sentenceCount: 0,
          workbookCount: 0,
          pageRange: null,
          showVocab: false,
          showSentence: false,
          showWorkbook: false,
        });
      }
    }

    return {
      ...selectedPackData,
      allDays,
      availableDays: allDays.filter((d) => d.hasContent && !d.isCompleted)
        .length,
      completedDays: completedDaysCount,
      totalDays,
    };
  }, [selectedPackData, getDayProgress]);

  const handleDaySelect = useCallback(
    (day: any) => {
      const status = getDayStatus(day.day);
      if (status === "locked") {
        return;
      }
      setCurrentDay(day.day);
      navigate(`/study/${day.day}`, { replace: false });
    },
    [getDayStatus, setCurrentDay, navigate]
  );

  const handleBack = useCallback(() => navigate("/"), [navigate]);

  if (!hasHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-blue-500 mx-auto mb-4"></div>
          <p className="text-base font-medium text-slate-700">
            학습 데이터 로딩 중...
          </p>
        </div>
      </div>
    );
  }

  if (!selectedPackData || !packId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
        <div className="text-center max-w-md">
          <BookOpen className="mx-auto h-12 w-12 text-slate-400 mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            학습팩 정보가 없습니다
          </h2>
          <p className="text-slate-500 mb-6">학습팩을 먼저 선택해주세요.</p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors"
          >
            홈으로 이동
          </button>
        </div>
      </div>
    );
  }

  if (!calendarData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
        <div className="text-center max-w-md">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">
            학습팩 로딩 중...
          </h2>
          <p className="text-slate-500 mb-6">데이터를 불러오고 있습니다.</p>
          <button
            onClick={handleBack}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            홈으로
          </button>
        </div>
      </div>
    );
  }

  const { totalDays = 14, availableDays, completedDays } = calendarData;
  const progressPercentage =
    totalDays > 0 ? (completedDays / totalDays) * 100 : 0;

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20 lg:pb-0">
      <header className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={handleBack}
              className="hidden sm:flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2 -ml-3 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <ArrowLeft size={16} />
              학습팩 선택
            </button>
            <div className="flex-1 min-w-0 sm:ml-4">
              <h1 className="text-lg font-bold text-slate-900 truncate">
                {selectedPackData.title}
              </h1>
              {selectedPackData.subtitle && (
                <p className="text-sm text-slate-500 truncate">
                  {selectedPackData.subtitle}
                </p>
              )}
            </div>
            <Calendar className="h-5 w-5 text-slate-400 flex-shrink-0 ml-2" />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 sm:p-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={Clock}
            value={totalDays}
            label="총 일수"
            variant="primary"
          />
          <StatCard
            icon={BarChart3}
            value={availableDays}
            label="학습 가능"
            variant="warning"
          />
          <StatCard
            icon={Check}
            value={completedDays}
            label="완료한 날"
            variant="success"
          />
          <StatCard
            icon={Play}
            value={currentDay}
            label="현재 날짜"
            variant="info"
          />
        </div>

        <div className="bg-white rounded-lg p-6 border border-slate-200 mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">
                학습 진도
              </h3>
              <p className="text-sm text-slate-500">
                현재 {availableDays}일 분량의 학습 콘텐츠가 준비되어 있습니다.
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-slate-900">
                {completedDays}
                <span className="text-sm text-slate-500 ml-1 font-normal">
                  /{totalDays}일
                </span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="text-xs font-medium text-slate-600">
              {Math.round(progressPercentage)}% 완료
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
            <Calendar className="mr-3 h-5 w-5 text-slate-500" />
            학습 캘린더
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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

        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-white border-2 border-slate-300"></div>
              <span className="text-slate-600">학습 가능</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-slate-600">완료됨</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-200"></div>
              <span className="text-slate-600">준비 중</span>
            </div>
          </div>
          <div className="bg-slate-100 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="h-4 w-4 text-slate-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-slate-900 mb-1">학습 가이드</p>
                <p className="text-slate-600">
                  각 날짜를 클릭하여 학습을 시작하세요. 완료된 학습은 언제든지
                  복습할 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
