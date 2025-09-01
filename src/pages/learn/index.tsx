// src/pages/learn/index.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DailyPlanCard } from "@/features/daily-plan/ui/DailyPlanCard";
import { useDailyPlan } from "@/shared/hooks";
import { usePackStore } from "@/stores/packStore";
import { BookOpen } from "lucide-react";

export const LearnPage: React.FC = () => {
  const navigate = useNavigate();
  const { todayLesson, currentPlan } = useDailyPlan();
  const { selectedPack } = usePackStore();
  const [isChecking, setIsChecking] = useState(true);

  // 🔥 데이터 상태 확인 및 자동 리다이렉트
  useEffect(() => {
    const checkDataAndRedirect = () => {
      console.log("🔥 LearnPage data check:", {
        selectedPack: !!selectedPack,
        currentPlan: !!currentPlan,
        todayLesson: !!todayLesson,
      });

      // 팩도 없고 학습 계획도 없는 경우
      if (!selectedPack && !currentPlan) {
        console.log("🔥 No pack and no plan, redirecting to packs");
        navigate("/app/packs", { replace: true });
        return;
      }

      // 체킹 완료
      setIsChecking(false);
    };

    // persist 데이터 복원을 위한 지연
    const timer = setTimeout(checkDataAndRedirect, 500);

    return () => clearTimeout(timer);
  }, [selectedPack, currentPlan, todayLesson, navigate]);

  // 🔥 로딩 중이거나 데이터가 없는 경우
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">학습 데이터를 불러오는 중...</p>
          <p className="text-gray-500 text-sm mt-2">잠시만 기다려 주세요.</p>
        </div>
      </div>
    );
  }

  // 🔥 데이터가 여전히 없는 경우 (fallback)
  if (!todayLesson && !currentPlan) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            학습 계획이 없습니다.
          </h3>
          <p className="text-gray-500 mb-6">먼저 학습할 팩을 선택해주세요.</p>
          <button
            onClick={() => navigate("/app/packs")}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            팩 선택하러 가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <DailyPlanCard />
    </div>
  );
};

export default LearnPage;
