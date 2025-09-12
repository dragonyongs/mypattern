// src/shared/components/StudySidebar.tsx
import React, { useMemo } from "react";
import { StudySettingsPanel } from "./StudySettingsPanel";

export interface StudySidebarProps {
  category: string;
  dayNumber: number;
  progress: number; // 0~100
  items: { id?: string }[];
  currentIndex: number;

  // 두 계열 모두 지원
  masteredCards?: Set<number>; // 단어/문장
  studiedCards?: Set<number>; // 단어/문장
  correctAnswers?: Set<number>; // 워크북
  answeredQuestions?: Set<number>; // 워크북
  score?: number;

  onSelectIndex: (idx: number) => void;

  settings: {
    studyMode?: "assisted" | "immersive";
    showMeaningEnabled?: boolean;
    autoProgressEnabled?: boolean;
    autoPlayOnSelect?: boolean;
  };

  handleModeChange?: (mode: "assisted" | "immersive") => void;
  handleAutoProgressChange?: (enabled: boolean) => void;
  handleAutoPlayChange?: (enabled: boolean) => void;
}

export const StudySidebar: React.FC<StudySidebarProps> = ({
  category,
  dayNumber,
  progress,
  items,
  currentIndex,
  masteredCards,
  studiedCards,
  correctAnswers,
  answeredQuestions,
  score,
  onSelectIndex,
  settings,
  handleModeChange,
  handleAutoProgressChange,
  handleAutoPlayChange,
  isSettingOpen,
}) => {
  // 공통 집계
  const totals = useMemo(() => {
    const total = items.length;
    const studied = answeredQuestions?.size ?? studiedCards?.size ?? 0;
    const mastered = correctAnswers?.size ?? masteredCards?.size ?? 0;
    return { total, studied, mastered };
  }, [
    items.length,
    answeredQuestions,
    studiedCards,
    correctAnswers,
    masteredCards,
  ]);

  // 각 인덱스 상태 계산(현재/완료/학습됨)
  const states = useMemo(
    () =>
      items.map((_, idx) => {
        const isCurrent = idx === currentIndex;
        const isMastered =
          (correctAnswers?.has(idx) ?? masteredCards?.has(idx)) || false;
        const isStudied =
          (answeredQuestions?.has(idx) ?? studiedCards?.has(idx)) || false;
        return { isCurrent, isMastered, isStudied };
      }),
    [
      items,
      currentIndex,
      correctAnswers,
      masteredCards,
      answeredQuestions,
      studiedCards,
    ]
  );

  return (
    <aside className="hidden lg:block w-90 bg-white shadow-md">
      {/* 헤더 */}
      <div className="p-6 h-full flex flex-col space-y-6">
        <div>
          <div className="text-sm text-slate-500">{category}</div>
          <div className="text-base font-semibold">Day {dayNumber}</div>
        </div>

        {/* 진행률 */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-medium text-gray-700">학습 진행률</h4>
            <span className="text-sm font-bold text-indigo-600">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="h-full bg-indigo-600 transition-all"
              style={{ width: `${Math.round(progress)}%` }}
            />
          </div>
          <div className="text-xs text-slate-500">
            {totals.mastered}/{totals.total} 완료
            {typeof score === "number" && (
              <span className="ml-2">정답률 {Math.round(score)}%</span>
            )}
          </div>
        </div>

        {/* 학습 카드(번호 칩) */}
        <div className="space-y-3 flex-1">
          <div className="text-sm text-slate-600 mb-3">학습 카드</div>
          <div className="grid grid-cols-7 gap-2 overflow-y-auto h-[calc(100vh-45rem)]">
            {states.map(({ isCurrent, isMastered, isStudied }, idx) => {
              const base =
                "w-8 h-8 inline-flex items-center justify-center rounded-md text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500";
              const color = isCurrent
                ? "bg-indigo-600 text-white shadow"
                : isMastered
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : isStudied
                ? "bg-orange-50 text-orange-700 border border-orange-200"
                : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100";
              return (
                <button
                  key={idx}
                  type="button"
                  aria-label={`카드 ${idx + 1}`}
                  aria-pressed={isCurrent}
                  className={`${base} ${color}`}
                  onClick={() => onSelectIndex(idx)}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* 설정 패널 */}
        <div className="p-4">
          <StudySettingsPanel
            settings={settings}
            handleModeChange={handleModeChange!}
            handleAutoProgressChange={handleAutoProgressChange!}
            handleAutoPlayChange={handleAutoPlayChange}
          />
        </div>
      </div>
    </aside>
  );
};

export default React.memo(StudySidebar);
