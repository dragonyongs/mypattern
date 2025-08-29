// src/pages/LearnPage.tsx (수정)
import React, {
  useMemo,
  useSyncExternalStore,
  useCallback,
  useEffect,
} from "react";
import { Link } from "react-router-dom";
import { useLexiconStore } from "@/stores/lexiconStore";
import { useLearningStore } from "@/stores/learningStore";
import { PatternCompose } from "@/features/learn/components/PatternCompose";
import { smartPatternService } from "@/shared/services/smartPatternService";

export function LearnPage() {
  const lexiconStore = useLexiconStore();
  const learningStore = useLearningStore();
  const { words, ensureBasicWordsAvailable } = lexiconStore;

  const hasHydrated = useSyncExternalStore(
    (cb) => (useLexiconStore as any).persist.onFinishHydration(cb),
    () => (useLexiconStore as any).persist.hasHydrated?.() ?? false,
    () => true
  );

  // ✅ 스마트 패턴 서비스 초기화
  useEffect(() => {
    if (hasHydrated) {
      smartPatternService.initialize(lexiconStore, learningStore);
      ensureBasicWordsAvailable();
    }
  }, [hasHydrated, lexiconStore, learningStore, ensureBasicWordsAvailable]);

  const status = useMemo(() => {
    const posCount = words.reduce((acc, w) => {
      acc[w.pos] = (acc[w.pos] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const hasVerb = posCount.VERB > 0;
    const hasContent =
      posCount.PLACE > 0 ||
      posCount.NOUN > 0 ||
      posCount.ITEM > 0 ||
      posCount.TIME > 0;
    const hasPerson = posCount.PERSON > 0;
    const total = words.length;
    const ready = total >= 5 && hasVerb && hasContent;

    const missing: string[] = [];
    if (!hasVerb) missing.push("동사 (VERB)");
    if (!hasContent) missing.push("장소/사물/시간 (PLACE/NOUN/ITEM/TIME)");
    if (!hasPerson) missing.push("사람 (PERSON) - 일부 패턴용");
    if (total < 5) missing.push(`총 5개 이상 (현재 ${total}개)`);

    return { ready, missing, total, posCount };
  }, [words]);

  if (!hasHydrated) return <div className="p-8 text-center">로딩 중...</div>;

  if (!status.ready) {
    return (
      <div className="p-8">
        <h2 className="text-xl font-bold mb-4">
          패턴 생성을 위해 단어를 추가해주세요
        </h2>

        <div className="mb-6">
          <h3 className="font-semibold mb-2">현재 상황:</h3>
          <p>총 {status.total}개 단어</p>
          <p>
            품사별:{" "}
            {Object.entries(status.posCount || {})
              .map(([pos, count]) => `${pos}:${count}개`)
              .join(", ") || "없음"}
          </p>
        </div>

        <div className="mb-6">
          <h3 className="font-semibold mb-2">필요한 단어:</h3>
          {status.missing.map((m) => (
            <div key={m} className="text-red-600">
              • {m}
            </div>
          ))}
        </div>

        <div className="space-x-4">
          <button
            onClick={() => ensureBasicWordsAvailable()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            기본 단어 자동 추가
          </button>
          <Link
            to="/library"
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 inline-block"
          >
            단어장에서 직접 추가
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* ✅ 통합 패턴 서비스를 사용하는 PatternCompose */}
      <PatternCompose />

      <div className="mt-8 text-center text-sm text-gray-500">
        총 {status.total}개 단어 • 품사별:{" "}
        {Object.entries(status.posCount || {})
          .map(([pos, count]) => `${pos}:${count}개`)
          .join(", ") || "없음"}
      </div>
    </div>
  );
}
