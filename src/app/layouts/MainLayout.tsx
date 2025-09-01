// src/app/layouts/MainLayout.tsx
import React from "react";
import { Outlet } from "react-router-dom";
import { Header } from "@/shared/ui/Header";
import { Navigation } from "@/shared/ui/Navigation";

export function MainLayout() {
  return (
    // 헤더-본문-탭바 3단 앱 셸
    <div className="min-h-dvh flex flex-col bg-white">
      {/* 상단 고정 헤더 (정확한 높이 지정) */}
      <Header />

      {/* 본문만 스크롤: min-h-0로 레이아웃 오버플로 방지 */}
      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="container mx-auto max-w-5xl px-4 py-6">
          <Outlet />
        </div>
      </main>

      {/* 하단 모바일 탭바 */}
      <div className="md:hidden sticky bottom-0 z-40 border-t bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 safe-bottom">
        <div className="container mx-auto max-w-5xl px-2">
          <Navigation />
        </div>
      </div>
    </div>
  );
}
export default MainLayout;
