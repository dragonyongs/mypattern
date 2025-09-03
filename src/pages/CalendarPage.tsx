// src/pages/CalendarPage.tsx

import React, { useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { useAppStore } from "../stores/appStore";
import { useStudyProgressStore } from "../stores/studyProgressStore";
import type { StudyMode } from "@/types";

const DynamicIcon = ({ name, ...props }) => {
  const IconComponent = LucideIcons[name];
  if (!IconComponent) {
    return null;
  }
  return <IconComponent {...props} />;
};

export default function CalendarPage() {
  const navigate = useNavigate();
  const { selectedPackData, currentDay, setCurrentDay } = useAppStore();
  const { getStudyProgress } = useStudyProgressStore();

  // ✅ 콘솔에 전체 상태 로깅
  useEffect(() => {
    console.log("=== CalendarPage Debug Info ===");
    console.log("selectedPackData:", selectedPackData);
    console.log("selectedPackData type:", typeof selectedPackData);
    if (selectedPackData) {
      console.log("selectedPackData.days:", selectedPackData.days);
      console.log(
        "selectedPackData.days length:",
        selectedPackData.days?.length
      );
      if (selectedPackData.days) {
        selectedPackData.days.forEach((day, index) => {
          console.log(`Day ${day.day} content:`, day.content);
        });
      }
    }
    console.log("=== End Debug Info ===");
  }, [selectedPackData]);

  // ✅ 단순화된 캘린더 데이터 변환
  const calendarData = useMemo(() => {
    if (!selectedPackData) {
      console.log("[CalendarPage] selectedPackData is null/undefined");
      return null;
    }

    const { days = [], totalDays = 14 } = selectedPackData;

    if (!Array.isArray(days)) {
      console.error("[CalendarPage] days is not an array:", days);
      return null;
    }

    console.log(
      `[CalendarPage] Processing ${days.length} days out of ${totalDays} total days`
    );

    // 전체 14일 생성
    const allDays = [];

    for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
      const jsonDay = days.find((d) => d.day === dayNum);

      if (jsonDay && jsonDay.content) {
        const content = jsonDay.content;

        // ✅ 간단하고 확실한 콘텐츠 감지 로직
        const hasContent =
          // Day 1: introduction
          content.introduction === true ||
          // Day 2,3: 어떤 종류든 콘텐츠가 있음
          (content.vocabulary && content.vocabulary.length > 0) ||
          (content.sentences && content.sentences.length > 0) ||
          (content.workbook && content.workbook.length > 0) ||
          (content.targetWords && content.targetWords.length > 0) ||
          (content.learningGuide &&
            Object.keys(content.learningGuide).length > 0);

        // ✅ getStudyProgress 호출 방식 단순화 (다양한 형태 시도)
        let isCompleted = false;
        try {
          // 여러 가지 key 형태로 시도
          isCompleted =
            getStudyProgress(`day-${dayNum}`) ||
            getStudyProgress(`${selectedPackData.id}-day-${dayNum}`) ||
            getStudyProgress(dayNum.toString()) ||
            false;
        } catch (error) {
          console.warn(
            `[CalendarPage] getStudyProgress error for day ${dayNum}:`,
            error
          );
          isCompleted = false;
        }

        console.log(
          `[CalendarPage] Day ${dayNum}: hasContent=${hasContent}, isCompleted=${isCompleted}`
        );
        console.log(
          `[CalendarPage] Day ${dayNum} content keys:`,
          Object.keys(content)
        );

        allDays.push({
          day: dayNum,
          type: jsonDay.type || "vocabulary",
          category: jsonDay.category || jsonDay.title || `Day ${dayNum}`,
          page: jsonDay.page,
          title: jsonDay.title || jsonDay.category || `Day ${dayNum}`,
          methods: jsonDay.methods || [],
          content: content,
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
          content: {},
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
  }, [selectedPackData, getStudyProgress]);

  // ✅ 상태 결정 로직
  const getCardStatus = (day) => {
    if (day.isCompleted) return "completed";
    if (day.hasContent) return "available";
    return "locked";
  };

  // ✅ 로딩 상태
  if (!selectedPackData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Book className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            학습팩이 선택되지 않았습니다.
          </h2>
          <p className="text-gray-600 mb-4">먼저 학습팩을 선택해주세요.</p>
          <button
            onClick={() => navigate("/packs")}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            학습팩 선택하기
          </button>
        </div>
      </div>
    );
  }

  if (!calendarData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">데이터를 처리하는 중...</p>
          <div className="mt-4 text-sm text-gray-500 space-y-1">
            <p>selectedPackData: {selectedPackData ? "있음" : "없음"}</p>
            <p>days 배열: {selectedPackData?.days?.length || 0}개</p>
            {selectedPackData?.days && (
              <p>
                days 상세:{" "}
                {selectedPackData.days.map((d) => `Day${d.day}`).join(", ")}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const handleDaySelect = (day) => {
    const status = getCardStatus(day);
    if (status !== "locked") {
      setCurrentDay(day.day);
      navigate("/study");
    }
  };

  const getCategoryIcon = (day) => {
    if (day.type === "introduction") return <Lightbulb className="w-4 h-4" />;
    return <Book className="w-4 h-4" />;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate("/packs")}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <LucideIcons.ArrowLeft className="w-5 h-5" />
              돌아가기
            </button>
            <Calendar className="w-6 h-6 text-indigo-600" />
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {selectedPackData.title}
            </h1>
            {selectedPackData.subtitle && (
              <p className="text-gray-600">{selectedPackData.subtitle}</p>
            )}
          </div>
        </div>
      </div>

      {/* ✅ 강화된 디버깅 정보 */}
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-blue-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-blue-800">
                실시간 디버깅 정보
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p>
                      <strong>총 일수:</strong> {calendarData.allDays.length}
                    </p>
                    <p>
                      <strong>사용 가능한 일수:</strong>{" "}
                      {calendarData.availableDays}
                    </p>
                    <p>
                      <strong>완료된 일수:</strong>{" "}
                      {calendarData.allDays.filter((d) => d.isCompleted).length}
                    </p>
                  </div>
                  <div>
                    <p>
                      <strong>JSON days 길이:</strong>{" "}
                      {selectedPackData.days?.length || 0}
                    </p>
                    <p>
                      <strong>선택된 팩:</strong> {selectedPackData.id}
                    </p>
                    <p>
                      <strong>현재 날짜:</strong> {currentDay}
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <p className="font-medium">사용 가능한 날들:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {calendarData.allDays
                      .filter((d) => d.hasContent)
                      .map((day) => (
                        <span
                          key={day.day}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                        >
                          Day {day.day}: {day.category}
                          {day.type === "introduction" && " (가이드)"}
                        </span>
                      ))}
                  </div>
                  {calendarData.availableDays === 0 && (
                    <p className="text-red-600 font-medium mt-2">
                      ⚠️ 콘텐츠 감지 실패 - 개발자 콘솔을 확인하세요
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 진도 현황 요약 */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl text-white p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">학습 진도</h3>
              <p className="text-indigo-100">
                현재 {calendarData.availableDays}일분 학습 콘텐츠가 준비되어
                있습니다
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                {calendarData.allDays.filter((d) => d.isCompleted).length}/
                {calendarData.availableDays || 1}
              </div>
              <div className="text-sm text-indigo-100">완료</div>
            </div>
          </div>

          <div className="w-full bg-indigo-400 rounded-full h-2">
            <div
              className="bg-white h-2 rounded-full transition-all"
              style={{
                width: `${
                  calendarData.availableDays > 0
                    ? (calendarData.allDays.filter((d) => d.isCompleted)
                        .length /
                        calendarData.availableDays) *
                      100
                    : 0
                }%`,
              }}
            />
          </div>
        </div>

        {/* 캘린더 그리드 */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            학습 달력
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
            {calendarData.allDays.map((day) => {
              const status = getCardStatus(day);
              const isCurrentDay = currentDay === day.day;

              return (
                <div
                  key={day.day}
                  onClick={() => handleDaySelect(day)}
                  className={`
                    p-4 rounded-lg cursor-pointer transition-all border-2 relative
                    ${
                      status === "completed"
                        ? "bg-green-100 border-green-300"
                        : status === "available"
                        ? "bg-white border-indigo-200 hover:border-indigo-400 hover:shadow-md"
                        : "bg-gray-100 border-gray-200 cursor-not-allowed opacity-50"
                    }
                    ${isCurrentDay ? "ring-2 ring-indigo-500" : ""}
                  `}
                >
                  {/* ✅ 디버그 점 추가 */}
                  <div
                    className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                      day.hasContent ? "bg-green-400" : "bg-red-400"
                    }`}
                  ></div>

                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-bold text-gray-700">
                      Day {day.day}
                    </span>
                    {status === "completed" ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : status === "available" ? (
                      <div className="flex items-center gap-1">
                        {getCategoryIcon(day)}
                        <Play className="w-3 h-3 text-indigo-500" />
                      </div>
                    ) : (
                      <Lock className="w-4 h-4 text-gray-400" />
                    )}
                  </div>

                  <div className="text-sm">
                    <p className="text-gray-700 font-medium mb-1 truncate">
                      {day.category}
                    </p>

                    {day.pageRange && (
                      <p className="text-xs text-gray-500">{day.pageRange}</p>
                    )}

                    {day.type === "introduction" && (
                      <p className="text-xs text-indigo-600 mt-1">
                        학습 가이드
                      </p>
                    )}

                    {!day.hasContent && (
                      <p className="text-xs text-gray-400 mt-1">준비 중</p>
                    )}

                    {/* ✅ 콘텐츠 타입 표시 */}
                    {day.hasContent && day.type !== "introduction" && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {day.content.vocabulary?.length > 0 && (
                          <span className="text-xs bg-blue-100 text-blue-600 px-1 rounded">
                            단어{day.content.vocabulary.length}
                          </span>
                        )}
                        {day.content.sentences?.length > 0 && (
                          <span className="text-xs bg-green-100 text-green-600 px-1 rounded">
                            문장{day.content.sentences.length}
                          </span>
                        )}
                        {day.content.workbook?.length > 0 && (
                          <span className="text-xs bg-purple-100 text-purple-600 px-1 rounded">
                            연습{day.content.workbook.length}
                          </span>
                        )}
                        {day.content.targetWords?.length > 0 && (
                          <span className="text-xs bg-orange-100 text-orange-600 px-1 rounded">
                            핵심{day.content.targetWords.length}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 범례 */}
          <div className="mt-6 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
              <span className="text-gray-600">완료</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-white border border-indigo-200 rounded"></div>
              <span className="text-gray-600">학습 가능</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded"></div>
              <span className="text-gray-600">준비 중</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-gray-600">콘텐츠 있음</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-400 rounded-full"></div>
              <span className="text-gray-600">콘텐츠 없음</span>
            </div>
          </div>
        </div>

        {/* 학습 방법 안내 */}
        {selectedPackData.learningMethods &&
          selectedPackData.learningMethods.length > 0 && (
            <div className="mt-6 bg-indigo-50 rounded-xl p-6">
              <h4 className="text-lg font-semibold mb-4 text-indigo-900 flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                학습 방법
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {selectedPackData.learningMethods.map((method, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 bg-white p-4 rounded-lg border border-indigo-100"
                  >
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <DynamicIcon
                        name={method.icon}
                        className="w-4 h-4 text-indigo-600"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h5 className="font-medium text-gray-900 mb-1">
                        {method.name}
                      </h5>
                      <p className="text-sm text-gray-600 mb-1">
                        {method.description}
                      </p>
                      <p className="text-xs text-indigo-600">
                        Day {method.days}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
