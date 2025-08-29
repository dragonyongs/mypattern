// src/features/build/BuildPage.tsx (수정)
import React, { useState, useCallback, useEffect } from "react";
import { IntentInput } from "@/features/build/components/IntentInput";
import { PatternSelector } from "@/features/build/components/PatternSelector";
import { SentenceBuilder } from "@/features/build/components/SentenceBuilder";
import { useLexiconStore } from "@/stores/lexiconStore";
import { useLearningStore } from "@/stores/learningStore";
import { smartPatternService } from "@/shared/services/smartPatternService";
import type { UserIntent, ConversationPattern } from "./types";

export const BuildPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<"input" | "pattern" | "build">(
    "input"
  );
  const [userIntent, setUserIntent] = useState<UserIntent | null>(null);
  const [matchedPatterns, setMatchedPatterns] = useState<ConversationPattern[]>(
    []
  );
  const [selectedPattern, setSelectedPattern] =
    useState<ConversationPattern | null>(null);
  const [loading, setLoading] = useState(false);

  const lexiconStore = useLexiconStore();
  const learningStore = useLearningStore();
  const { words } = lexiconStore;

  // ✅ 스마트 패턴 서비스 초기화
  useEffect(() => {
    smartPatternService.initialize(lexiconStore, learningStore);
  }, [lexiconStore, learningStore]);

  const handleIntentSubmit = useCallback(
    async (intent: UserIntent) => {
      setLoading(true);
      try {
        console.log("🔍 통합 패턴 매칭 시작:", intent.korean);

        // ✅ 통합 스마트 패턴 서비스 사용
        const result = await smartPatternService.matchPatterns({
          intent,
          userInput: intent.korean,
          level: learningStore.userProgress?.level || "beginner",
          limit: 3,
        });

        console.log("📋 매칭 결과:", result);
        console.log("✅ 신뢰도:", result.confidence);

        setUserIntent(intent);
        setMatchedPatterns(result.conversationPatterns);
        setCurrentStep("pattern");
      } catch (error) {
        console.error("❌ 패턴 매칭 실패:", error);
        alert("패턴 분석 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    },
    [learningStore]
  );

  const handlePatternSelect = useCallback((pattern: ConversationPattern) => {
    setSelectedPattern(pattern);
    setCurrentStep("build");
  }, []);

  const handleComplete = useCallback((success: boolean) => {
    console.log("문장 완성:", success ? "성공" : "실패");
  }, []);

  const handleRetry = useCallback(() => {
    setCurrentStep("pattern");
    setSelectedPattern(null);
  }, []);

  const handleNewIntent = useCallback(() => {
    setCurrentStep("input");
    setUserIntent(null);
    setMatchedPatterns([]);
    setSelectedPattern(null);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">🧠 패턴을 분석하는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">🎯 문장 만들기</h1>
          <p className="text-gray-600">
            당신의 의도를 분석해서 최적의 영어 패턴을 제안합니다
          </p>
          <div className="text-sm text-gray-500 mt-2">
            💾 {words.length}개 단어 • 🧠 패턴 매칭 활성화
          </div>
        </div>

        {/* 진행 단계 표시 */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-8">
            {[
              { key: "input", label: "하고 싶은 말 입력" },
              { key: "pattern", label: "AI 패턴 추천" },
              { key: "build", label: "문장 구성하기" },
            ].map(({ key, label }, index) => (
              <div key={key} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep === key
                      ? "bg-blue-600 text-white"
                      : index <
                        ["input", "pattern", "build"].indexOf(currentStep)
                      ? "bg-green-500 text-white"
                      : "bg-gray-300 text-gray-600"
                  }`}
                >
                  {index + 1}
                </div>
                <span className="ml-2 text-sm font-medium text-gray-700">
                  {label}
                </span>
                {index < 2 && (
                  <div
                    className={`ml-4 w-12 h-0.5 ${
                      index < ["input", "pattern", "build"].indexOf(currentStep)
                        ? "bg-green-500"
                        : "bg-gray-300"
                    }`}
                  ></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 단계별 컴포넌트 */}
        <div className="space-y-6">
          {currentStep === "input" && (
            <IntentInput
              onIntentSubmit={handleIntentSubmit}
              isLoading={loading}
            />
          )}

          {currentStep === "pattern" && (
            <>
              <div className="bg-white rounded-xl p-4 border">
                <div className="text-sm text-gray-600 mb-2">
                  🎯 분석된 내용:
                </div>
                <div className="font-medium">{userIntent?.korean}</div>
                <button
                  onClick={handleNewIntent}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  다시 입력하기
                </button>
              </div>

              {matchedPatterns.length > 0 ? (
                <div>
                  <div className="mb-4 text-sm text-green-600">
                    ✨ {matchedPatterns.length}개의 최적 패턴을 찾았습니다!
                  </div>
                  <PatternSelector
                    patterns={matchedPatterns}
                    onPatternSelect={handlePatternSelect}
                  />
                </div>
              ) : (
                <div className="bg-white rounded-xl p-8 text-center border">
                  <div className="text-gray-500 mb-4">
                    🤔 매칭되는 패턴이 없네요
                  </div>
                  <div className="text-sm text-gray-600 mb-4">
                    다른 표현으로 다시 시도해보세요
                  </div>
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
      </div>
    </div>
  );
};
