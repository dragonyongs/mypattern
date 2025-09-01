import React, { useState } from "react";
import { Loader2, LogIn } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useNavigate } from "react-router-dom";

export function LandingPage() {
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    try {
      setIsLoggingIn(true);
      await login(); // 더미 로그인(Zustand persist)
      navigate("/app", { replace: true }); // 이후 AppHomeRedirect가 분기
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center">
      <div className="max-w-xl w-full p-8">
        <h1 className="text-2xl font-bold mb-4">리얼 보카로 시작하기</h1>
        <p className="text-gray-600 mb-6">
          암기가 아닌 패턴과 어휘를 함께 체화하는 학습을 시작하세요.
        </p>
        <button
          onClick={handleLogin}
          disabled={isLoggingIn}
          className="inline-flex items-center gap-2 px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60"
        >
          {isLoggingIn ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LogIn className="size-4" />
          )}
          구글 계정으로 시작(더미)
        </button>
      </div>
    </div>
  );
}

export default LandingPage;
