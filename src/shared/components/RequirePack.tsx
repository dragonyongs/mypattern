// src/shared/components/RequirePack.tsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

export function RequirePack({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();
  const location = useLocation();

  if (loading) return <div className="p-6">Loading...</div>;
  if (!user?.selectedPackId) {
    return <Navigate to="/app/packs" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}
export default RequirePack;
