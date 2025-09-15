// src/components/LearningMethodIntro.tsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import type { LearningMethod } from "@/types";
import { DynamicIcon } from "@/shared/components/DynamicIcon";
import { useStudyProgressStore } from "@/stores/studyProgressStore";

const LearningMethodIntroComponent: React.FC<{
  methods: LearningMethod[];
  onComplete: () => void;
  packId: string;
}> = ({ methods, onComplete, packId }) => {
  // 1) store selectors
  const hasHydrated = useStudyProgressStore((s) => s._hasHydrated);
  const completeDay1Introduction = useStudyProgressStore(
    (s) => s.completeDay1Introduction
  );
  const isIntroductionCompleted = useStudyProgressStore((s) => {
    const dp = s.getDayProgress(packId, 1);
    return dp?.completedModes["introduction"] ?? false;
  });

  // 2) local states/refs
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedCards, setCompletedCards] = useState<Set<number>>(new Set());
  const [countdown, setCountdown] = useState<number | null>(null); // 표시용 남은 초
  const [finishing, setFinishing] = useState(false); // 마지막 4/4 완료 후 잠깐 보여주기

  // 타이머 제어용 refs
  const deadlineAtRef = useRef<number | null>(null); // 종료 시각(ms)
  const rafIdRef = useRef<number | null>(null);
  const finishTimeoutRef = useRef<number | null>(null);
  const latestIndexRef = useRef(0);
  const completedSizeRef = useRef(0);

  useEffect(() => {
    latestIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    completedSizeRef.current = completedCards.size;
  }, [completedCards.size]);

  // 3) handlers
  const clearAllTimers = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (finishTimeoutRef.current) {
      clearTimeout(finishTimeoutRef.current);
      finishTimeoutRef.current = null;
    }
    deadlineAtRef.current = null;
  }, []);

  const clearTick = useCallback(() => {
    clearAllTimers();
    setCountdown(null);
  }, [clearAllTimers]);

  const handleCardView = useCallback(() => {
    setCompletedCards((prev) => {
      if (prev.has(latestIndexRef.current)) return prev;
      const next = new Set(prev);
      next.add(latestIndexRef.current);
      return next;
    });
  }, []);

  const isAllCompleted = completedCards.size === methods.length;
  const isLastPage = currentIndex === methods.length - 1;

  const advance = useCallback(() => {
    if (isLastPage && completedSizeRef.current === methods.length) {
      setFinishing(true);
      if (!isIntroductionCompleted) completeDay1Introduction(packId);
      finishTimeoutRef.current = window.setTimeout(() => {
        onComplete();
      }, 1200) as unknown as number;
    } else if (latestIndexRef.current < methods.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  }, [
    isLastPage,
    methods.length,
    isIntroductionCompleted,
    completeDay1Introduction,
    packId,
    onComplete,
  ]);

  // 4) 카드 확인 시 카운트다운 시작
  useEffect(() => {
    if (methods.length === 0) return;
    if (completedCards.has(currentIndex) && countdown === null && !finishing) {
      const seconds = 5;
      deadlineAtRef.current = Date.now() + seconds * 1000;
      setCountdown(seconds);
    }
  }, [completedCards, currentIndex, countdown, methods.length, finishing]);

  // 5) 실시간 경과 기반 카운트다운 + Visibility 대응
  useEffect(() => {
    if (countdown === null || !deadlineAtRef.current) return;

    const tick = () => {
      const now = Date.now();
      const remainMs = Math.max(0, (deadlineAtRef.current ?? now) - now);
      const nextSec = Math.ceil(remainMs / 1000);
      setCountdown((prev) => (prev !== nextSec ? nextSec : prev));

      if (remainMs <= 0) {
        deadlineAtRef.current = null;
        setCountdown(null);
        advance();
        return;
      }
      if (document.visibilityState === "visible") {
        rafIdRef.current = requestAnimationFrame(tick);
      }
    };

    // 최초 1회 즉시 계산
    tick();

    const onVis = () => tick();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, [countdown, advance]);

  const handleNext = useCallback(() => {
    clearTick();
    if (!isLastPage) {
      setCurrentIndex((i) => i + 1);
      return;
    }
    if (isAllCompleted && !finishing) {
      setFinishing(true);
      if (!isIntroductionCompleted) completeDay1Introduction(packId);
      finishTimeoutRef.current = window.setTimeout(
        () => onComplete(),
        1200
      ) as unknown as number;
    }
  }, [
    clearTick,
    isLastPage,
    isAllCompleted,
    finishing,
    isIntroductionCompleted,
    completeDay1Introduction,
    packId,
    onComplete,
  ]);

  const handlePrev = useCallback(() => {
    clearTick();
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  }, [clearTick, currentIndex]);

  // 6) guards
  useEffect(() => () => clearAllTimers(), [clearAllTimers]);
  if (!hasHydrated) return null;

  // 7) render
  if (!packId || packId === "undefined") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800">
            학습팩 정보 오류
          </h2>
          <p className="text-gray-500 mt-2">올바르지 않은 학습팩 ID입니다.</p>
          <button
            onClick={onComplete}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (!methods || methods.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-700">
            학습 방법 데이터를 불러오는 중...
          </p>
        </div>
      </div>
    );
  }

  const currentMethod = methods[currentIndex];
  const progressPercentage =
    methods.length > 0 ? (completedCards.size / methods.length) * 100 : 0;
  const isLastPageAndCompleted = isLastPage && isAllCompleted;

  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-129px)] bg-gradient-to-br from-indigo-50 to-purple-100 p-4">
      {/* 진행률 */}
      <div className="w-full max-w-md mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-600">
            {currentIndex + 1} / {methods.length}
          </span>
          <span className="text-sm font-medium text-indigo-600">
            {Math.round(progressPercentage)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* 메인 카드 */}
      <div
        onClick={handleCardView}
        className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full cursor-pointer transform transition-transform hover:scale-105 mb-8"
      >
        <div className="text-center">
          <div className="mb-4">
            <DynamicIcon
              name={currentMethod.icon}
              className="w-16 h-16 mx-auto text-indigo-600"
            />
          </div>
          <div className="mb-2">
            <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold">
              {currentMethod.phase}단계
            </span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            {currentMethod.name}
          </h2>
          <p className="text-gray-600 leading-relaxed mb-6">
            {currentMethod.description}
          </p>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-500 mb-1">적용 일수</p>
            <p className="font-semibold text-gray-800">Day 1-14</p>
          </div>
        </div>

        {finishing ? (
          <div className="mt-6 flex flex-col items-center justify-center text-indigo-700">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              <span className="font-medium">
                학습 소개 완료 — 캘린더로 이동합니다
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              버튼으로 즉시 이동 가능
            </div>
          </div>
        ) : completedCards.has(currentIndex) ? (
          <div className="mt-6 flex flex-col items-center justify-center text-green-600">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              <span className="font-medium">
                확인 완료 — {countdown ?? 0}초 후 자동으로{" "}
                {isLastPage ? "완료 화면" : "다음"}으로 이동합니다
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              터치/버튼으로 즉시 이동 가능
            </div>
          </div>
        ) : (
          <div className="mt-6 text-center text-gray-400 text-sm">
            카드를 터치하여 확인하세요
          </div>
        )}
      </div>

      {/* 네비게이션 */}
      <div className="flex items-center gap-4">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="w-4 h-4" /> 이전
        </button>

        <button
          onClick={handleNext}
          className="flex items-center gap-2 px-6 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLastPageAndCompleted ? "완료" : "다음"}
          {!isLastPageAndCompleted && <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

export const LearningMethodIntro = React.memo(LearningMethodIntroComponent);
LearningMethodIntro.displayName = "LearningMethodIntro";
