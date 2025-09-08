// src/pages/PackSelectPage.tsx
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Calendar, User } from "lucide-react";
import { useAppStore } from "@/stores/appStore";

// 실제 팩 데이터 import
import realVocaBasicData from "../../public/data/packs/real-voca-basic.json";
import type { PackData } from "@/types";

export default function PackSelectPage() {
  const navigate = useNavigate();

  // [중요] 개별적으로 액션 가져오기
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const user = useAppStore((state) => state.user);
  const setSelectedPackData = useAppStore((state) => state.setSelectedPackData);
  const logout = useAppStore((state) => state.logout);
  const hasHydrated = useAppStore((state) => state._hasHydrated);

  // [디버깅] 액션 함수 상태 확인
  useEffect(() => {
    console.log("🔍 PackSelectPage - Actions debug:");
    console.log("  - isAuthenticated:", isAuthenticated);
    console.log("  - user:", user);
    console.log(
      "  - setSelectedPackData:",
      typeof setSelectedPackData,
      setSelectedPackData
    );
    console.log("  - logout:", typeof logout, logout);
    console.log("  - hasHydrated:", hasHydrated);
  }, [isAuthenticated, user, setSelectedPackData, logout, hasHydrated]);

  // hydration 완료 전에는 로딩 표시
  if (!hasHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-700">
            앱 데이터 로딩 중...
          </p>
        </div>
      </div>
    );
  }

  // 인증 확인
  useEffect(() => {
    if (!isAuthenticated) {
      console.log("⚠️ Not authenticated, redirecting to landing");
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handlePackSelect = (packData: PackData) => {
    console.log("🔥 Pack selection attempt:", packData?.title);
    console.log("🔍 setSelectedPackData function:", typeof setSelectedPackData);

    // [중요] 함수 존재 여부 확인
    if (typeof setSelectedPackData !== "function") {
      console.error("❌ setSelectedPackData is not a function!");
      console.error(
        "Available store methods:",
        Object.keys(useAppStore.getState())
      );
      alert("앱 상태 오류가 발생했습니다. 페이지를 새로고침해주세요.");
      return;
    }

    try {
      setSelectedPackData(packData);
      console.log("✅ Pack selected successfully");
      navigate("/calendar");
    } catch (error) {
      console.error("❌ Error selecting pack:", error);
      alert("학습팩 선택 중 오류가 발생했습니다.");
    }
  };

  const handleLogout = () => {
    if (typeof logout === "function") {
      logout();
      navigate("/", { replace: true });
    } else {
      console.error("❌ logout is not a function!");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-700">
            로그인이 필요합니다...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft size={18} />
              뒤로가기
            </button>

            <h1 className="text-xl font-bold text-slate-900">학습팩 선택</h1>

            <div className="flex items-center gap-4">
              {user && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <User size={16} />
                  <span>{user.name}</span>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            학습할 팩을 선택하세요
          </h2>
          <p className="text-slate-600">
            각 팩은 체계적인 학습 계획과 다양한 학습 모드를 제공합니다.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Real VOCA Basic 팩 */}
          <div
            onClick={() => handlePackSelect(realVocaBasicData as PackData)}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-indigo-300 group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition-colors">
                <BookOpen className="w-6 h-6 text-indigo-600" />
              </div>
              <span className="text-sm text-slate-500">기초</span>
            </div>

            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {realVocaBasicData.title}
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              {realVocaBasicData.subtitle}
            </p>

            <div className="flex items-center gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{realVocaBasicData.totalDays}일 과정</span>
              </div>
              <div className="flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                <span>기초 레벨</span>
              </div>
            </div>
          </div>

          {/* 다른 팩들을 위한 플레이스홀더 */}
          <div className="bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 p-6 flex flex-col items-center justify-center text-center">
            <div className="p-3 bg-slate-200 rounded-lg mb-4">
              <BookOpen className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-500 mb-2">
              새로운 팩
            </h3>
            <p className="text-sm text-slate-400">곧 추가될 예정입니다</p>
          </div>
        </div>
      </main>
    </div>
  );
}
