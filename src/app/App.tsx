// src/app/App.tsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "@/providers/AppProvider";
import { MainLayout } from "@/app/layouts/MainLayout";
import { LandingPage } from "@/pages/LandingPage";
import { ProtectedRoute } from "@/shared/components/ProtectedRoute";
import { RequirePack } from "@/shared/components/RequirePack";
import { useAuthStore } from "@/stores/authStore";

const PacksPage = React.lazy(() => import("@/pages/PacksPage"));
const LearnPage = React.lazy(() => import("@/pages/LearnPage"));
const ReviewPage = React.lazy(() => import("@/pages/ReviewPage"));
const SettingsPage = React.lazy(() => import("@/pages/SettingsPage"));

function AppHomeRedirect() {
  const { user, loading, isAuthenticated } = useAuthStore();

  // ✅ 내장 hasHydrated 메서드로 재수화 완료 체크
  const hasHydrated = useAuthStore.persist.hasHydrated();

  if (!hasHydrated || loading) return <div className="p-6">Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/landing" replace />;

  const to = user?.selectedPackId ? "/app/learn/day/1" : "/app/packs";
  return <Navigate to={to} replace />;
}

export default function App() {
  return (
    <React.Suspense fallback={<div className="p-6">Loading...</div>}>
      <AppProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/landing" element={<LandingPage />} />
            <Route
              path="/app/*"
              element={
                <ProtectedRoute requireAuth>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AppHomeRedirect />} />
              <Route path="packs" element={<PacksPage />} />
              <Route
                path="learn"
                element={
                  <RequirePack>
                    <LearnPage />
                  </RequirePack>
                }
              />
              <Route
                path="learn/day/:day"
                element={
                  <RequirePack>
                    <LearnPage />
                  </RequirePack>
                }
              />
              <Route
                path="review"
                element={
                  <RequirePack>
                    <ReviewPage />
                  </RequirePack>
                }
              />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/landing" replace />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </React.Suspense>
  );
}
