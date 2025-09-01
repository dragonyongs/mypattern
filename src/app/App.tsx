// src/app/App.tsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "@/providers/AppProvider";
import { MainLayout } from "@/app/layouts/MainLayout";
import { LandingPage } from "@/pages/LandingPage";
import { ProtectedRoute } from "@/shared/components/ProtectedRoute";
import { RequirePack } from "@/shared/components/RequirePack";

// 기본 페이지들
const PacksPage = React.lazy(() => import("@/pages/packs"));
const LearnPage = React.lazy(() => import("@/pages/learn"));
const ReviewPage = React.lazy(() => import("@/pages/review"));
const SettingsPage = React.lazy(() => import("@/pages/settings"));

// 학습 단계별 페이지들
const FlashcardPage = React.lazy(() => import("@/pages/learn/FlashcardPage"));
const OverviewPage = React.lazy(() => import("@/pages/learn/OverviewPage"));
const PronunciationPage = React.lazy(
  () => import("@/pages/learn/PronunciationPage")
);
const DictationPage = React.lazy(() => import("@/pages/learn/DictationPage"));

// 팩 관련 페이지들
const PackDetails = React.lazy(() => import("@/pages/packs/PackDetails"));
const PackComparison = React.lazy(() => import("@/pages/packs/PackComparison"));
const PackSettings = React.lazy(() => import("@/pages/packs/PackSettings"));

export default function App() {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <AppProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/landing" element={<LandingPage />} />

            <Route
              path="/app"
              element={
                <ProtectedRoute requireAuth>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              {/* 🔥 기본 라우트를 packs로 변경 */}
              <Route index element={<Navigate to="packs" replace />} />

              {/* 메인 학습 대시보드 */}
              <Route path="learn" element={<LearnPage />} />

              {/* 🔥 학습 단계별 라우트를 먼저 배치 */}
              <Route
                path="learn/flashcard"
                element={
                  <RequirePack>
                    <FlashcardPage />
                  </RequirePack>
                }
              />
              <Route
                path="learn/overview"
                element={
                  <RequirePack>
                    <OverviewPage />
                  </RequirePack>
                }
              />
              <Route
                path="learn/pronunciation"
                element={
                  <RequirePack>
                    <PronunciationPage />
                  </RequirePack>
                }
              />
              <Route
                path="learn/dictation"
                element={
                  <RequirePack>
                    <DictationPage />
                  </RequirePack>
                }
              />

              {/* 팩 관련 라우트들 */}
              <Route path="packs" element={<PacksPage />} />

              {/* 🔥 정적 라우트를 동적 라우트보다 먼저 배치 */}
              <Route path="packs/comparison" element={<PackComparison />} />
              <Route path="packs/settings" element={<PackSettings />} />
              <Route path="packs/:packId" element={<PackDetails />} />

              <Route path="review" element={<ReviewPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* 🔥 모든 잘못된 경로는 packs로 리다이렉트 */}
            <Route path="*" element={<Navigate to="/app/packs" replace />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </React.Suspense>
  );
}
