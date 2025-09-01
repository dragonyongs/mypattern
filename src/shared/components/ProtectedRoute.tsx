import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

export function ProtectedRoute({
  children,
  requireAuth = true,
}: {
  children: React.ReactNode;
  requireAuth?: boolean;
}) {
  const { isAuthenticated, loading } = useAuthStore();
  const location = useLocation();

  if (loading) return <div className="p-6">Loading...</div>;
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/landing" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}
