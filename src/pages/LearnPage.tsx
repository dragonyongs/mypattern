// src/pages/LearnPage.tsx
import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useLexiconStore } from "@/stores/lexiconStore";
import { PatternCompose } from "@/features/learn/components/PatternCompose";
import { DailyPatternsSection } from "@/features/learn/components/DailyPatternsSection";

export function LearnPage() {
  const { words, hydrated } = useLexiconStore();

  // 최소 요건: 동사 1+, 장소/명사/사물/시간 중 1+, 총 5+
  const ready = useMemo(() => {
    const hasVerb = words.some((w) => w.pos === "VERB");
    const hasContent =
      words.some((w) => w.pos === "PLACE") ||
      words.some((w) => w.pos === "NOUN") ||
      words.some((w) => w.pos === "ITEM") ||
      words.some((w) => w.pos === "TIME");
    return words.length >= 5 && hasVerb && hasContent;
  }, [words]);

  if (!hydrated) {
    return <div className="p-6 text-sm text-gray-500">로딩 중...</div>;
  }

  if (!ready) {
    return (
      <div className="p-8">
        <div className="max-w-xl mx-auto border rounded-xl p-6 bg-white">
          <h2 className="text-lg font-semibold">먼저 단어를 몇 개만 채워요</h2>
          <p className="mt-2 text-sm text-gray-600">
            동사 1개 이상과 장소·사물·시간 중 1개 이상을 포함해 최소 5개를
            추가하면 문장 패턴을 자동으로 만들어 드립니다.
          </p>
          <Link
            to="/app/library"
            className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded"
          >
            단어 추가하러 가기
          </Link>
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
