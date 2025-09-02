// src/shared/hooks/useStudyPlan.ts
import { useState, useEffect } from "react";
import { differenceInDays, addDays, isAfter, startOfDay } from "date-fns";

export function useStudyPlan() {
  const [studyStartDate, setStudyStartDateState] = useState<Date | null>(() => {
    const saved = localStorage.getItem("real-voca-study-start-date");
    return saved ? new Date(saved) : null;
  });

  const [studyEndDate, setStudyEndDate] = useState<Date | null>(() => {
    if (!studyStartDate) return null;
    return addDays(studyStartDate, 13); // 14일 과정
  });

  const setStudyStartDate = (date: Date) => {
    const startDate = startOfDay(date);
    setStudyStartDateState(startDate);
    setStudyEndDate(addDays(startDate, 13));
    localStorage.setItem("real-voca-study-start-date", startDate.toISOString());
  };

  const resetStudyPlan = () => {
    setStudyStartDateState(null);
    setStudyEndDate(null);
    localStorage.removeItem("real-voca-study-start-date");
  };

  // 현재 학습 가능한 최대 날짜 계산
  const getMaxAvailableDay = () => {
    if (!studyStartDate) return 0;

    const today = startOfDay(new Date());
    const daysSinceStart = differenceInDays(today, studyStartDate);

    // 시작일부터 하루에 하나씩 해제, 최대 14일
    return Math.min(Math.max(daysSinceStart + 1, 1), 14);
  };

  // 특정 날짜가 학습 가능한지 확인
  const isDayAvailable = (day: number) => {
    if (!studyStartDate) return false;
    return day <= getMaxAvailableDay();
  };

  // 학습 완료 예정일
  const getExpectedCompletionDate = () => {
    return studyEndDate;
  };

  // 학습 진행률
  const getStudyProgress = () => {
    if (!studyStartDate) return 0;
    const maxDay = getMaxAvailableDay();
    return (maxDay / 14) * 100;
  };

  return {
    studyStartDate,
    studyEndDate,
    setStudyStartDate,
    resetStudyPlan,
    getMaxAvailableDay,
    isDayAvailable,
    getExpectedCompletionDate,
    getStudyProgress,
    isStudyStarted: !!studyStartDate,
  };
}
