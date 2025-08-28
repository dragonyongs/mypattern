// src/pages/LearnPage.tsx
import React, { useMemo, useSyncExternalStore, useCallback } from "react";
import { Link } from "react-router-dom";
import { useLexiconStore } from "@/stores/lexiconStore";
import { PatternCompose } from "@/features/learn/components/PatternCompose";
import { DailyPatternsSection } from "@/features/learn/components/DailyPatternsSection";

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

  if (!hasHydrated)
    return <div className="p-6 text-sm text-gray-500">로딩 중...</div>;

  // ✅ 버튼 핸들러 명시적 정의
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

  if (!status.ready) {
    return (
      <div className="p-8">
        <div className="max-w-xl mx-auto border rounded-xl p-6 bg-white space-y-4">
          <h2 className="text-lg font-semibold">
            패턴 생성을 위해 단어를 추가해주세요
          </h2>

          <div className="bg-yellow-50 p-4 rounded border">
            <p className="text-sm font-medium text-yellow-800">현재 상황:</p>
            <ul className="mt-1 text-sm text-yellow-700 list-disc pl-4">
              <li>총 {status.total}개 단어</li>
              <li>
                품사별:{" "}
                {Object.entries(status.posCount || {})
                  .map(([pos, count]) => `${pos}:${count}개`)
                  .join(", ") || "없음"}
              </li>
            </ul>
          </div>

          <div className="bg-blue-50 p-4 rounded border">
            <p className="text-sm font-medium text-blue-800">필요한 단어:</p>
            <ul className="mt-1 text-sm text-blue-700 list-disc pl-4">
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
              to="/app/library"
              className="px-4 py-2 bg-gray-100 rounded border hover:bg-gray-200"
            >
              단어장에서 직접 추가
            </Link>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6 p-4">
      <PatternCompose />
      <DailyPatternsSection />
    </div>
  );
}
