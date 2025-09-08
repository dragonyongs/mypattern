// src/pages/LandingPage.tsx
import React, { useState, useEffect, useCallback } from "react";
import { Loader2, LogIn } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { useNavigate } from "react-router-dom";

export function LandingPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, loading } = useAppStore();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false); // [추가] 네비게이션 방지 플래그

  // [수정] navigate를 useCallback으로 메모이제이션하여 안정적인 참조 생성
  const navigateToPackSelect = useCallback(() => {
    if (!hasNavigated) {
      console.log("🔄 Navigating to pack selection...");
      setHasNavigated(true);
      navigate("/pack-select", { replace: true });
    }
  }, [navigate, hasNavigated]);

  // [수정] 의존성 배열에서 navigate 제거, 조건부 실행으로 무한 루프 방지
  useEffect(() => {
    console.log(
      "🔍 LandingPage useEffect - isAuthenticated:",
      isAuthenticated,
      "hasNavigated:",
      hasNavigated
    );

    if (isAuthenticated && !hasNavigated) {
      // 약간의 지연을 두어 상태 안정화
      const timeoutId = setTimeout(() => {
        navigateToPackSelect();
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [isAuthenticated, navigateToPackSelect]); // [중요] navigate 대신 메모이제이션된 함수 사용

  const handleLogin = async () => {
    try {
      setIsLoggingIn(true);
      await login();
      // 로그인 성공 후 자동 이동은 useEffect에서 처리
    } catch (error) {
      console.error("Login failed:", error);
      setHasNavigated(false); // 실패 시 네비게이션 플래그 리셋
    } finally {
      setIsLoggingIn(false);
    }
  };

  // [추가] 로딩 중 표시
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">앱을 초기화하고 있습니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Real VOCA</h1>
          <p className="text-gray-600 text-sm leading-relaxed">
            암기가 아닌 패턴과 어휘를 함께
            <br />
            체화하는 학습을 시작하세요.
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleLogin}
            disabled={isLoggingIn || isAuthenticated}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            {isLoggingIn ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <LogIn className="w-5 h-5" />
            )}
            {isLoggingIn ? "로그인 중..." : "데모 로그인"}
          </button>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-amber-800 text-sm text-center">
              <strong>현재는 데모 버전입니다.</strong>
              <br />
              나중에 구글 OAuth 로그인이 추가될 예정입니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
