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
        <div className="flex justify-between items-center gap-2 mb-1">
          <span className="text-lg font-bold text-gray-800">Day {day.day}</span>
        </div>
        {/* 제목을 2줄로 제한하고 말줄임표 처리 */}
        <h3 className="text-sm font-medium text-gray-700 mb-2 line-clamp-2 overflow-hidden">
          {day.title}
        </h3>
      </div>

      {/* Day 1 특별 표시 */}
      {isDay1Introduction ? (
        <div className="flex items-center gap-1 mb-3 text-xs text-gray-500">
          <Lightbulb className="w-3 h-3" />
          <span>학습 방법 소개</span>
        </div>
      ) : (
        /* 일반 학습 단계는 도트 + 카운트로 간결하게 */
        <div className="space-y-2">
          {/* 학습 진행 상태 도트 */}
          {(day.showVocab || day.showSentence || day.showWorkbook) && (
            <div className="flex gap-2">
              {day.showVocab && (
                <div
                  className={`w-2 h-2 rounded-full ${
                    vocabCompleted ? "bg-green-500" : "bg-gray-200"
                  }`}
                  title="단어 학습"
                />
              )}
              {day.showSentence && (
                <div
                  className={`w-2 h-2 rounded-full ${
                    sentenceCompleted ? "bg-blue-500" : "bg-gray-200"
                  }`}
                  title="문장 학습"
                />
              )}
              {day.showWorkbook && (
                <div
                  className={`w-2 h-2 rounded-full ${
                    workbookCompleted ? "bg-purple-500" : "bg-gray-200"
                  }`}
                  title="워크북"
                />
              )}
            </div>
          )}

          {/* 콘텐츠 정보를 한 줄로 간결하게 */}
          <div className="flex gap-2 text-xs text-gray-500">
            {day.showVocab && day.vocabCount > 0 && (
              <span>단어 {day.vocabCount}</span>
            )}
            {day.showSentence && day.sentenceCount > 0 && (
              <span>문장 {day.sentenceCount}</span>
            )}
            {day.showWorkbook && day.workbookCount > 0 && (
              <span>문제 {day.workbookCount}</span>
            )}
          </div>
        </div>
      )}

      {/* 페이지 범위 */}
      {day.pageRange && (
        <div className="mt-2 text-xs text-gray-400">
          p.{day.pageRange.replace("_", "-")}
        </div>
      )}
    </div>
  );
};

const DayCard = React.memo(DayCardInner);

export default function CalendarPage(): JSX.Element {
  const navigate = useNavigate();

  // ✅ 모든 Hook을 컴포넌트 최상위에 배치
  const currentDay = useAppStore((state) => state.currentDay);
  const setCurrentDay = useAppStore((state) => state.setCurrentDay);
  const selectedPackData = useAppStore((state) => state.selectedPackData);

  // [중요] hydration 상태 확인 - 항상 호출
  const hasHydrated = useStudyProgressStore((state) => state._hasHydrated);

  const getDayProgress = useStudyProgressStore((state) => state.getDayProgress);
  const getPackProgress = useStudyProgressStore(
    (state) => state.getPackProgress
  );

  // packId 계산을 useMemo로 처리
  const packId = useMemo(() => {
    return selectedPackData?.id;
  }, [selectedPackData]);

  // [중요] packId 유효성 검사 - useEffect는 항상 호출
  React.useEffect(() => {
    console.log("📋 CalendarPage - packId:", packId);
    console.log("📋 CalendarPage - selectedPackData:", selectedPackData);
    if (packId === undefined || packId === "undefined") {
      console.error("❌ Invalid packId detected in CalendarPage");
    }
  }, [packId, selectedPackData]);

  // getDayStatus - 항상 호출하되 내부에서 조건 처리
  const getDayStatus = useCallback(
    (dayNumber: number): "current" | "completed" | "locked" | "available" => {
      if (!packId || packId === "undefined") {
        console.warn("⚠️ Invalid packId in getDayStatus:", packId);
        return "locked";
      }

      const progress = getPackProgress(packId);
      console.log(`📊 Checking Day ${dayNumber} status. Progress:`, progress);

      if (!progress) {
        console.log(`❌ No progress found for ${packId}`);
        return dayNumber === 1 ? "available" : "locked";
      }

      const dayProgress = progress.progressByDay?.[dayNumber];

      if (dayProgress?.isCompleted) {
        console.log(`✅ Day ${dayNumber} is completed`);
        return "completed";
      }

      if (dayNumber === 1) return "available";

      const prevDayProgress = progress.progressByDay?.[dayNumber - 1];
      if (prevDayProgress?.isCompleted) {
        console.log(`🚀 Day ${dayNumber} is available (prev day completed)`);
        return "available";
      }

      console.log(`🔒 Day ${dayNumber} is locked`);
      return "locked";
    },
    [packId, getPackProgress]
  );

  // calendarData useMemo 부분 수정
  const calendarData = useMemo(() => {
    if (!selectedPackData) return null;

    const { learningPlan, contents, categories } = selectedPackData;
    const totalDays = learningPlan?.totalDays || 14;

    let completedDaysCount = 0;
    const allDays: any[] = [];

    // 페이지별 대표 카테고리 1-2개만 선택하는 헬퍼 함수
    const getMainCategoriesForPageRange = (pageRange: string) => {
      if (!pageRange || !categories) return [];
      const [startPage, endPage] = pageRange.split("_").map(Number);
      const pageCategories = categories.filter(
        (cat) => cat.page >= startPage && cat.page <= endPage
      );

      // 최대 2개의 주요 카테고리만 반환
      return pageCategories.slice(0, 2);
    };

    // 각 day의 modes에서 콘텐츠 카운트를 정확히 계산하는 함수
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

        // 학습 단계별 특별 처리
        let learningPhase = "";
        let hasContent = true;
        let displayTitle = dayPlan.title;

        if (dayNum === 1) {
          learningPhase = "introduction";
          hasContent = true;
        } else if (dayNum >= 2 && dayNum <= 5) {
          learningPhase = "skimming";
          hasContent = vocabCount > 0 || sentenceCount > 0;

          // 모든 훑어보기 단계를 일관되게 표시
          if (dayPlan.pageRange) {
            const pageStart = dayPlan.pageRange.split("_")[0];
            const pageEnd = dayPlan.pageRange.split("_")[1];

            if (dayNum === 2) {
              // Day 2는 전체 범위
              displayTitle = `훑어보기 (${pageStart}-${pageEnd}p)`;
            } else {
              // Day 3-5는 대표 카테고리 1개만 + 페이지 범위
              const mainCategories = getMainCategoriesForPageRange(
                dayPlan.pageRange
              );
              const categoryName = mainCategories[0]?.name || `${pageStart}p~`;
              displayTitle = `${categoryName} (훑어보기)`;
            }
          }
        } else if (dayNum >= 6 && dayNum <= 9) {
          learningPhase = "speaking";
          hasContent = vocabCount > 0 || sentenceCount > 0;
        } else if (dayNum >= 10 && dayNum <= 14) {
          learningPhase = "checking";
          hasContent = workbookCount > 0 || dayNum === 14;
        }

        // 완료 상태 확인
        let isCompleted = false;
        try {
          const dp = getDayProgress(selectedPackData.id, dayNum);
          isCompleted = !!dp?.isCompleted;
          if (isCompleted) completedDaysCount++;
        } catch (e) {
          // ignore
        }

        allDays.push({
          day: dayNum,
          title: displayTitle,
          type: learningPhase,
          pageRange: dayPlan.pageRange || null,
          hasContent,
          isCompleted,
          vocabCount,
          sentenceCount,
          workbookCount,
          learningMethod: dayPlan.learningMethod || "introduction",
          // 표시 여부 플래그 추가
          showVocab: vocabCount > 0,
          showSentence: sentenceCount > 0,
          showWorkbook: workbookCount > 0,
        });
      } else {
        // JSON 데이터가 완전하지 않은 경우 기본값 생성
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

  // [수정] 더 단순하고 명확한 Day 선택 로직 - 항상 호출
  const handleDaySelect = useCallback(
    (day: any) => {
      const status = getDayStatus(day.day);

      console.log(`Day ${day.day} clicked, status: ${status}`); // 디버깅용

      if (status === "locked") {
        console.log(`Day ${day.day} is locked`);
        return;
      }

      // currentDay 설정
      setCurrentDay(day.day);

      console.log(`Navigating to /study/${day.day}`); // 디버깅용

      // 네비게이션
      navigate(`/study/${day.day}`, {
        replace: false,
      });
    },
    [getDayStatus, setCurrentDay, navigate]
  );

  const handleBack = useCallback(() => navigate("/"), [navigate]);

  // ✅ 조건부 렌더링은 모든 Hook 호출 후에
  // hydration 완료 전에는 로딩 표시
  if (!hasHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-700">
            학습 데이터 로딩 중...
          </p>
        </div>
      </div>
    );
  }

  // packData가 없으면 에러 처리
  if (!selectedPackData || !packId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800">
            학습팩 정보가 없습니다
          </h2>
          <p className="mt-2 text-gray-500">학습팩을 먼저 선택해주세요.</p>
          <button
            onClick={() => navigate("/")}
            className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-lg"
          >
            홈으로 이동
          </button>
        </div>
      </div>
    );
  }

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
            className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
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
      <header className="sticky top-0 bg-slate-50/80 backdrop-blur-lg z-10 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 h-16">
            <button
              onClick={handleBack}
              className="hidden lg:flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-lg p-2 -ml-2"
            >
              <ArrowLeft size={18} />
              학습팩 선택
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-slate-800">
                {selectedPackData.title}
              </h1>
              {selectedPackData.subtitle && (
                <p className="text-sm text-slate-500">
                  {selectedPackData.subtitle}
                </p>
              )}
            </div>
            <div className="text-right">
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
