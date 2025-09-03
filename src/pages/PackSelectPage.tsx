// src/pages/PackSelectPage.tsx

import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Filter,
  SortAsc,
  BookOpen,
  Zap,
  Star,
  TrendingUp,
} from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { usePackData, PackData } from "@/shared/hooks/usePackData";
import { PackCard } from "@/components/PackCard";
import { DynamicIcon } from "@/shared/components/DynamicIcon";

type SortOption = "popular" | "newest" | "rating" | "difficulty";
type FilterOption =
  | "all"
  | "free"
  | "paid"
  | "beginner"
  | "intermediate"
  | "advanced";

export default function PackSelectPage() {
  const navigate = useNavigate();
  const { selectPack, selectedPackId } = useAppStore();
  const { packs, loading, error, refetch } = usePackData();

  const [selectedPack, setSelectedPack] = useState<PackData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("popular");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [showFilters, setShowFilters] = useState(false);

  // 필터링 및 정렬된 팩 목록
  const filteredAndSortedPacks = useMemo(() => {
    let filtered = [...packs];

    // 검색 필터
    if (searchQuery) {
      filtered = filtered.filter(
        (pack) =>
          pack.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          pack.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          pack.tags.some((tag) =>
            tag.toLowerCase().includes(searchQuery.toLowerCase())
          )
      );
    }

    // 카테고리 필터
    if (filterBy !== "all") {
      if (filterBy === "free" || filterBy === "paid") {
        filtered = filtered.filter((pack) => pack.price.type === filterBy);
      } else {
        filtered = filtered.filter((pack) => pack.level === filterBy);
      }
    }

    // 정렬
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "popular":
          return b.userCount - a.userCount;
        case "rating":
          return b.rating - a.rating;
        case "difficulty":
          return a.difficulty - b.difficulty;
        case "newest":
        default:
          return 0; // 기본 순서
      }
    });

    return filtered;
  }, [packs, searchQuery, sortBy, filterBy]);

  const handleSelectPack = (pack: PackData) => {
    setSelectedPack(pack);
  };

  const handleStartLearning = () => {
    if (selectedPack) {
      selectPack(selectedPack.id, selectedPack);
      navigate("/calendar");
    }
  };

  const sortOptions = [
    { value: "popular", label: "인기순", icon: "TrendingUp" },
    { value: "rating", label: "평점순", icon: "Star" },
    { value: "difficulty", label: "난이도순", icon: "BarChart3" },
    { value: "newest", label: "최신순", icon: "Clock" },
  ];

  const filterOptions = [
    { value: "all", label: "전체", count: packs.length },
    {
      value: "free",
      label: "무료",
      count: packs.filter((p) => p.price.type === "free").length,
    },
    {
      value: "paid",
      label: "유료",
      count: packs.filter((p) => p.price.type === "paid").length,
    },
    {
      value: "beginner",
      label: "초급",
      count: packs.filter((p) => p.level === "beginner").length,
    },
    {
      value: "intermediate",
      label: "중급",
      count: packs.filter((p) => p.level === "intermediate").length,
    },
    {
      value: "advanced",
      label: "고급",
      count: packs.filter((p) => p.level === "advanced").length,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <DynamicIcon
              name="BookOpen"
              size={32}
              className="text-white animate-pulse"
            />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            학습팩을 불러오는 중...
          </h3>
          <p className="text-gray-600">잠시만 기다려주세요</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <DynamicIcon
              name="AlertCircle"
              size={32}
              className="text-red-600"
            />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            오류가 발생했습니다
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={refetch}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* 헤더 */}
      <div className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              학습팩 선택
            </h1>
            <p className="text-lg text-gray-600">
              당신에게 맞는 영어 학습 프로그램을 선택해보세요
            </p>
          </div>

          {/* 검색 및 필터 */}
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            {/* 검색바 */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="학습팩 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </div>

            {/* 정렬 및 필터 버튼 */}
            <div className="flex gap-2">
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-3 pr-8 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <SortAsc className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-3 border rounded-xl transition-colors ${
                  showFilters
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                    : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Filter className="w-4 h-4" />
                필터
              </button>
            </div>
          </div>

          {/* 필터 옵션 */}
          {showFilters && (
            <div className="mt-4 p-4 bg-white rounded-xl border border-gray-200">
              <div className="flex flex-wrap gap-2">
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setFilterBy(option.value as FilterOption)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filterBy === option.value
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {option.label} ({option.count})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {filteredAndSortedPacks.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              검색 결과가 없습니다
            </h3>
            <p className="text-gray-600">다른 검색어나 필터를 시도해보세요</p>
          </div>
        ) : (
          <>
            {/* 결과 개수 */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-gray-600">
                총{" "}
                <span className="font-semibold text-gray-900">
                  {filteredAndSortedPacks.length}
                </span>
                개의 학습팩
              </p>
              {selectedPack && (
                <button
                  onClick={handleStartLearning}
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-lg"
                >
                  <DynamicIcon name="Play" size={16} />
                  선택한 팩으로 시작하기
                </button>
              )}
            </div>

            {/* 팩 카드 그리드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredAndSortedPacks.map((pack) => (
                <PackCard
                  key={pack.id}
                  pack={pack}
                  onSelect={handleSelectPack}
                  isSelected={selectedPack?.id === pack.id}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* 하단 도움말 */}
      <div className="bg-white/50 backdrop-blur-sm border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              학습팩을 선택하셨나요?
            </h3>
            <p className="text-gray-600">
              언제든 학습을 중단하고 이어서 할 수 있어요. 자신에게 맞는
              학습팩으로 영어 실력을 향상시켜보세요!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
