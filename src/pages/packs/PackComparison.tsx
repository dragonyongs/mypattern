// src/pages/packs/PackComparison.tsx
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { usePackStore } from "@/stores/packStore";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Star,
  CheckCircle,
  X,
  Plus,
  TrendingUp,
  Target,
  Zap,
} from "lucide-react";
import { Pack } from "@/entities";

const PackComparison: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { availablePacks, loadAvailablePacks } = usePackStore();

  const [selectedPacks, setSelectedPacks] = useState<Pack[]>([]);
  const [showPackSelector, setShowPackSelector] = useState(false);

  useEffect(() => {
    if (availablePacks.length === 0) {
      loadAvailablePacks();
    }
  }, [availablePacks.length, loadAvailablePacks]);

  useEffect(() => {
    // URL에서 비교할 팩들 가져오기
    const packIds = searchParams.get("packs")?.split(",") || [];
    if (packIds.length > 0 && availablePacks.length > 0) {
      const packs = packIds
        .map((id) => availablePacks.find((p) => p.id === id))
        .filter(Boolean) as Pack[];
      setSelectedPacks(packs);
    }
  }, [searchParams, availablePacks]);

  const addPack = (pack: Pack) => {
    if (
      selectedPacks.length < 4 &&
      !selectedPacks.find((p) => p.id === pack.id)
    ) {
      const newPacks = [...selectedPacks, pack];
      setSelectedPacks(newPacks);
      // URL 업데이트
      const packIds = newPacks.map((p) => p.id).join(",");
      navigate(`/app/packs/comparison?packs=${packIds}`, { replace: true });
    }
    setShowPackSelector(false);
  };

  const removePack = (packId: string) => {
    const newPacks = selectedPacks.filter((p) => p.id !== packId);
    setSelectedPacks(newPacks);
    if (newPacks.length === 0) {
      navigate("/app/packs/comparison", { replace: true });
    } else {
      const packIds = newPacks.map((p) => p.id).join(",");
      navigate(`/app/packs/comparison?packs=${packIds}`, { replace: true });
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "vocabulary":
        return <BookOpen className="w-4 h-4" />;
      case "sentences":
        return <Zap className="w-4 h-4" />;
      case "grammar":
        return <Target className="w-4 h-4" />;
      default:
        return <BookOpen className="w-4 h-4" />;
    }
  };

  const comparisonItems = [
    {
      label: "총 항목 수",
      key: "totalItems",
      icon: <BookOpen className="w-4 h-4" />,
    },
    {
      label: "예상 학습 기간",
      key: "estimatedDays",
      icon: <Clock className="w-4 h-4" />,
    },
    { label: "난이도", key: "level", icon: <TrendingUp className="w-4 h-4" /> },
    { label: "학습 타입", key: "type", icon: <Target className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/app/packs")}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-gray-900">
                학습팩 비교
              </h1>
              <p className="text-gray-500 text-sm">
                최대 4개까지 비교 가능합니다
              </p>
            </div>
            <button
              onClick={() => setShowPackSelector(true)}
              disabled={selectedPacks.length >= 4}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />팩 추가
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {selectedPacks.length === 0 ? (
          /* 빈 상태 */
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              비교할 팩을 선택하세요
            </h3>
            <p className="text-gray-600 mb-6">
              여러 학습팩을 비교하여 가장 적합한 팩을 찾아보세요
            </p>
            <button
              onClick={() => setShowPackSelector(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 mx-auto"
            >
              <Plus className="w-5 h-5" />첫 번째 팩 선택하기
            </button>
          </div>
        ) : (
          /* 비교 테이블 */
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            {/* 헤더 행 */}
            <div className="grid grid-cols-5 border-b bg-gray-50">
              <div className="p-4 font-medium text-gray-900">항목</div>
              {selectedPacks.map((pack) => (
                <div key={pack.id} className="p-4 border-l">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-gray-900 truncate">
                        {pack.title}
                      </h3>
                      <div
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${getLevelColor(
                          pack.level
                        )}`}
                      >
                        {pack.level}
                      </div>
                    </div>
                    <button
                      onClick={() => removePack(pack.id)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 비교 항목들 */}
            {comparisonItems.map((item) => (
              <div
                key={item.key}
                className="grid grid-cols-5 border-b last:border-b-0"
              >
                <div className="p-4 bg-gray-50 border-r">
                  <div className="flex items-center gap-2">
                    {item.icon}
                    <span className="font-medium text-gray-900">
                      {item.label}
                    </span>
                  </div>
                </div>
                {selectedPacks.map((pack) => (
                  <div key={pack.id} className="p-4 border-l">
                    {item.key === "level" ? (
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getLevelColor(
                          pack[item.key]
                        )}`}
                      >
                        {pack[item.key].toUpperCase()}
                      </span>
                    ) : item.key === "type" ? (
                      <div className="flex items-center gap-2">
                        {getTypeIcon(pack[item.key])}
                        <span className="capitalize">{pack[item.key]}</span>
                      </div>
                    ) : item.key === "estimatedDays" ? (
                      <span>{pack[item.key]}일</span>
                    ) : (
                      <span>{pack[item.key as keyof Pack]}</span>
                    )}
                  </div>
                ))}
              </div>
            ))}

            {/* 설명 행 */}
            <div className="grid grid-cols-5 border-b">
              <div className="p-4 bg-gray-50 border-r">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span className="font-medium text-gray-900">설명</span>
                </div>
              </div>
              {selectedPacks.map((pack) => (
                <div key={pack.id} className="p-4 border-l">
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {pack.description}
                  </p>
                </div>
              ))}
            </div>

            {/* 태그 행 */}
            <div className="grid grid-cols-5">
              <div className="p-4 bg-gray-50 border-r">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  <span className="font-medium text-gray-900">태그</span>
                </div>
              </div>
              {selectedPacks.map((pack) => (
                <div key={pack.id} className="p-4 border-l">
                  <div className="flex flex-wrap gap-1">
                    {pack.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 액션 버튼들 */}
        {selectedPacks.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-4 justify-center">
            {selectedPacks.map((pack) => (
              <div key={pack.id} className="text-center">
                <button
                  onClick={() => navigate(`/app/packs/${pack.id}`)}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  {pack.title} 상세보기
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 팩 선택 모달 */}
      {showPackSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-96 overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">비교할 팩 선택</h3>
              <button
                onClick={() => setShowPackSelector(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-80">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availablePacks
                  .filter(
                    (pack) => !selectedPacks.find((sp) => sp.id === pack.id)
                  )
                  .map((pack) => (
                    <div
                      key={pack.id}
                      onClick={() => addPack(pack)}
                      className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <BookOpen className="w-8 h-8 text-blue-500" />
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">
                            {pack.title}
                          </h4>
                          <p className="text-gray-600 text-sm">
                            {pack.totalItems}개 항목
                          </p>
                        </div>
                        <div
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(
                            pack.level
                          )}`}
                        >
                          {pack.level}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackComparison;
