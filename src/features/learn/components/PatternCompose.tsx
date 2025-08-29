// src/features/learn/components/PatternCompose.tsx

import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  ArrowRight,
  Volume2,
  RefreshCw,
  Plus,
  CheckSquare,
  PlayCircle,
  Star,
  Trash2,
  CheckCircle2,
  Pause,
  SkipForward,
} from "lucide-react";
import { useLearningStore } from "@/stores/learningStore";
import { useLexiconStore } from "@/stores/lexiconStore";
import { generatePatterns } from "../services/patternEngine";
import type { LangTag } from "../types/patternCore.types";

// 생성된 패턴 인터페이스 확장
interface GeneratedPattern {
  text: string;
  korean: string;
  schemaId: string;
  used: string[];
  canWrite: boolean;
  id?: string;
  isAdded?: boolean;
}

// 통합 패턴 인터페이스
interface UnifiedPattern {
  id: string;
  text: string;
  korean: string;
  schemaId: string;
  priority?: number;
  isCore: boolean;
  isCompleted?: boolean;
  addedAt: string;
}

// 학습 세션 인터페이스
interface LearningSession {
  patterns: UnifiedPattern[];
  currentIndex: number;
  isActive: boolean;
  showModal: boolean;
}

export const PatternCompose: React.FC = React.memo(() => {
  const store = useLearningStore();
  const { seedIfEmpty, ensureMinimumPack, words } = useLexiconStore();

  // 상태 관리
  const [tags, setTags] = useState<LangTag>("daily");
  const [limit, setLimit] = useState(10);
  const [candidates, setCandidates] = useState<GeneratedPattern[]>([]);
  const [unifiedPatterns, setUnifiedPatterns] = useState<UnifiedPattern[]>([
    // 초기 핵심 패턴 1개
    {
      id: "core-1",
      text: "I'm going to the store weekend.",
      korean: "주말 가게 갈 거야.",
      schemaId: "GO-PLACE-TIME",
      priority: 1,
      isCore: true,
      isCompleted: false,
      addedAt: new Date().toISOString(),
    },
  ]);
  const [selectedCandidates, setSelectedCandidates] = useState<Set<number>>(
    new Set()
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAddingWords, setIsAddingWords] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ✅ 학습 세션 상태 추가
  const [learningSession, setLearningSession] = useState<LearningSession>({
    patterns: [],
    currentIndex: 0,
    isActive: false,
    showModal: false,
  });

  React.useEffect(() => {
    seedIfEmpty();
  }, [seedIfEmpty]);

  // ✅ TTS 기능 구현
  const playTTS = useCallback((text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel(); // 이전 재생 취소
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.volume = 1;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  // ✅ 스마트 패턴 생성 (재생성 가능하도록 개선)
  const handleSmartGenerate = useCallback(async () => {
    setIsGenerating(true);
    setErrorMessage(null);
    setSelectedCandidates(new Set());

    try {
      console.log("🚀 패턴 생성 시작...");

      // ✅ 매번 새로운 패턴 생성을 위해 랜덤성 추가
      const randomSeed = Math.floor(Math.random() * 1000);
      let patterns = generatePatterns({
        tags: [tags],
        limit,
        seed: randomSeed, // 랜덤 시드 추가 (generatePatterns 함수에서 지원한다면)
      });

      console.log("1차 생성 결과:", patterns.length, "개");

      if (patterns.length < 3 && ensureMinimumPack) {
        setIsAddingWords(true);
        console.log("🔄 필요한 단어를 자동으로 추가하는 중...");

        const result = ensureMinimumPack(15);
        console.log("단어 추가 결과:", result);

        if (result.added > 0) {
          console.log(`✅ ${result.added}개 단어 추가 완료`);
          await new Promise((resolve) => setTimeout(resolve, 1000));

          console.log("🔄 단어 추가 후 재생성...");
          patterns = generatePatterns({
            tags: [tags],
            limit,
            seed: randomSeed,
          });
          console.log("2차 생성 결과:", patterns.length, "개");
        }

        setIsAddingWords(false);
      }

      // ✅ 패턴에 임시 ID 추가 및 기존 추가 상태 확인
      const patternsWithId = patterns.map((pattern, index) => {
        const id = `candidate-${Date.now()}-${index}`;
        const isAlreadyAdded = unifiedPatterns.some(
          (up) =>
            up.text.toLowerCase().trim() === pattern.text.toLowerCase().trim()
        );

        return {
          ...pattern,
          id,
          isAdded: isAlreadyAdded,
        };
      });

      console.log("📝 최종 패턴들:", patternsWithId);
      setCandidates(patternsWithId);

      // 오류 메시지 처리
      if (patternsWithId.length === 0) {
        const posCount = words.reduce((acc, w) => {
          acc[w.pos] = (acc[w.pos] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const missingPos = [];
        if ((posCount.VERB || 0) < 3) missingPos.push("동사");
        if ((posCount.PLACE || 0) < 3) missingPos.push("장소");
        if ((posCount.PERSON || 0) < 2) missingPos.push("사람");
        if ((posCount.NOUN || 0) < 3) missingPos.push("명사");
        if ((posCount.ITEM || 0) < 3) missingPos.push("물건");

        if (missingPos.length > 0) {
          setErrorMessage(
            `패턴을 만들기 위해 더 많은 단어가 필요합니다: ${missingPos.join(
              ", "
            )}`
          );
        } else {
          setErrorMessage(
            "패턴 생성에 실패했습니다. 다른 상황을 선택하거나 Library에서 단어를 추가해보세요."
          );
        }
      } else {
        setErrorMessage(null);
      }
    } catch (error) {
      console.error("패턴 생성 중 오류:", error);
      setErrorMessage("패턴 생성 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsGenerating(false);
      setIsAddingWords(false);
    }
  }, [tags, limit, ensureMinimumPack, words, unifiedPatterns]);

  // ✅ 통합된 패턴 추가 함수
  const addPatternToUnified = useCallback(
    (pattern: GeneratedPattern, isCore: boolean = false) => {
      // 중복 체크
      const exists = unifiedPatterns.some(
        (up) =>
          up.text.toLowerCase().trim() === pattern.text.toLowerCase().trim()
      );

      if (exists) return;

      const newPattern: UnifiedPattern = {
        id: `unified-${Date.now()}-${Math.random()}`,
        text: pattern.text,
        korean: pattern.korean,
        schemaId: pattern.schemaId,
        priority: isCore
          ? Math.max(
              ...unifiedPatterns
                .filter((p) => p.isCore)
                .map((p) => p.priority || 0),
              0
            ) + 1
          : undefined,
        isCore,
        isCompleted: false,
        addedAt: new Date().toISOString(),
      };

      setUnifiedPatterns((prev) => [...prev, newPattern]);

      // ✅ 후보 패턴의 추가 상태 업데이트
      setCandidates((prev) =>
        prev.map((c) =>
          c.text.toLowerCase().trim() === pattern.text.toLowerCase().trim()
            ? { ...c, isAdded: true }
            : c
        )
      );

      // learningStore에 추가 (모달 열지 않음)
      store.acceptSuggestionToQueue({
        text: pattern.text,
        korean: pattern.korean,
        templateId: pattern.schemaId,
        usedChunks: [],
      });
    },
    [unifiedPatterns, store]
  );

  // ✅ 선택된 패턴들 추가
  const addSelectedPatterns = useCallback(() => {
    const selectedPatterns = Array.from(selectedCandidates)
      .map((index) => candidates[index])
      .filter(Boolean)
      .filter((p) => !p.isAdded); // 이미 추가된 패턴 제외

    selectedPatterns.forEach((pattern) => addPatternToUnified(pattern, false));
    setSelectedCandidates(new Set());
  }, [selectedCandidates, candidates, addPatternToUnified]);

  // ✅ 상위 N개 패턴 추가
  const addTopPatterns = useCallback(
    (count: number) => {
      const availablePatterns = candidates.filter((p) => !p.isAdded);
      const topPatterns = availablePatterns.slice(0, count);
      topPatterns.forEach((pattern) => addPatternToUnified(pattern, false));
    },
    [candidates, addPatternToUnified]
  );

  // ✅ 체크박스 기능 구현
  const togglePatternSelection = useCallback(
    (index: number) => {
      const pattern = candidates[index];
      if (pattern.isAdded) return; // 이미 추가된 패턴은 선택 불가

      setSelectedCandidates((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(index)) {
          newSet.delete(index);
        } else {
          newSet.add(index);
        }
        return newSet;
      });
    },
    [candidates]
  );

  // ✅ 통합 패턴에서 제거
  const removeFromUnified = useCallback(
    (id: string) => {
      const removedPattern = unifiedPatterns.find((p) => p.id === id);
      setUnifiedPatterns((prev) => prev.filter((p) => p.id !== id));

      // 후보 패턴 상태도 업데이트
      if (removedPattern) {
        setCandidates((prev) =>
          prev.map((c) =>
            c.text.toLowerCase().trim() ===
            removedPattern.text.toLowerCase().trim()
              ? { ...c, isAdded: false }
              : c
          )
        );
      }
    },
    [unifiedPatterns]
  );

  // ✅ 개별 패턴 학습 시작 (모달 열기)
  const startIndividualLearning = useCallback(
    (pattern: UnifiedPattern) => {
      setLearningSession({
        patterns: [pattern],
        currentIndex: 0,
        isActive: true,
        showModal: true,
      });
      playTTS(pattern.text);
    },
    [playTTS]
  );

  // ✅ 전체 패턴 학습 시작 (순차적)
  const startLearningSession = useCallback(() => {
    const learningPatterns = unifiedPatterns.filter(
      (p) => !p.isCore || !p.isCompleted
    );
    if (learningPatterns.length > 0) {
      setLearningSession({
        patterns: learningPatterns,
        currentIndex: 0,
        isActive: true,
        showModal: true,
      });
      playTTS(learningPatterns[0].text);
    }
  }, [unifiedPatterns, playTTS]);

  // ✅ 학습 세션 다음 패턴
  const nextLearningPattern = useCallback(() => {
    const nextIndex = learningSession.currentIndex + 1;
    if (nextIndex < learningSession.patterns.length) {
      setLearningSession((prev) => ({
        ...prev,
        currentIndex: nextIndex,
      }));
      playTTS(learningSession.patterns[nextIndex].text);
    } else {
      // 학습 완료
      setLearningSession((prev) => ({
        ...prev,
        isActive: false,
        showModal: false,
      }));
    }
  }, [learningSession, playTTS]);

  // ✅ 학습 모달 닫기
  const closeLearningModal = useCallback(() => {
    window.speechSynthesis.cancel();
    setLearningSession((prev) => ({
      ...prev,
      isActive: false,
      showModal: false,
    }));
  }, []);

  // ✅ 핵심 패턴 완료 토글
  const toggleCompletion = useCallback((id: string) => {
    setUnifiedPatterns((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isCompleted: !p.isCompleted } : p))
    );
  }, []);

  // ✅ 구분된 패턴들
  const corePatterns = unifiedPatterns
    .filter((p) => p.isCore)
    .sort((a, b) => (a.priority || 0) - (b.priority || 0));
  const learningPatterns = unifiedPatterns.filter((p) => !p.isCore);
  const completedCoreCount = corePatterns.filter((p) => p.isCompleted).length;

  // ✅ 선택 가능한 패턴과 추가 가능한 패턴 계산
  const selectablePatterns = candidates.filter((p) => !p.isAdded);
  const availableForTopAdd = selectablePatterns.length >= 3;

  return (
    <div className="space-y-6">
      {/* ✅ 학습 모달 */}
      {learningSession.showModal && learningSession.patterns.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-2">
                {learningSession.currentIndex + 1} /{" "}
                {learningSession.patterns.length}
              </div>
              <div className="text-2xl font-bold mb-4 text-center">
                {learningSession.patterns[learningSession.currentIndex].text}
              </div>
              <div className="text-lg text-gray-600 mb-6 text-center">
                {learningSession.patterns[learningSession.currentIndex].korean}
              </div>

              <div className="flex justify-center gap-4">
                <button
                  onClick={() =>
                    playTTS(
                      learningSession.patterns[learningSession.currentIndex]
                        .text
                    )
                  }
                  className="px-4 py-2 bg-green-600 text-white rounded-lg inline-flex items-center gap-2"
                >
                  <Volume2 size={16} />
                  다시 듣기
                </button>

                {learningSession.currentIndex + 1 <
                learningSession.patterns.length ? (
                  <button
                    onClick={nextLearningPattern}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg inline-flex items-center gap-2"
                  >
                    <SkipForward size={16} />
                    다음 패턴
                  </button>
                ) : (
                  <button
                    onClick={closeLearningModal}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg"
                  >
                    학습 완료
                  </button>
                )}

                <button
                  onClick={closeLearningModal}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ 통합된 패턴 관리 섹션 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg text-blue-800">
            📚 나의 학습 패턴
            <span className="text-sm text-blue-600 ml-2 font-normal">
              핵심 {corePatterns.length}개 • 연습 {learningPatterns.length}개
            </span>
          </h3>

          <div className="text-xs text-blue-600">
            핵심 완료: {completedCoreCount}/{corePatterns.length}
          </div>
        </div>

        {unifiedPatterns.length > 0 ? (
          <div className="space-y-3">
            {/* 핵심 패턴들 */}
            {corePatterns.map((pattern) => (
              <div
                key={pattern.id}
                className={`flex items-center justify-between p-4 border rounded-lg transition-all ${
                  pattern.isCompleted
                    ? "bg-green-50 border-green-200"
                    : "bg-orange-50 border-orange-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      pattern.isCompleted
                        ? "bg-green-500 text-white"
                        : "bg-orange-500 text-white"
                    }`}
                  >
                    <Star size={12} />
                  </div>
                  <div className="flex-1">
                    <div
                      className={`font-medium ${
                        pattern.isCompleted ? "line-through text-gray-500" : ""
                      }`}
                    >
                      {pattern.text}
                    </div>
                    <div
                      className={`text-sm ${
                        pattern.isCompleted
                          ? "line-through text-gray-400"
                          : "text-gray-600"
                      }`}
                    >
                      {pattern.korean}
                    </div>
                    <div className="text-xs text-orange-600 font-medium">
                      핵심 패턴
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* ✅ TTS 버튼 추가 */}
                  <button
                    onClick={() => playTTS(pattern.text)}
                    className="p-2 text-green-600 hover:bg-green-100 rounded"
                  >
                    <Volume2 size={16} />
                  </button>

                  {/* ✅ 학습 시작 버튼 */}
                  <button
                    onClick={() => startIndividualLearning(pattern)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      pattern.isCompleted
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                    }`}
                  >
                    {pattern.isCompleted ? "복습하기" : "학습하기"}
                  </button>

                  <button
                    onClick={() => toggleCompletion(pattern.id)}
                    className="p-1 text-blue-500 hover:bg-blue-100 rounded text-xs"
                  >
                    {pattern.isCompleted ? "✅" : "⭕"}
                  </button>

                  <button
                    onClick={() => removeFromUnified(pattern.id)}
                    className="p-1 text-red-500 hover:bg-red-100 rounded"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}

            {/* 학습 패턴들 */}
            {learningPatterns.map((pattern) => (
              <div
                key={pattern.id}
                className="flex items-center justify-between p-3 border rounded-lg bg-blue-50 border-blue-200"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <PlayCircle size={16} className="text-blue-600" />
                    <span className="font-medium">{pattern.text}</span>
                  </div>
                  <div className="text-sm text-gray-600 ml-6">
                    {pattern.korean}
                  </div>
                  <div className="text-xs text-blue-600 font-medium ml-6">
                    연습 패턴
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* ✅ TTS 버튼 추가 */}
                  <button
                    onClick={() => playTTS(pattern.text)}
                    className="p-2 text-green-600 hover:bg-green-100 rounded"
                  >
                    <Volume2 size={16} />
                  </button>

                  {/* ✅ 학습 시작 버튼 추가 */}
                  <button
                    onClick={() => startIndividualLearning(pattern)}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                  >
                    학습하기
                  </button>

                  <button
                    onClick={() => removeFromUnified(pattern.id)}
                    className="p-2 text-red-600 hover:bg-red-100 rounded text-xs"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}

            {/* 전체 학습 시작 버튼 */}
            {learningPatterns.length > 0 && (
              <div className="pt-4 border-t">
                <button
                  onClick={startLearningSession}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg inline-flex items-center justify-center gap-2 font-medium hover:bg-blue-700"
                >
                  <PlayCircle size={20} />
                  패턴 학습 시작하기 (
                  {
                    unifiedPatterns.filter((p) => !p.isCore || !p.isCompleted)
                      .length
                  }
                  개)
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-blue-400">
            <PlayCircle size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">아직 추가된 패턴이 없습니다</p>
            <p className="text-xs mt-1">
              아래에서 패턴을 생성하고 추가해보세요
            </p>
          </div>
        )}
      </div>

      {/* 패턴 생성 섹션 */}
      <div className="bg-white border rounded-xl p-4 space-y-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">🎯 패턴 생성기</h3>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">상황 선택</label>
            <select
              value={tags}
              onChange={(e) => setTags(e.target.value as LangTag)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="daily">일상</option>
              <option value="directions">길찾기</option>
              <option value="school">학교</option>
              <option value="business">비즈니스</option>
            </select>
          </div>
        </div>

        {/* 생성 컨트롤 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <label>생성 수</label>
            <input
              type="number"
              min="1"
              max="30"
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value || "1"))}
              className="w-20 border rounded px-2 py-1"
            />
          </div>

          <button
            onClick={handleSmartGenerate}
            disabled={isGenerating || isAddingWords}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg inline-flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={isGenerating ? "animate-spin" : ""}
            />
            {isAddingWords
              ? "단어 추가 중..."
              : isGenerating
              ? "생성 중..."
              : "스마트 생성"}
          </button>
        </div>

        {/* 오류/진행 상황 메시지 */}
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-medium text-red-800">패턴 생성 실패</h4>
            <p className="text-sm text-red-600 mt-1">{errorMessage}</p>
          </div>
        )}

        {isAddingWords && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
            필요한 단어를 자동으로 추가하고 있습니다...
          </div>
        )}

        {/* 생성된 패턴 목록 */}
        {candidates.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {candidates.map((pattern, i) => (
                <div
                  key={pattern.id || i}
                  className={`border rounded-lg p-3 transition-all ${
                    selectedCandidates.has(i) && !pattern.isAdded
                      ? "border-blue-500 bg-blue-50"
                      : pattern.isAdded
                      ? "border-green-500 bg-green-50"
                      : "bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="text-sm font-medium">{pattern.text}</div>
                      <div className="text-xs text-gray-500">
                        {pattern.korean}
                      </div>
                    </div>

                    {/* ✅ 체크박스 (추가되지 않은 패턴만 선택 가능) */}
                    <button
                      onClick={() => togglePatternSelection(i)}
                      disabled={pattern.isAdded}
                      className={`ml-2 p-1 rounded transition-colors ${
                        pattern.isAdded
                          ? "text-gray-300 cursor-not-allowed"
                          : selectedCandidates.has(i)
                          ? "text-blue-600"
                          : "text-gray-400 hover:text-gray-600"
                      }`}
                    >
                      <CheckSquare size={16} />
                    </button>
                  </div>

                  {/* ✅ 추가/추가됨 버튼 */}
                  <div className="flex gap-2">
                    {pattern.isAdded ? (
                      <div className="px-3 py-1 bg-green-100 text-green-700 rounded text-xs inline-flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        추가됨
                      </div>
                    ) : (
                      <button
                        onClick={() => addPatternToUnified(pattern, false)}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-xs inline-flex items-center gap-1 hover:bg-blue-700"
                      >
                        <Plus size={12} />
                        추가하기
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* ✅ 일괄 추가 버튼들 (추가 가능한 패턴이 있을 때만 표시) */}
            {selectablePatterns.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                {selectedCandidates.size > 0 && (
                  <button
                    onClick={addSelectedPatterns}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg inline-flex items-center gap-2 text-sm"
                  >
                    <CheckSquare size={16} />
                    선택한{" "}
                    {
                      Array.from(selectedCandidates).filter(
                        (i) => !candidates[i]?.isAdded
                      ).length
                    }
                    개 추가
                  </button>
                )}

                {availableForTopAdd && (
                  <button
                    onClick={() => addTopPatterns(3)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg inline-flex items-center gap-2 text-sm"
                  >
                    <ArrowRight size={16} />
                    상위 3개 추가
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* 빈 상태 메시지 */}
        {candidates.length === 0 &&
          !isGenerating &&
          !isAddingWords &&
          !errorMessage && (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">위의 "스마트 생성" 버튼을 눌러보세요!</p>
              <p className="text-xs mt-1">
                필요한 단어가 없으면 자동으로 추가됩니다.
              </p>
            </div>
          )}
      </div>
    </div>
  );
});
