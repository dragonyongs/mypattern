// src/shared/components/RequirePack.tsx
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useCurrentPack } from "@/shared/hooks/useAppHooks";
import { logger } from "@/shared/utils/logger";

interface RequirePackProps {
  children: React.ReactNode;
}

export const RequirePack: React.FC<RequirePackProps> = ({ children }) => {
  const currentPack = useCurrentPack();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // 🎯 Pack 상태 확인을 위한 지연
    const timer = setTimeout(() => {
      setIsChecking(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      logger.log(
        "RequirePack - Current pack:",
        currentPack?.title || "No pack selected"
      );
    }
  }, [currentPack]);

  // 로딩 상태
  if (isChecking) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">잠시만 기다려주세요...</p>
        </div>
      </div>
    );
  }

  // 🎯 학습팩 없음 → 팩 선택 페이지로 리다이렉트
  if (!currentPack) {
    return <Navigate to="/app/packs" replace />;
  }

  // 🎯 학습팩 있음 → 자식 컴포넌트 렌더링
  return <>{children}</>;
};
