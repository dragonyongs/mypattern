// src/pages/PackSelectPage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Book,
  Clock,
  Star,
  CheckCircle,
  AlertCircle,
  RefreshCcw,
  Loader2,
} from "lucide-react";

import { useAppStore } from "@/stores/appStore";
import { useAvailablePacks } from "@/shared/hooks/usePackData";
import { useStudyProgressStore } from "@/stores/studyProgressStore";
import type { PackMetadata } from "@/shared/hooks/usePackData";

const PackSelectPage: React.FC = () => {
  const navigate = useNavigate();

  // 🔥 새로운 동적 훅 사용
  const { packs, loading, error, refetch } = useAvailablePacks();

  const {
    selectedPackData,
    loadPackById,
    setCurrentDay,
    isAuthenticated,
    _hasHydrated,
  } = useAppStore();

  const { getPackProgress } = useStudyProgressStore();

  const [selecting, setSelecting] = useState<string | null>(null);

  // 팩 선택 핸들러
  const handlePackSelect = async (packId: string) => {
    if (selecting) return; // 중복 선택 방지

    try {
      setSelecting(packId);
      console.log(`🎯 Selecting pack: ${packId}`);

      // 팩 데이터 로드
      const packData = await loadPackById(packId);

      if (packData) {
        // 진행 상황 확인하여 적절한 날짜로 이동
        const progress = getPackProgress(packId);
        const targetDay = progress?.lastStudiedDay || 1;

        setCurrentDay(targetDay);
        console.log(`📅 Moving to Day ${targetDay}`);
        navigate("/calendar");
      } else {
        throw new Error("팩 데이터를 로드할 수 없습니다");
      }
    } catch (err) {
      console.error("❌ Pack selection failed:", err);
      alert(err instanceof Error ? err.message : "팩 선택에 실패했습니다");
    } finally {
      setSelecting(null);
    }
  };

  // 진행률 계산
  const getPackProgressInfo = (packId: string, totalDays: number) => {
    const progress = getPackProgress(packId);
    if (!progress) return { completedDays: 0, percentage: 0, lastDay: 1 };

    const completedDays = progress.completedDaysCount || 0;
    const percentage = Math.round((completedDays / totalDays) * 100);
    const lastDay = progress.lastStudiedDay || 1;

    return { completedDays, percentage, lastDay };
  };

  // 레벨별 색상
  const getLevelColor = (level?: string) => {
    switch (level) {
      case "beginner":
        return "bg-green-100 text-green-700";
      case "intermediate":
        return "bg-yellow-100 text-yellow-700";
      case "advanced":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  // 로딩 상태
  if (!_hasHydrated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">앱 데이터 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-4" />
          <p className="text-gray-600">로그인이 필요합니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* 헤더 */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate("/")}
            className="p-2 hover:bg-white/50 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              학습할 팩을 선택하세요
            </h1>
            <p className="text-gray-600 mt-1">
              각 팩은 체계적인 학습 계획과 다양한 학습 모드를 제공합니다.
            </p>
          </div>
        </div>

        {/* 로딩 상태 */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
              <p className="text-gray-600">학습팩을 불러오고 있습니다...</p>
            </div>
          </div>
        )}

        {/* 에러 상태 */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <h3 className="font-medium text-red-900">오류 발생</h3>
            </div>
            <p className="text-red-700 mb-4">{error}</p>
            <div className="text-sm text-red-600 mb-4">
              <p>• src/data/packs/registry.json 파일이 올바른지 확인해주세요</p>
              <p>• 해당 폴더에 JSON 팩 파일들이 있는지 확인해주세요</p>
              <p>• 로드된 팩 수: {packs?.length || 0}</p>
            </div>
            <button
              onClick={refetch}
              className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
            >
              <RefreshCcw className="w-4 h-4" />
              다시 시도
            </button>
          </div>
        )}

        {/* 팩이 없는 경우 */}
        {!loading && !error && packs.length === 0 && (
          <div className="text-center py-12">
            <Book className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              표시할 학습팩이 없습니다
            </h3>
            <p className="text-gray-600 mb-4">
              src/data/packs 폴더에 JSON 팩 파일을 추가해 주세요.
            </p>
            <div className="text-sm text-gray-500">
              로드된 팩 수: {packs?.length || 0}
            </div>
            <button
              onClick={refetch}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg transition-colors mx-auto"
            >
              <RefreshCcw className="w-4 h-4" />
              새로고침
            </button>
          </div>
        )}

        {/* 팩 목록 */}
        {!loading && packs.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2">
            {packs.map((pack) => {
              const progressInfo = getPackProgressInfo(pack.id, pack.totalDays);
              const isSelected = selectedPackData?.id === pack.id;
              const isSelecting = selecting === pack.id;

              return (
                <div
                  key={pack.id}
                  className={`
                    bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden border-2
                    ${
                      isSelected
                        ? "border-indigo-500"
                        : "border-transparent hover:border-indigo-200"
                    }
                    ${isSelecting ? "opacity-75" : ""}
                  `}
                >
                  {/* 진행률 바 */}
                  {progressInfo.percentage > 0 && (
                    <div className="h-1 bg-gray-200">
                      <div
                        className="h-1 bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-500"
                        style={{ width: `${progressInfo.percentage}%` }}
                      />
                    </div>
                  )}

                  <div className="p-6">
                    {/* 헤더 */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          {pack.title || "제목 없음"}
                        </h3>
                        <p className="text-gray-600 text-sm leading-relaxed">
                          {pack.subtitle || pack.description || "설명 없음"}
                        </p>
                      </div>

                      {isSelected && (
                        <CheckCircle className="w-6 h-6 text-indigo-500 ml-4 flex-shrink-0" />
                      )}
                    </div>

                    {/* 메타 정보 */}
                    <div className="flex items-center gap-4 mb-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{pack.totalDays}일 과정</span>
                      </div>

                      {pack.level && (
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(
                            pack.level
                          )}`}
                        >
                          {pack.level === "beginner"
                            ? "초급"
                            : pack.level === "intermediate"
                            ? "중급"
                            : "고급"}
                        </span>
                      )}
                    </div>

                    {/* 태그 */}
                    {pack.tags && pack.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {pack.tags.slice(0, 3).map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* 진행 상황 */}
                    {progressInfo.percentage > 0 && (
                      <div className="mb-4 p-3 bg-indigo-50 rounded-lg">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-indigo-700 font-medium">
                            진행률: {progressInfo.percentage}%
                          </span>
                          <span className="text-indigo-600">
                            {progressInfo.completedDays}/{pack.totalDays}일 완료
                          </span>
                        </div>
                        <div className="text-xs text-indigo-600 mt-1">
                          마지막 학습: Day {progressInfo.lastDay}
                        </div>
                      </div>
                    )}

                    {/* 선택 버튼 */}
                    <button
                      onClick={() => handlePackSelect(pack.id)}
                      disabled={isSelecting}
                      className={`
                        w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200
                        ${
                          isSelected
                            ? "bg-indigo-600 text-white hover:bg-indigo-700"
                            : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                        }
                        disabled:opacity-50 disabled:cursor-not-allowed
                        flex items-center justify-center gap-2
                      `}
                    >
                      {isSelecting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          로딩 중...
                        </>
                      ) : isSelected ? (
                        "현재 선택된 팩"
                      ) : progressInfo.percentage > 0 ? (
                        "이어서 학습하기"
                      ) : (
                        "학습 시작하기"
                      )}
                    </button>
                  </div>
                </div>
              );
            })}

            {/* 새로운 팩 추가 예정 카드 */}
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
              <div className="text-gray-400 mb-3">
                <Star className="w-8 h-8 mx-auto" />
              </div>
              <h3 className="font-medium text-gray-600 mb-2">새로운 팩</h3>
              <p className="text-sm text-gray-500">곧 추가될 예정입니다</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PackSelectPage;
