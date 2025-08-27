import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth: boolean;
  requireOnboarding: boolean;
}

export function ProtectedRoute({
  children,
  requireAuth,
  requireOnboarding,
}: ProtectedRouteProps) {
  const { state } = useAuth();

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // 인증이 필요한데 로그인하지 않은 경우
  if (requireAuth && !state.isAuthenticated) {
    return <Navigate to="/landing" replace />;
  }

  // 로그인했는데 랜딩 페이지에 있는 경우
  if (state.isAuthenticated && window.location.pathname === "/landing") {
    if (!state.user?.onboardingCompleted) {
      return <Navigate to="/onboarding/level-test" replace />;
    }
    return <Navigate to="/" replace />;
  }

  // 온보딩이 필요한데 완료하지 않은 경우
  if (requireOnboarding && state.user && !state.user.onboardingCompleted) {
    return <Navigate to="/onboarding/level-test" replace />;
  }

  return <>{children}</>;
}
