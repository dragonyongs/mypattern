// src/App.tsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAppStore } from "@/stores/appStore";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LandingPage } from "@/pages/LandingPage";
import PackSelectPage from "@/pages/PackSelectPage";
import CalendarPage from "@/pages/CalendarPage";
import { StudyInterface } from "@/components/StudyInterface";
import { useParams } from "react-router-dom";
import { useHydration } from "@/hooks/useHydration";

function StudyPage() {
  const selectedPackData = useAppStore((state) => state.selectedPackData);
  const { day } = useParams<{ day: string }>();

  if (!selectedPackData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800">
            학습팩이 선택되지 않았습니다
          </h2>
          <p className="text-gray-500 mt-2">먼저 학습팩을 선택해주세요.</p>
          <button
            onClick={() => (window.location.href = "/pack-select")}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg"
          >
            학습팩 선택하기
          </button>
        </div>
      </div>
    );
  }

  if (!selectedPackData.id) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800">
            학습팩 데이터 오류
          </h2>
          <p className="text-gray-500 mt-2">
            올바르지 않은 학습팩 데이터입니다.
          </p>
          <button
            onClick={() => (window.location.href = "/pack-select")}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg"
          >
            학습팩 다시 선택하기
          </button>
        </div>
      </div>
    );
  }

  return <StudyInterface />;
}

function App() {
  const hydrated = useHydration();

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-700">앱 초기화 중...</p>
          <p className="text-sm text-gray-500 mt-2">
            학습 데이터를 불러오고 있습니다
          </p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/pack-select" element={<PackSelectPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/study/:day" element={<StudyPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
