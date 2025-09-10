// src/App.tsx
import React, { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useParams } from "react-router-dom";
import { useAppStore } from "@/stores/appStore";
import { useStudyProgressStore } from "@/stores/studyProgressStore";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LandingPage } from "@/pages/LandingPage";
import PackSelectPage from "@/pages/PackSelectPage";
import CalendarPage from "@/pages/CalendarPage";
import { StudyInterface } from "@/components/StudyInterface";
import { useHydration } from "@/hooks/useHydration";
import BottomAppBar from "@/shared/components/BottomAppBar";

// 학습 상세 라우트 가드 (기존 유지)
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

// 전역 모바일 하단 내비 컨트롤러
function MobileNavController() {
  const selectedPackData = useAppStore((s) => s.selectedPackData);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const isStudy = pathname.startsWith("/study");
  const current = pathname.startsWith("/pack-select")
    ? "packs"
    : pathname.startsWith("/calendar")
    ? "calendar"
    : undefined;

  const goPacks = () =>
    navigate("/pack-select", { replace: current === "packs" });
  const goCalendar = () => {
    if (selectedPackData)
      navigate("/calendar", { replace: current === "calendar" });
    else navigate("/pack-select");
  };
  const openSettings = () => {
    if (!isStudy) return;
    window.dispatchEvent(new CustomEvent("open-study-settings"));
  };

  // BottomAppBar는 내부에서 lg:hidden이므로 모바일 전용으로 보임
  return (
    <BottomAppBar
      onGoPacks={goPacks}
      onGoCalendar={goCalendar}
      onOpenSettings={openSettings}
      current={current}
      showSettings={isStudy}
    />
  );
}

function App() {
  const hydrated = useHydration();
  const { selectedPackData, _hasHydrated: appHydrated } = useAppStore();
  const { validateProgressForContent, _hasHydrated: progressHydrated } =
    useStudyProgressStore();

  // 두 store 모두 hydration 후 진행 상황 검증
  useEffect(() => {
    if (appHydrated && progressHydrated && selectedPackData?.contents) {
      const contentIds = selectedPackData.contents.map((item) => item.id);
      validateProgressForContent(selectedPackData.id, contentIds);
      console.log(`✅ Progress validated for ${selectedPackData.id}`);
    }
  }, [
    appHydrated,
    progressHydrated,
    selectedPackData,
    validateProgressForContent,
  ]);

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

        {/* 전역 모바일 하단 앱바 */}
        <MobileNavController />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
