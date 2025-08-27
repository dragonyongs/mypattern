// src/features/learn/components/TranslationPractice.tsx
import React, { useState, useEffect } from "react";
import { Check, X, RefreshCw, Plus } from "lucide-react";
import { translationEngine } from "../services/translationEngine";
import { grammarChecker } from "../services/grammarChecker";
import { useLearningStore } from "@/stores/learningStore";

interface TranslationPracticeProps {
  patternId?: string; // 기존 패턴에서 진입 시
  initialKorean?: string; // 한국어 힌트
  initialEnglishHint?: string; // 영어 힌트(패턴 원문 등)
  onComplete?: (result: { accuracy: number }) => void;
}

export const TranslationPractice: React.FC<TranslationPracticeProps> = ({
  patternId,
  initialKorean = "",
  initialEnglishHint = "",
  onComplete,
}) => {
  const { saveSessionResult, completePattern, addUserPattern } =
    useLearningStore();
  const [koreanInput, setKoreanInput] = useState(initialKorean);
  const [englishInput, setEnglishInput] = useState("");
  const [suggestions, setSuggestions] = useState(
    translationEngine.translateKoreanToEnglish(initialKorean)
  );
  const [grammarResult, setGrammarResult] = useState(() =>
    englishInput ? grammarChecker.checkGrammar(englishInput) : null
  );
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [koWarn, setKoWarn] = useState<string | null>(null);

  // 한국어 간단 정규화/경고
  useEffect(() => {
    if (!koreanInput.trim()) {
      setKoWarn("한국어로 말하고 싶은 내용을 입력하세요.");
      return;
    }
    const hasHangul = /[가-힣]/.test(koreanInput);
    setKoWarn(hasHangul ? null : "한국어 문장을 입력해주세요.");
    const s = translationEngine.translateKoreanToEnglish(koreanInput);
    setSuggestions(s);
  }, [koreanInput]);

  // 영어 실시간 문법 검사: 한 글자부터 즉시 평가하되, 기본 구조를 만족해야만 isValid
  useEffect(() => {
    if (!englishInput.trim()) {
      setGrammarResult(null);
      return;
    }
    const r = grammarChecker.checkGrammar(englishInput);
    setGrammarResult(r);
  }, [englishInput]);

  const handleSuggestionClick = (text: string) => {
    setEnglishInput(text);
    setShowSuggestions(false);
  };

  const handleSubmit = () => {
    if (!koreanInput.trim() || !englishInput.trim() || !grammarResult) return;
    if (!grammarResult.isValid) return; // 미완성/오류는 차단

    // 정확도=confidence 기준 저장
    saveSessionResult(
      {
        id: `session_${Date.now()}`,
        patternId: patternId ?? `custom_${Date.now()}`,
        mode: "completed",
        currentStep: 1,
        totalSteps: 1,
        accuracy: grammarResult.confidence,
        startTime: new Date().toISOString(),
        responses: [
          {
            stepId: "type",
            userInput: englishInput,
            expectedAnswer: initialEnglishHint || "",
            isCorrect: grammarResult.isValid,
            timestamp: new Date().toISOString(),
            attempts: 1,
          },
        ],
      },
      grammarResult.confidence
    );

    // 기존 패턴에서 들어왔다면 완료 처리
    if (patternId) completePattern(patternId);

    onComplete?.({ accuracy: grammarResult.confidence });
  };

  const handleReset = () => {
    setKoreanInput(initialKorean);
    setEnglishInput("");
    setShowSuggestions(false);
    setKoWarn(null);
    setGrammarResult(null);
  };

  const handleAddCustomPattern = () => {
    if (!koreanInput.trim() || !englishInput.trim() || !grammarResult?.isValid)
      return;
    // 스토어에 사용자 패턴 추가
    const newId = addUserPattern({
      korean: koreanInput,
      english: englishInput,
      category: "user",
    });
    // 추가 즉시 완료 처리(선택): 필요 시 주석 해제
    // completePattern(newId);
    onComplete?.({ accuracy: grammarResult.confidence });
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">영작 연습</h2>
        <button
          onClick={handleReset}
          className="text-gray-400 hover:text-gray-600"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* 한국어 입력 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          한국어로 말하고 싶은 내용
        </label>
        <textarea
          value={koreanInput}
          onChange={(e) => setKoreanInput(e.target.value)}
          placeholder="예: 저기 버스정류장이 있는데, ..."
          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          rows={2}
        />
        {koWarn && <p className="mt-2 text-xs text-orange-700">{koWarn}</p>}
      </div>

      {/* 영어 번역 제안 */}
      {suggestions.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">번역 제안</span>
            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {showSuggestions ? "숨기기" : "보기"}
            </button>
          </div>
          {showSuggestions && (
            <div className="space-y-2 p-3 bg-blue-50 rounded-lg">
              {suggestions.slice(0, 3).map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(s.text)}
                  className="block w-full text-left p-2 bg-white rounded border hover:bg-gray-50"
                >
                  <div className="font-medium text-gray-900">{s.text}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {s.explanation} (신뢰도: {Math.round(s.confidence * 100)}%)
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 영어 입력 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          영어로 번역해보세요
        </label>
        <textarea
          value={englishInput}
          onChange={(e) => setEnglishInput(e.target.value)}
          placeholder={
            initialEnglishHint
              ? `힌트: ${initialEnglishHint}`
              : "Enter your English translation..."
          }
          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          rows={2}
        />
      </div>

      {/* 문법 검사 결과 */}
      {grammarResult && (
        <div
          className={`mb-4 p-3 rounded-lg ${
            grammarResult.isValid
              ? "bg-green-50 border border-green-200"
              : "bg-orange-50 border border-orange-200"
          }`}
        >
          <div className="flex items-start space-x-2">
            {grammarResult.isValid ? (
              <Check className="h-5 w-5 text-green-600 mt-0.5" />
            ) : (
              <X className="h-5 w-5 text-orange-600 mt-0.5" />
            )}
            <div className="flex-1">
              <div
                className={`font-medium ${
                  grammarResult.isValid ? "text-green-800" : "text-orange-800"
                }`}
              >
                {grammarResult.isValid
                  ? "문법이 올바릅니다!"
                  : "문법을 확인해주세요"}
              </div>
              {/* 규칙 위반 상세 */}
              {grammarResult.errors.length > 0 && (
                <div className="mt-2 space-y-1">
                  {grammarResult.errors.map((error, index) => (
                    <div key={index} className="text-sm text-orange-700">
                      • {error.message}
                      {error.suggestions.length > 0 && (
                        <div className="ml-4 mt-1">
                          제안: {error.suggestions.join(", ")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {/* 일반 요건 제안 */}
              {grammarResult.suggestions.length > 0 && (
                <div className="mt-2 text-sm text-gray-600">
                  <div className="font-medium">일반적인 제안:</div>
                  {grammarResult.suggestions.map((s, i) => (
                    <div key={i} className="ml-2">
                      • {s}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          disabled={!grammarResult?.isValid}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            grammarResult?.isValid
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          번역 확인
        </button>
        <button
          onClick={handleAddCustomPattern}
          disabled={!grammarResult?.isValid}
          className={`px-4 py-2 rounded-lg border transition-colors ${
            grammarResult?.isValid
              ? "border-green-300 text-green-700 hover:bg-green-50"
              : "border-gray-300 text-gray-400 cursor-not-allowed"
          }`}
        >
          <Plus className="h-4 w-4 inline mr-1" />
          패턴 추가
        </button>
      </div>
    </div>
  );
};
