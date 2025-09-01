// src/pages/packs/index.tsx
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePackStore } from "@/stores/packStore";
import { useDailyPlanStore } from "@/stores/dailyPlanStore";
import { BookOpen, Clock, Star, ChevronRight } from "lucide-react";

export const PacksPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    availablePacks,
    selectedPack,
    isLoading,
    error,
    loadAvailablePacks,
    selectPack,
  } = usePackStore();

  const { initializePlan } = useDailyPlanStore();

  useEffect(() => {
    loadAvailablePacks();
  }, [loadAvailablePacks]);

  const handleSelectPack = async (packId: string) => {
    try {
      await selectPack(packId);

      const pack = availablePacks.find((p) => p.id === packId);
      if (pack) {
        initializePlan(pack.id, pack.title, pack.items);
        navigate("/app/learn");
      }
    } catch (error) {
      console.error("Failed to select pack:", error);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "basic":
        return "bg-green-100 text-green-800";
      case "intermediate":
        return "bg-blue-100 text-blue-800";
      case "advanced":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">학습팩을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">❌</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            오류가 발생했습니다
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadAvailablePacks}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* 헤더 */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            📚 학습팩 선택
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            원하는 학습팩을 선택하여 14일 학습 여정을 시작하세요. 각 팩은
            체계적으로 구성되어 효과적인 학습을 도와줍니다.
          </p>
        </div>

        {/* 현재 선택된 팩 */}
        {selectedPack && (
          <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Star className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-900">
                현재 선택: {selectedPack.title}
              </span>
              <button
                onClick={() => navigate("/app/learn")}
                className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                학습 계속하기
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* 팩 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availablePacks.map((pack) => (
            <div
              key={pack.id}
              className={`bg-white rounded-xl p-6 shadow-sm border transition-all duration-200 hover:shadow-md cursor-pointer ${
                selectedPack?.id === pack.id
                  ? "border-blue-500 ring-2 ring-blue-200"
                  : "border-gray-200 hover:border-gray-300"
              }`}
              onClick={() => handleSelectPack(pack.id)}
            >
              {/* 팩 커버 */}
              <div className="h-40 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg mb-4 flex items-center justify-center">
                <BookOpen className="w-16 h-16 text-blue-500" />
              </div>

              {/* 팩 정보 */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {pack.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {pack.description}
                  </p>
                </div>

                {/* 메타 정보 */}
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    <span>{pack.totalItems}개</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{pack.estimatedDays}일</span>
                  </div>
                </div>

                {/* 레벨 배지 */}
                <div className="flex items-center justify-between">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getLevelColor(
                      pack.level
                    )}`}
                  >
                    {pack.level.toUpperCase()}
                  </span>

                  {selectedPack?.id === pack.id && (
                    <div className="text-blue-600 text-sm font-medium">
                      ✓ 선택됨
                    </div>
                  )}
                </div>

                {/* 태그들 */}
                <div className="flex flex-wrap gap-2">
                  {pack.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 빈 상태 */}
        {availablePacks.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              사용 가능한 학습팩이 없습니다
            </h3>
            <p className="text-gray-600">
              새로운 학습팩이 곧 추가될 예정입니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// 🔥 learn/index.tsx와 동일한 export 방식
export default PacksPage;
