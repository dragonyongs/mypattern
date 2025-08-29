import React, { useState, useEffect } from "react";
import { BookOpen, Zap, Target, Globe, Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useNavigate } from "react-router-dom";

export function LandingPage() {
  const { login, user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    try {
      setIsLoggingIn(true);
      console.log("로그인 시작");

      await login();

      console.log("로그인 완료, 온보딩 페이지로 이동");

      // 상태 업데이트 후 약간의 딜레이를 주고 navigate 실행
      setTimeout(() => {
        console.log("🚀 navigate 실행 시도");
        navigate("/onboarding/level-test", { replace: true });
      }, 100);
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const features = [
    {
      icon: BookOpen,
      title: "패턴 기반 학습",
      description: "원어민이 실제 사용하는 문장 패턴으로 학습하세요",
    },
    {
      icon: Zap,
      title: "즉시 피드백",
      description: "실시간으로 발음과 문법을 체크해드려요",
    },
    {
      icon: Target,
      title: "개인화 학습",
      description: "당신의 관심사와 수준에 맞춘 맞춤형 커리큘럼",
    },
    {
      icon: Globe,
      title: "실용적 회화",
      description: "실제 상황에서 바로 사용할 수 있는 영어 표현",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* 헤더 */}
      <header className="px-4 py-6">
        <div className="max-w-sm mx-auto text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">MyPattern</h1>
          <p className="text-gray-600">영어 패턴으로 자신감 있게 말하기</p>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="px-4 pb-8">
        <div className="max-w-sm mx-auto">
          {/* 히어로 섹션 */}
          <div className="text-center mb-8">
            <div className="bg-blue-500 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
              <BookOpen className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              2주 만에 영어로 말하는 자신감
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              암기가 아닌 패턴으로 배우는 새로운 영어 학습법. 원어민이 실제
              사용하는 표현을 체화하여 자연스럽게 말해보세요.
            </p>
          </div>

          {/* 특징 */}
          <div className="space-y-4 mb-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="bg-white rounded-lg p-4 shadow-sm border border-gray-100"
                >
                  <div className="flex items-start space-x-3">
                    <div className="bg-blue-100 rounded-lg p-2 flex-shrink-0">
                      <Icon className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 mb-1">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTA 버튼 */}
          <div className="space-y-3">
            <button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>로그인 중...</span>
                </>
              ) : (
                <span>무료로 시작하기</span>
              )}
            </button>
            <p className="text-xs text-gray-500 text-center">
              구글 계정으로 간편하게 시작하세요
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
