// src/shared/components/RequirePack.tsx
import React, { useEffect, useState, useRef } from "react";
import { Navigate } from "react-router-dom";
import { useDailyPlan } from "@/shared/hooks";
import { logger, safeStringify } from "@/shared/utils/logger";

interface RequirePackProps {
  children: React.ReactNode;
}

export const RequirePack: React.FC<RequirePackProps> = ({ children }) => {
  const { currentPlan } = useDailyPlan();
  const [isChecking, setIsChecking] = useState(true);
  const hasInitialized = useRef(false);

  useEffect(() => {
    // 🔥 첫 번째 실행에서만 타이머 설정
    if (!hasInitialized.current) {
      const timer = setTimeout(() => {
        setIsChecking(false);
        hasInitialized.current = true;
      }, 100);

      return () => clearTimeout(timer);
    }
  }, []); // 🔥 의존성 배열을 빈 배열로 변경

  // 🔥 개발 모드에서만 로그 출력
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      logger.log(
        "RequirePack initialized",
        safeStringify({ hasCurrentPlan: !!currentPlan })
      );
    }
  }, [currentPlan, isChecking]); // 올바른 의존성 배열

  // 로딩 상태
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p>잠시만 기다려주세요...</p>
        </div>
      </div>
    );
  }

  // 학습팩 없음 → 팩 선택 페이지로 리다이렉트
  if (!currentPlan) {
    return <Navigate to="/app/packs" replace />;
  }

  // 학습팩 있음 → 자식 컴포넌트 렌더링
  return <>{children}</>;
};
