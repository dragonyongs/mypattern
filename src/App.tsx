// src/App.tsx - 수정된 버전
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAppStore } from "@/stores/appStore";
import { LandingPage } from "@/pages/LandingPage";
import PackSelectPage from "@/pages/PackSelectPage";
import CalendarPage from "@/pages/CalendarPage";
import { StudyInterface } from "@/components/StudyInterface";
import { useParams } from "react-router-dom";
// import { MainLayout } from "@/components/MainLayout";

// ✅ 수정: StudyPage 컴포넌트에서 useParams 사용
function StudyPage() {
  const { selectedPackData } = useAppStore();
  const { day } = useParams<{ day: string }>(); // ✅ URL 파라미터에서 day 가져오기
  const [currentMode, setCurrentMode] = React.useState<
    "vocab" | "sentence" | "workbook"
  >("vocab");

  const currentDay = day ? parseInt(day, 10) : 1;

  if (!selectedPackData) {
    return <Navigate to="/pack-select" replace />;
  }

  return (
    <StudyInterface
      pack={selectedPackData}
      currentDay={currentDay}
      currentMode={currentMode}
      onModeChange={setCurrentMode}
    />
  );
}

function App() {
  const { isAuthenticated, selectedPackId } = useAppStore();

  return (
    <BrowserRouter>
      <Routes>
        {/* 인증 안된 사용자 */}
        {!isAuthenticated && <Route path="*" element={<LandingPage />} />}

        {/* 인증된 사용자 */}
        {isAuthenticated && (
          <>
            {/* 팩 선택 안된 사용자 */}
            {!selectedPackId && (
              <>
                <Route
                  path="/"
                  element={<Navigate to="/pack-select" replace />}
                />
                <Route path="/pack-select" element={<PackSelectPage />} />
                <Route
                  path="*"
                  element={<Navigate to="/pack-select" replace />}
                />
              </>
            )}

            {/* 팩 선택된 사용자 */}
            {selectedPackId && (
              <>
                <Route path="/" element={<Navigate to="/calendar" replace />} />
                <Route path="/calendar" element={<CalendarPage />} />
                {/* ✅ 수정: 동적 파라미터 추가 */}
                <Route path="/study/:day" element={<StudyPage />} />
                <Route
                  path="/study"
                  element={<Navigate to="/study/1" replace />}
                />
                <Route path="*" element={<Navigate to="/calendar" replace />} />
              </>
            )}
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
