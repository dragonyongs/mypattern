// src/shared/components/BottomAppBar.tsx
import React from "react";
import { BookOpen, Calendar, Settings } from "lucide-react";

type Props = {
  onGoPacks: () => void;
  onGoCalendar: () => void;
  onOpenSettings?: () => void; // 학습 화면에서만 필요
  current?: "packs" | "calendar" | "settings";
  showSettings?: boolean; // /study에서만 true
};

export const BottomAppBar: React.FC<Props> = ({
  onGoPacks,
  onGoCalendar,
  onOpenSettings,
  current,
  showSettings = false,
}) => {
  const base =
    "flex flex-col items-center justify-center select-none touch-manipulation";
  const item = (active: boolean) =>
    `${base} ${active ? "text-indigo-600" : "text-slate-600"}`;

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 h-16 bg-white/95 backdrop-blur border-t border-slate-200 z-40"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="모바일 전역 내비게이션"
    >
      <div
        className={`mx-auto max-w-screen-md h-full grid ${
          showSettings ? "grid-cols-3" : "grid-cols-2"
        }`}
      >
        <button
          aria-label="학습팩"
          aria-current={current === "packs" ? "page" : undefined}
          className={item(current === "packs")}
          onClick={onGoPacks}
        >
          <BookOpen className="w-6 h-6" />
          <span className="text-xs mt-1">학습팩</span>
        </button>
        <button
          aria-label="달력"
          aria-current={current === "calendar" ? "page" : undefined}
          className={item(current === "calendar")}
          onClick={onGoCalendar}
        >
          <Calendar className="w-6 h-6" />
          <span className="text-xs mt-1">달력</span>
        </button>
        {showSettings && (
          <button
            aria-label="설정"
            aria-current={current === "settings" ? "page" : undefined}
            className={item(current === "settings")}
            onClick={onOpenSettings}
          >
            <Settings className="w-6 h-6" />
            <span className="text-xs mt-1">설정</span>
          </button>
        )}
      </div>
    </nav>
  );
};
export default BottomAppBar;
