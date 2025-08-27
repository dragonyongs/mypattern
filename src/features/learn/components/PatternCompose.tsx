// src/features/learn/components/PatternCompose.tsx
import React, { useMemo, useState, useCallback } from "react";
import { ArrowRight, Volume2 } from "lucide-react";
import { useLearningStore } from "@/stores/learningStore";
// import { useLexiconStore } from "@/stores/lexiconStore";
import { generatePatterns } from "../services/patternEngine";
import type { LangTag } from "../types/patternCore.types";

export const PatternCompose: React.FC = React.memo(() => {
  const store = useLearningStore();
  // const { seedIfEmpty } = useLexiconStore();
  const [tags, setTags] = useState<LangTag[]>(["daily"]); // 상황 선택
  const [limit, setLimit] = useState(10);

  // React.useEffect(() => {
  //   seedIfEmpty();
  // }, [seedIfEmpty]);

  const candidates = useMemo(
    () => generatePatterns({ tags, limit }),
    [tags, limit]
  );
  const topN = Math.min(3, candidates.length);
  const allN = candidates.length;

  const addMany = useCallback(
    (count: number) => {
      const picked = candidates.slice(0, count).map(
        (c) =>
          ({
            text: c.text,
            korean: c.korean,
            templateId: c.schemaId,
            usedChunks: [],
          } as any)
      );
      const ids = store.acceptSuggestionsToQueueBatch
        ? store.acceptSuggestionsToQueueBatch(picked)
        : picked.map((r) => store.acceptSuggestionToQueue(r));
      if (ids && ids) store.fireUIIntent("voice", ids);
    },
    [candidates, store]
  );

  const addOne = useCallback(
    (idx: number) => {
      const c = candidates[idx];
      const id = store.acceptSuggestionToQueue({
        text: c.text,
        korean: c.korean,
        templateId: c.schemaId,
        usedChunks: [],
      } as any);
      store.fireUIIntent("voice", id);
    },
    [candidates, store]
  );

  return (
    <div className="bg-white border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">패턴 생성기 · 상황 선택</h3>
        <select
          value={tags}
          onChange={(e) => setTags([e.target.value as LangTag])}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="daily">일상</option>
          <option value="directions">길찾기</option>
          <option value="school">학교</option>
          <option value="business">비즈니스</option>
        </select>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <label>생성 수</label>
        <input
          type="number"
          min={1}
          max={30}
          value={limit}
          onChange={(e) => setLimit(parseInt(e.target.value || "1"))}
          className="w-20 border rounded px-2 py-1"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {candidates.map((c, i) => (
          <div key={`${c.text}-${i}`} className="border rounded p-3 bg-gray-50">
            <div className="text-sm font-medium">{c.text}</div>
            <div className="text-xs text-gray-500">{c.korean}</div>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => addOne(i)}
                className="px-2 py-1 bg-blue-600 text-white rounded inline-flex items-center gap-1"
              >
                <Volume2 size={16} /> 학습
              </button>
              {/* 자동 생성은 영작 버튼 숨김 */}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {topN > 0 && (
            <button
              onClick={() => addMany(topN)}
              className="px-3 py-2 bg-blue-600 text-white rounded inline-flex items-center gap-1"
            >
              상위 {topN}문장 추가 <ArrowRight size={16} />
            </button>
          )}
          {allN > topN && (
            <button
              onClick={() => addMany(allN)}
              className="px-3 py-2 bg-blue-600 text-white rounded inline-flex items-center gap-1"
            >
              전체 추가 ({allN})
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
