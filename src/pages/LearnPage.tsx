// src/pages/LearnPage.tsx

import React, { useMemo, useSyncExternalStore, useCallback } from "react";
import { Link } from "react-router-dom";
import { useLexiconStore } from "@/stores/lexiconStore";
import { PatternCompose } from "@/features/learn/components/PatternCompose";

export function LearnPage() {
  const { words, ensureMinimumPack } = useLexiconStore() as any;

  const hasHydrated = useSyncExternalStore(
    (cb) => (useLexiconStore as any).persist.onFinishHydration(cb),
    () => (useLexiconStore as any).persist.hasHydrated?.() ?? false,
    () => true
  );

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

  const handleAddBasicWords = useCallback(() => {
    if (!ensureMinimumPack) {
      console.error("ensureMinimumPack 함수가 없습니다");
      return;
    }

    console.log("🔄 기본 단어 자동 추가 시작...");
    const result = ensureMinimumPack(15);
    console.log("📊 추가 결과:", {
      added: result.added,
      before: result.totalBefore,
      after: result.totalAfter,
    });

    if (result.added > 0) {
      alert(`${result.added}개의 기본 단어가 추가되었습니다!`);
    } else {
      alert("이미 충분한 단어가 있습니다.");
    }
  }, [ensureMinimumPack]);

  if (!hasHydrated) return <div>로딩 중...</div>;

  if (!status.ready) {
    return (
      <div className="p-4 space-y-4">
        <h2 className="text-xl font-bold">
          패턴 생성을 위해 단어를 추가해주세요
        </h2>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold mb-2">현재 상황:</h3>
          <p>총 {status.total}개 단어</p>
          <p>
            품사별:{" "}
            {Object.entries(status.posCount || {})
              .map(([pos, count]) => `${pos}:${count}개`)
              .join(", ") || "없음"}
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-semibold mb-2">필요한 단어:</h3>
          <ul className="list-disc list-inside space-y-1">
            {status.missing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleAddBasicWords}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            기본 단어 자동 추가
          </button>

          <Link
            to="/library"
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            단어장에서 직접 추가
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* ✅ 통합된 PatternCompose만 사용 - DailyPatternsSection 제거 */}
      <PatternCompose />
    </div>
  );
}
