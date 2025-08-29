// src/features/build/BuildPage.tsx (수정된 버전)

import React, { useState, useCallback } from "react";
import { IntentInput } from "@/features/build/components/IntentInput";
import { PatternSelector } from "@/features/build/components/PatternSelector";
import { SentenceBuilder } from "@/features/build/components/SentenceBuilder";
import { useLexiconStore } from "@/stores/lexiconStore";
import { useLearningStore } from "@/stores/learningStore";

// ✅ 새로운 임포트들
import { simplePatternMatcher } from "@/features/build/services/simplePatternMatcher";
import { patternFeedbackService } from "@/features/build/services/patternFeedbackService";

import type { UserIntent, ConversationPattern } from "./types";

export const BuildPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<"input" | "pattern" | "build">(
    "input"
  );
  const [userIntent, setUserIntent] = useState<UserIntent | null>(null);

  // ❌ 기존 상태값 제거
  // const [matchedPatterns, setMatchedPatterns] = useState<ConversationPattern[]>([]);

  const [selectedPattern, setSelectedPattern] =
    useState<ConversationPattern | null>(null);
  const [loading, setLoading] = useState(false);

  const lexiconStore = useLexiconStore();
  const learningStore = useLearningStore();
  const { words } = lexiconStore;

  // ✅ 직접 패턴 매칭 (상태값 없이)
  const getMatchedPatterns = (intent: UserIntent): ConversationPattern[] => {
    if (!intent) return [];
    return simplePatternMatcher.matchPatterns(intent);
  };

  const handleIntentSubmit = useCallback(async (intent: UserIntent) => {
    setLoading(true);
    try {
      console.log("🔍 개선된 패턴 매칭 시작:", intent.korean);

      // ✅ simplePatternMatcher 직접 사용
      const matchedPatterns = simplePatternMatcher.matchPatterns(intent);

      console.log("📋 매칭 결과:");
      matchedPatterns.forEach((pattern, index) => {
        console.log(
          `${index + 1}. ${pattern.scenario}: ${pattern.userSide.korean}`
        );
        console.log(`   - 매칭 점수: ${(pattern as any).matchScore || "N/A"}`);
        console.log(`   - 매칭 이유: ${(pattern as any).matchReason || "N/A"}`);
      });

      setUserIntent(intent);
      setCurrentStep("pattern");
    } catch (error) {
      console.error("❌ 패턴 매칭 실패:", error);
      alert("패턴 분석 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handlePatternSelect = useCallback(
    (pattern: ConversationPattern) => {
      if (!userIntent) return;

      // ✅ 피드백 기록 (새로 추가)
      const allPatternIds = getMatchedPatterns(userIntent).map((p) => p.id);
      patternFeedbackService.recordSelection(
        userIntent.korean,
        pattern.id,
        allPatternIds
      );

      console.log("📝 패턴 선택 피드백 기록:", {
        userInput: userIntent.korean,
        selectedPattern: pattern.id,
        totalOptions: allPatternIds.length,
      });

      setSelectedPattern(pattern);
      setCurrentStep("build");
    },
    [userIntent]
  );

  const handleComplete = useCallback(
    (success: boolean) => {
      console.log("문장 완성:", success ? "성공" : "실패");

      // ✅ 완성 결과도 피드백에 기록할 수 있음
      if (selectedPattern && userIntent) {
        console.log("📊 학습 완성 기록:", {
          pattern: selectedPattern.id,
          success,
          userInput: userIntent.korean,
        });
      }
    },
    [selectedPattern, userIntent]
  );

  const handleRetry = useCallback(() => {
    setCurrentStep("pattern");
    setSelectedPattern(null);
  }, []);

  const handleNewIntent = useCallback(() => {
    setCurrentStep("input");
    setUserIntent(null);
    setSelectedPattern(null);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">🧠 패턴을 분석하는 중...</p>
        </div>
      </div>
    );
  }

  // ✅ 매칭된 패턴들을 실시간으로 가져오기
  const currentMatchedPatterns = userIntent
    ? getMatchedPatterns(userIntent)
    : [];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          🎯 문장 만들기
        </h1>
        <p className="text-gray-600 mb-4">
          당신의 의도를 분석해서 최적의 영어 패턴을 제안합니다
        </p>
        <div className="text-sm text-gray-500">
          💾 {words.length}개 단어 • 🧠 스마트 패턴 매칭 활성화
        </div>
      </div>

      {/* 진행 단계 표시 */}
      <div className="flex items-center justify-center space-x-4 mb-8">
        {[
          { key: "input", label: "하고 싶은 말 입력" },
          { key: "pattern", label: "AI 패턴 추천" },
          { key: "build", label: "문장 구성하기" },
        ].map(({ key, label }, index) => (
          <React.Fragment key={key}>
            <div
              className={`flex items-center space-x-2 ${
                currentStep === key
                  ? "text-blue-600"
                  : (currentStep === "pattern" && key === "input") ||
                    (currentStep === "build" && key !== "build")
                  ? "text-green-600"
                  : "text-gray-400"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep === key
                    ? "bg-blue-600 text-white"
                    : (currentStep === "pattern" && key === "input") ||
                      (currentStep === "build" && key !== "build")
                    ? "bg-green-600 text-white"
                    : "bg-gray-200"
                }`}
              >
                {index + 1}
              </div>
              <span className="text-sm font-medium">{label}</span>
            </div>
            {index < 2 && (
              <div
                className={`w-12 h-0.5 ${
                  (currentStep === "pattern" && index === 0) ||
                  (currentStep === "build" && index <= 1)
                    ? "bg-green-400"
                    : "bg-gray-200"
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* 단계별 컴포넌트 */}
      {currentStep === "input" && (
        <IntentInput onIntentSubmit={handleIntentSubmit} isLoading={loading} />
      )}

      {currentStep === "pattern" && (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-blue-900 mb-2">🎯 분석된 내용:</h3>
            <p className="text-blue-800 font-medium">"{userIntent?.korean}"</p>
            <button
              onClick={handleNewIntent}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
            >
              다시 입력하기
            </button>
          </div>

          {currentMatchedPatterns.length > 0 ? (
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-green-700">
                  ✨ {currentMatchedPatterns.length}개의 최적 패턴을 찾았습니다!
                </h2>
              </div>

              {/* ✅ 개선된 PatternSelector 사용 */}
              <PatternSelector
                patterns={currentMatchedPatterns}
                userInput={userIntent?.korean || ""} // 새로 추가된 prop
                onPatternSelect={handlePatternSelect}
              />
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🤔</div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">
                매칭되는 패턴이 없네요
              </h3>
              <p className="text-gray-500 mb-4">
                다른 표현으로 다시 시도해보세요
              </p>
              <button
                onClick={handleNewIntent}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                다시 시도
              </button>
            </div>
          )}
        </>
      )}

      {currentStep === "build" && selectedPattern && (
        <SentenceBuilder
          pattern={selectedPattern}
          onComplete={handleComplete}
          onRetry={handleRetry}
        />
      )}
    </div>
  );
};
