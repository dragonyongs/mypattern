// src/App.tsx - 깔끔한 구조로 수정
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAppStore } from "@/stores/appStore";

import { LandingPage } from "@/pages/LandingPage";
import PackSelectPage from "@/pages/PackSelectPage";
import CalendarPage from "@/pages/CalendarPage";
import { StudyInterface } from "@/components/StudyInterface";
import { MainLayout } from "@/components/MainLayout";

// StudyPage 컴포넌트
function StudyPage() {
  const { selectedPackData, currentDay } = useAppStore();
  const [currentMode, setCurrentMode] = React.useState<
    "vocab" | "sentence" | "workbook"
  >("vocab");

  if (!selectedPackData) {
    return <Navigate to="/packs" replace />;
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
                <Route path="/packs" element={<PackSelectPage />} />
                <Route path="*" element={<Navigate to="/packs" replace />} />
              </>
            )}

            {/* 팩 선택된 사용자 */}
            {selectedPackId && (
              <Route path="/" element={<MainLayout />}>
                <Route index element={<Navigate to="/calendar" replace />} />
                <Route path="calendar" element={<CalendarPage />} />
                <Route path="study/:day" element={<StudyPage />} />
                <Route path="*" element={<Navigate to="/calendar" replace />} />
              </Route>
            )}
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
