// src/pages/CalendarPage.tsx

import React, { useMemo, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import * as LucideIcons from "lucide-react";
import {
  Calendar,
  Lock,
  CheckCircle,
  Play,
  Book,
  MessageSquare,
  PenTool,
  Lightbulb,
  ArrowLeft,
} from "lucide-react";
import { useAppStore } from "../stores/appStore";
import { useStudyProgressStore } from "../stores/studyProgressStore";
import type { StudyMode } from "@/types";

export default function CalendarPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedPackData, currentDay, setCurrentDay } = useAppStore();
  const { getDayProgress } = useStudyProgressStore();

  // 학습 모드 결정 로직
  const determineStudyMode = useCallback(
    (day): StudyMode => {
      // Day 1은 introduction 특별 처리
      if (day.day === 1 && day.type === "introduction") {
        // introduction 타입이 있다면 그것을 반환, 아니면 vocab
        return "vocab"; // StudyMode 타입에 따라 조정
      }

      // 진행 상태 확인
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

      // 완료되지 않은 모드 우선 선택
      if (!dayProgress?.vocabDone && day.vocabularies?.length > 0) {
        return "vocab";
      }
      if (!dayProgress?.sentenceDone && day.sentences?.length > 0) {
        return "sentence";
      }
      if (!dayProgress?.workbookDone && day.workbook?.length > 0) {
        return "workbook";
      }

      // 모든 모드가 완료되었거나 진행 상태를 알 수 없는 경우
      // 가용 콘텐츠 우선순위로 선택
      if (day.vocabularies?.length > 0) return "vocab";
      if (day.sentences?.length > 0) return "sentence";
      if (day.workbook?.length > 0) return "workbook";

      // 기본값
      return "vocab";
    },
    [selectedPackData?.id, getDayProgress]
  );

  // 캘린더 데이터 생성 및 처리
  const calendarData = useMemo(() => {
    if (!selectedPackData) {
      console.log("[CalendarPage] selectedPackData is null/undefined");
      return null;
    }

    if (!selectedPackData?.days) {
      console.log("[CalendarPage] selectedPackData.days is missing");
      return { availableDays: 0, allDays: [] };
    }

    const { days = [], totalDays = 14 } = selectedPackData;

    if (!Array.isArray(days)) {
      console.error("[CalendarPage] days is not an array:", days);
      return { availableDays: 0, allDays: [] };
    }

    console.log(
      `[CalendarPage] Processing ${days.length} days out of ${totalDays} total days`
    );

    // 전체 14일 생성
    const allDays = [];

    for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
      const jsonDay = days.find((d) => d.day === dayNum);

      if (jsonDay) {
        // ✅ Day 1 introduction은 항상 hasContent=true
        const hasContent =
          // Day 1: introduction은 항상 접근 가능
          (dayNum === 1 && jsonDay.type === "introduction") ||
          // introduction 플래그 체크
          jsonDay.introduction === true ||
          // 학습 가이드가 있는 경우
          (jsonDay.learningGuide &&
            Object.keys(jsonDay.learningGuide).length > 0) ||
          // 실제 학습 콘텐츠 체크
          (jsonDay.vocabularies && jsonDay.vocabularies.length > 0) ||
          (jsonDay.sentences && jsonDay.sentences.length > 0) ||
          (jsonDay.workbook && jsonDay.workbook.length > 0) ||
          (jsonDay.targetWords && jsonDay.targetWords.length > 0);

        // 완료 상태 확인
        let isCompleted = false;
        try {
          const dayProgress = getDayProgress(selectedPackData.id, dayNum);
          isCompleted = dayProgress?.dayCompleted || false;
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
        // JSON에 데이터가 없는 날
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
      availableDays: allDays.filter((d) => d.hasContent).length,
    };

    console.log(
      `[CalendarPage] Final result: ${result.availableDays} available days out of ${result.allDays.length}`
    );
    console.log(
      "[CalendarPage] Available days:",
      allDays.filter((d) => d.hasContent).map((d) => `Day ${d.day}`)
    );

    return result;
  }, [selectedPackData, getDayProgress]);

  // 카드 상태 결정
  const getCardStatus = useCallback((day) => {
    if (day.isCompleted) return "completed";
    if (day.hasContent) return "available";
    return "locked";
  }, []);

  // 날짜 선택 핸들러
  const handleDaySelect = useCallback(
    (day) => {
      const status = getCardStatus(day);
      console.log("[CalendarPage] Day selected:", day.day, "status:", status);

      if (status === "locked") {
        console.log("[CalendarPage] Day is locked, cannot proceed");
        return;
      }

      // 학습 모드 결정
      const studyMode = determineStudyMode(day);
      console.log("[CalendarPage] Determined study mode:", studyMode);

      // 상태 업데이트
      setCurrentDay(day.day);

      // ✅ 수정: URL 파라미터로 이동
      navigate(`/study/${day.day}`, {
        state: {
          mode: studyMode,
          from: "calendar",
        },
      });
    },
    [getCardStatus, determineStudyMode, setCurrentDay, navigate]
  );

  // 뒤로 가기 핸들러
  const handleBack = useCallback(() => {
    navigate("/pack-select");
  }, [navigate]);

  // 로딩 상태
  if (!selectedPackData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Book className="w-16 h-16 mx-auto mb-4 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            학습팩을 선택해주세요
          </h1>
          <p className="text-gray-600 mb-6">먼저 학습팩을 선택해주세요.</p>
          <button
            onClick={handleBack}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            학습팩 선택하기
          </button>
        </div>
      </div>
    );
  }

  // 데이터 처리 중
  if (!calendarData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            데이터를 처리하는 중...
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* 헤더 */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>돌아가기</span>
            </button>
            <Calendar className="w-6 h-6 text-blue-600" />
          </div>
          <div className="text-center mt-4">
            <h1 className="text-2xl font-bold text-gray-800">
              {selectedPackData.title}
            </h1>
            <p className="text-gray-600 mt-1">{selectedPackData.subtitle}</p>
          </div>
        </div>
      </div>

      {/* 진행률 정보 */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {calendarData.allDays.length}
              </div>
              <div className="text-sm text-gray-600">총 일수</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {calendarData.availableDays}
              </div>
              <div className="text-sm text-gray-600">사용 가능한 일수</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {calendarData.allDays.filter((d) => d.isCompleted).length}
              </div>
              <div className="text-sm text-gray-600">완료된 일수</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-indigo-600">
                {currentDay}
              </div>
              <div className="text-sm text-gray-600">현재 날짜</div>
            </div>
          </div>
        </div>

        {/* 학습 진도 */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold mb-2">학습 진도</h2>
              <p className="text-indigo-100">
                현재 {calendarData.availableDays}일분 학습 콘텐츠가 준비되어
                있습니다
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">
                {calendarData.availableDays}/14
              </div>
              <div className="text-indigo-200">완료</div>
            </div>
          </div>

          {/* 진행률 바 */}
          <div className="mt-4">
            <div className="w-full bg-white/20 rounded-full h-3">
              <div
                className="bg-white h-3 rounded-full transition-all duration-300"
                style={{ width: `${(calendarData.availableDays / 14) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* 캘린더 그리드 */}
        <div className="bg-white rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            학습 달력
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4">
            {calendarData.allDays.map((day) => {
              const status = getCardStatus(day);
              return (
                <div
                  key={day.day}
                  onClick={() => handleDaySelect(day)}
                  className={`
                    p-4 rounded-lg cursor-pointer transition-all transform hover:scale-105
                    ${
                      status === "completed"
                        ? "bg-green-100 border-2 border-green-300 shadow-lg"
                        : status === "available"
                        ? "bg-white border-2 border-blue-200 hover:border-blue-400 shadow-md hover:shadow-lg"
                        : "bg-gray-100 border-2 border-gray-200 cursor-not-allowed opacity-50"
                    }
                    ${currentDay === day.day ? "ring-2 ring-blue-500" : ""}
                  `}
                >
                  {/* 날짜 헤더 */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-bold text-gray-700">
                      Day {day.day}
                    </span>
                    {status === "completed" && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    {status === "locked" && (
                      <Lock className="w-4 h-4 text-gray-400" />
                    )}
                    {status === "available" && (
                      <Play className="w-4 h-4 text-blue-500" />
                    )}
                  </div>

                  {/* 카테고리 */}
                  <div className="mb-2">
                    <p className="text-sm font-medium text-gray-800">
                      {day.category}
                    </p>
                    {day.pageRange && (
                      <p className="text-xs text-gray-500">{day.pageRange}</p>
                    )}
                  </div>

                  {/* 콘텐츠 타입 표시 */}
                  {day.type === "introduction" && (
                    <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      <Lightbulb className="w-3 h-3" />
                      <span>학습 가이드</span>
                    </div>
                  )}

                  {!day.hasContent && (
                    <div className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded">
                      준비 중
                    </div>
                  )}

                  {/* 학습 방법들 */}
                  {day.hasContent && day.type !== "introduction" && (
                    <div className="space-y-1">
                      {day.vocabularies?.length > 0 && (
                        <div className="text-xs text-blue-600 font-medium">
                          단어 {day.vocabularies.length}개
                        </div>
                      )}
                      {day.sentences?.length > 0 && (
                        <div className="text-xs text-green-600 font-medium">
                          문장 {day.sentences.length}개
                        </div>
                      )}
                      {day.workbook?.length > 0 && (
                        <div className="text-xs text-purple-600 font-medium">
                          문제 {day.workbook.length}개
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 범례 */}
          <div className="flex flex-wrap gap-4 mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-4 h-4 bg-white border-2 border-blue-200 rounded"></div>
              <span className="text-gray-600">학습 가능</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded"></div>
              <span className="text-gray-600">완료됨</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-4 h-4 bg-gray-100 border-2 border-gray-200 rounded"></div>
              <span className="text-gray-600">준비 중</span>
            </div>
          </div>
        </div>

        {/* 도움말 */}
        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            💡 <strong>학습 팁:</strong> 각 날짜를 클릭하여 학습을 시작하세요.
            완료된 학습은 다시 복습할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
