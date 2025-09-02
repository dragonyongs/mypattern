// src/pages/LandingPage.tsx - 기존 UI 유지, AppStore 연동
import React, { useState, useEffect } from "react";
import { Loader2, LogIn } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { useNavigate } from "react-router-dom";

export function LandingPage() {
  const { login, isAuthenticated, loading } = useAppStore();
  const navigate = useNavigate();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // 이미 로그인되어 있으면 팩 선택으로 이동
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/packs", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async () => {
    try {
      setIsLoggingIn(true);
      await login(); // Zustand 더미 로그인
      // 로그인 성공 후 자동으로 팩 선택으로 이동 (useEffect에서 처리)
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <LogIn className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Real VOCA</h1>
          <p className="text-gray-600 leading-relaxed">
            암기가 아닌 패턴과 어휘를 함께
            <br />
            체화하는 학습을 시작하세요.
          </p>
        </div>

        <button
          onClick={handleLogin}
          disabled={isLoggingIn || loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {isLoggingIn || loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              로그인 중...
            </>
          ) : (
            <>
              <LogIn className="w-5 h-5" />
              학습 시작하기
            </>
          )}
        </button>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            현재는 데모 버전입니다.
            <br />
            나중에 구글 OAuth 로그인이 추가될 예정입니다.
          </p>
        </div>
      </div>
    </div>
  );
}
