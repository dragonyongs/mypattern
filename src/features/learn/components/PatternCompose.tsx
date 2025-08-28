// src/features/learn/components/PatternCompose.tsx
import React, { useMemo, useState, useCallback } from "react";
import { ArrowRight, Volume2, RefreshCw, Plus } from "lucide-react";
import { useLearningStore } from "@/stores/learningStore";
import { useLexiconStore } from "@/stores/lexiconStore";
import { generatePatterns } from "../services/patternEngine";
import type { LangTag } from "../types/patternCore.types";

export const PatternCompose: React.FC = React.memo(() => {
  const store = useLearningStore();
  const { seedIfEmpty, ensureMinimumPack, words } = useLexiconStore();
  const [tags, setTags] = useState<LangTag>("daily");
  const [limit, setLimit] = useState(10);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAddingWords, setIsAddingWords] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    seedIfEmpty();
  }, [seedIfEmpty]);

  // ✅ 스마트 패턴 생성 (부족한 단어 자동 보충 포함)
  const handleSmartGenerate = useCallback(async () => {
    setIsGenerating(true);
    setErrorMessage(null);

    try {
      console.log("🚀 패턴 생성 시작...");

      // 1차 시도: 현재 단어로 패턴 생성
      let patterns = generatePatterns({ tags: [tags], limit });
      console.log("1차 생성 결과:", patterns.length, "개");

      // 패턴이 부족하면 적극적으로 단어 보충
      if (patterns.length < 3 && ensureMinimumPack) {
        setIsAddingWords(true);
        console.log("🔄 필요한 단어를 자동으로 추가하는 중...");

        const result = ensureMinimumPack(15);
        console.log("단어 추가 결과:", result);

        if (result.added > 0) {
          console.log(`✅ ${result.added}개 단어 추가 완료`);
          await new Promise((resolve) => setTimeout(resolve, 1000));

          console.log("🔄 단어 추가 후 재생성...");
          patterns = generatePatterns({ tags: [tags], limit });
          console.log("2차 생성 결과:", patterns.length, "개");
        }
        setIsAddingWords(false);
      }

      console.log("📝 최종 패턴들:", patterns);
      setCandidates(patterns);

      // ✅ 패턴 생성 실패 시 친화적인 오류 메시지
      if (patterns.length === 0) {
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
  }, [tags, limit, ensureMinimumPack, words]);

  // ✅ 단어 상태 체크
  const wordStatus = useMemo(() => {
    const posCount = words.reduce((acc, w) => {
      acc[w.pos] = (acc[w.pos] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const hasMinimum = {
      VERB: posCount.VERB >= 2,
      PLACE: posCount.PLACE >= 2,
      PERSON: posCount.PERSON >= 1,
      NOUN: posCount.NOUN >= 2,
      ITEM: posCount.ITEM >= 2,
      TIME: posCount.TIME >= 1,
    };

    const missing = [];
    if (!hasMinimum.VERB) missing.push("동사");
    if (!hasMinimum.PLACE) missing.push("장소");
    if (!hasMinimum.PERSON) missing.push("사람");
    if (!hasMinimum.NOUN) missing.push("명사");
    if (!hasMinimum.ITEM) missing.push("물건");
    if (!hasMinimum.TIME) missing.push("시간");

    return {
      total: words.length,
      posCount,
      missing,
      canGenerate: words.length >= 8 && missing.length <= 2,
    };
  }, [words]);

  // ✅ 패턴들 수 계산
  const topN = Math.min(3, candidates.length);
  const allN = candidates.length;

  // ✅ 여러 패턴 추가 함수
  const addMany = useCallback(
    (count: number) => {
      const picked = candidates.slice(0, count).map((c) => ({
        text: c.text,
        korean: c.korean,
        templateId: c.schemaId,
        usedChunks: [],
      }));

      const ids = store.acceptSuggestionsToQueueBatch
        ? store.acceptSuggestionsToQueueBatch(picked)
        : picked.map((r) => store.acceptSuggestionToQueue(r));

      if (ids) store.fireUIIntent("voice", ids);
    },
    [candidates, store]
  );

  // ✅ 단일 패턴 추가 함수
  const addOne = useCallback(
    (idx: number) => {
      const c = candidates[idx];
      const id = store.acceptSuggestionToQueue({
        text: c.text,
        korean: c.korean,
        templateId: c.schemaId,
        usedChunks: [],
      });

      store.fireUIIntent("voice", id);
    },
    [candidates, store]
  );

  return (
    <div className="bg-white border rounded-xl p-4 space-y-3">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">패턴 생성기</h3>
        <div className="flex items-center gap-2 text-sm">
          <label>상황 선택</label>
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

        {/* ✅ 스마트 생성 버튼 */}
        <button
          onClick={handleSmartGenerate}
          disabled={isGenerating || isAddingWords}
          className="px-4 py-2 bg-blue-600 text-white rounded inline-flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={isGenerating || isAddingWords ? "animate-spin" : ""}
          />
          {isAddingWords
            ? "단어 추가 중..."
            : isGenerating
            ? "생성 중..."
            : "스마트 생성"}
        </button>
      </div>

      {/* ✅ 오류 메시지 표시 */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm">
          <div className="font-medium text-red-800">패턴 생성 실패</div>
          <div className="text-red-700 mt-1">{errorMessage}</div>
        </div>
      )}

      {/* ✅ 진행 상황 안내 */}
      {isAddingWords && (
        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
          <div className="font-medium text-blue-800">
            필요한 단어를 자동으로 추가하고 있습니다...
          </div>
        </div>
      )}

      {/* ✅ 패턴 목록 표시 */}
      {candidates.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {candidates.map((c, i) => (
              <div
                key={`${c.text}-${i}`}
                className="border rounded p-3 bg-gray-50"
              >
                <div className="text-sm font-medium">{c.text}</div>
                <div className="text-xs text-gray-500">{c.korean}</div>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => addOne(i)}
                    className="px-2 py-1 bg-blue-600 text-white rounded inline-flex items-center gap-1 text-xs"
                  >
                    <Volume2 size={14} />
                    학습
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* ✅ 일괄 추가 버튼들 */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {topN > 0 && (
                <button
                  onClick={() => addMany(topN)}
                  className="px-3 py-2 bg-blue-600 text-white rounded inline-flex items-center gap-1 text-sm"
                >
                  상위 {topN}문장 추가
                  <ArrowRight size={16} />
                </button>
              )}
              {allN > topN && (
                <button
                  onClick={() => addMany(allN)}
                  className="px-3 py-2 bg-blue-600 text-white rounded inline-flex items-center gap-1 text-sm"
                >
                  전체 추가 ({allN})
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* ✅ 빈 상태 메시지 - 오류가 없을 때만 표시 */}
      {candidates.length === 0 &&
        !isGenerating &&
        !isAddingWords &&
        !errorMessage && (
          <div className="text-center py-8 text-gray-500">
            <p>위의 "스마트 생성" 버튼을 눌러보세요!</p>
            <p className="text-sm mt-1">
              필요한 단어가 없으면 자동으로 추가됩니다.
            </p>
          </div>
        )}
    </div>
  );
});
