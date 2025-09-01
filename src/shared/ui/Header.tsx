// src/shared/ui/Header.tsx
import React from "react";
import { LogOut } from "lucide-react";
import { useAppSelector } from "@/providers/appHooks";
import { useAuthStore } from "@/stores/authStore";
import { useNavigate } from "react-router-dom";

export function Header() {
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();

  const dailyQueue = useAppSelector((state) => {
    const today = new Date().toISOString().split("T");
    return state.sentences.filter((s) => s.nextDue <= today);
  });
  const settings = useAppSelector((state) => state.settings);

  return (
    // 헤더 자체에 h-14를 부여
    <header className="sticky top-0 z-40 h-14 border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto max-w-5xl px-4 h-full flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <h1 className="font-semibold">MyPattern</h1>
          <span className="text-xs text-gray-500">
            {user?.name ?? "게스트"}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-600">
            오늘 복습: {dailyQueue.length}개 · 목표: {settings.dailyGoal}개
          </span>
          <button
            onClick={() => {
              logout();
              navigate("/landing");
            }}
            className="inline-flex items-center gap-1 text-gray-700 hover:text-red-600"
          >
            <LogOut className="size-4" />
            로그아웃
          </button>
        </div>
      </div>
    </header>
  );
}
