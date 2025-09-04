// src/components/MainLayout.tsx
import React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Home,
  BookOpen,
  Calendar,
  User,
  LogOut,
} from "lucide-react";
import { useAppStore } from "@/stores/appStore";

export function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, selectedPackData, currentDay } = useAppStore();

  const isStudyPage = ["/vocabulary", "/sentences", "/workbook"].some((path) =>
    location.pathname.includes(path)
  );

  const getPageTitle = () => {
    if (location.pathname.includes("/vocabulary")) return "단어 학습";
    if (location.pathname.includes("/sentences")) return "문장 학습";
    if (location.pathname.includes("/workbook")) return "워크북";
    if (location.pathname.includes("/calendar")) return "학습 달력";
    if (location.pathname.includes("/packs")) return "팩 선택";
    return "Real VOCA";
  };

  return (
    <div className="bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {isStudyPage && (
                <button
                  onClick={() => navigate("/calendar")}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
              )}
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {getPageTitle()}
                </h1>
                {selectedPackData && (
                  <p className="text-sm text-gray-500">
                    {selectedPackData.title} - Day {currentDay}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {user && (
                <>
                  <span className="text-sm text-gray-600">{user.name}</span>
                  <button
                    onClick={logout}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <LogOut className="w-5 h-5 text-gray-600" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main>
        <Outlet />
      </main>

      {/* 하단 네비게이션 (학습 페이지에서만 표시) */}
      {isStudyPage && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-pb">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-center justify-around py-2">
              <button
                onClick={() => navigate("/vocabulary")}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-colors ${
                  location.pathname.includes("/vocabulary")
                    ? "text-blue-600 bg-blue-50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <BookOpen className="w-5 h-5" />
                <span className="text-xs font-medium">단어</span>
              </button>

              <button
                onClick={() => navigate("/sentences")}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-colors ${
                  location.pathname.includes("/sentences")
                    ? "text-green-600 bg-green-50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <BookOpen className="w-5 h-5" />
                <span className="text-xs font-medium">문장</span>
              </button>

              <button
                onClick={() => navigate("/workbook")}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-colors ${
                  location.pathname.includes("/workbook")
                    ? "text-purple-600 bg-purple-50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <BookOpen className="w-5 h-5" />
                <span className="text-xs font-medium">퀴즈</span>
              </button>

              <button
                onClick={() => navigate("/calendar")}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-colors ${
                  location.pathname.includes("/calendar")
                    ? "text-orange-600 bg-orange-50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <Calendar className="w-5 h-5" />
                <span className="text-xs font-medium">달력</span>
              </button>
            </div>
          </div>
        </nav>
      )}
    </div>
  );
}
