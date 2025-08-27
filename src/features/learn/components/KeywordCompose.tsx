// src/features/learn/components/KeywordCompose.tsx
import React, { useMemo, useState, useCallback } from "react";
import { ArrowRight, Volume2, Edit3 } from "lucide-react";
import { useLearningStore } from "@/stores/learningStore";
import { splitKeywords, detectLang } from "@/shared/lib/lang";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import {
  composeFromKeywords,
  ComposeCandidate,
} from "../services/keywordComposer";

export const KeywordCompose: React.FC = React.memo(() => {
  const store = useLearningStore();
  const level = store.userProgress.level;
  const [input, setInput] = useState("bus stop, crosswalk, median");
  const [page, setPage] = useState(0);

  const debounced = useDebouncedValue(input, 350);

  const candidates = useMemo<ComposeCandidate[]>(() => {
    const kws = splitKeywords(debounced);
    const lang = detectLang(debounced);
    if (lang === "empty") return [];
    return composeFromKeywords(kws, level, lang === "mixed" ? "ko" : lang, 12);
  }, [debounced, level]);

  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(candidates.length / pageSize));
  const view = candidates.slice(page * pageSize, page * pageSize + pageSize);

  const addOne = useCallback(
    (c: ComposeCandidate, mode: "voice" | "write") => {
      const id = store.acceptSuggestionToQueue({
        text: c.text,
        korean: c.korean,
        templateId: "ad-hoc",
        usedChunks: [],
        notes: [],
      } as any);
      // open modal immediately
      store.fireUIIntent(mode, id);
    },
    [store]
  );

  const addMany = useCallback(
    (count: number, mode: "voice" | "write") => {
      const picked = candidates.slice(0, count);
      const ids = store.acceptSuggestionsToQueueBatch?.(
        picked.map((c) => ({
          text: c.text,
          korean: c.korean,
          templateId: "ad-hoc",
          usedChunks: [],
          notes: [],
        })) as any
      ) as string[] | undefined;
      const first = ids?.[0];
      if (first) store.fireUIIntent(mode, first);
    },
    [candidates, store]
  );

  return (
    <div className="bg-white border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">빠른 문장 만들기 · 핵심 키워드</h3>
        <div className="text-xs text-gray-500">한국어/영어 입력 모두 가능</div>
      </div>

      <input
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setPage(0);
        }}
        placeholder="예: 버스정류장, 횡단보도, 분리대 / bus stop, crosswalk, median"
        className="w-full p-2 border rounded"
      />

      {view.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {view.map((c, i) => (
            <div
              key={`${c.text}-${i}`}
              className="border rounded p-3 bg-gray-50"
            >
              <div className="text-sm font-medium">{c.text}</div>
              <div className="text-xs text-gray-500">{c.korean}</div>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => addOne(c, "voice")}
                  className="px-2 py-1 bg-blue-600 text-white rounded inline-flex items-center gap-1"
                >
                  <Volume2 size={16} /> 학습
                </button>
                <button
                  onClick={() => addOne(c, "write")}
                  className="px-2 py-1 bg-purple-600 text-white rounded inline-flex items-center gap-1"
                >
                  <Edit3 size={16} /> 영작
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => addMany(3, "voice")}
            className="px-3 py-2 bg-blue-600 text-white rounded inline-flex items-center gap-1"
          >
            3문장 추가 <ArrowRight size={16} />
          </button>
          <button
            onClick={() => addMany(5, "voice")}
            className="px-3 py-2 bg-blue-600 text-white rounded inline-flex items-center gap-1"
          >
            5문장 추가 <ArrowRight size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="px-2 py-1 border rounded disabled:opacity-50"
          >
            이전
          </button>
          <span>
            {page + 1} / {totalPages}
          </span>
          <button
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            className="px-2 py-1 border rounded disabled:opacity-50"
          >
            다음
          </button>
        </div>
      </div>
    </div>
  );
});
