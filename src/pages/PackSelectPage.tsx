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
import { packDataService } from "@/shared/services/packDataService"; // ✅ 추가

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
  const [isLoading, setIsLoading] = useState(false); // ✅ 로딩 상태 추가

  // 필터링 및 정렬된 팩 목록 (기존과 동일)
  const filteredAndSortedPacks = useMemo(() => {
    let filtered = [...packs];

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

    if (filterBy !== "all") {
      if (filterBy === "free" || filterBy === "paid") {
        filtered = filtered.filter((pack) => pack.price.type === filterBy);
      } else {
        filtered = filtered.filter((pack) => pack.level === filterBy);
      }
    }

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
          return 0;
      }
    });

    return filtered;
  }, [packs, searchQuery, sortBy, filterBy]);

  const handleSelectPack = (pack: PackData) => {
    setSelectedPack(pack);
  };

  // ✅ 수정된 handleStartLearning - 전체 데이터 로드
  const handleStartLearning = async () => {
    if (!selectedPack) return;

    try {
      setIsLoading(true);

      console.log(
        "[PackSelectPage] Loading full pack data for:",
        selectedPack.id
      );

      // ✅ 실제 JSON 파일에서 전체 데이터 로드 (days 포함)
      const fullPackData = await packDataService.loadPackData(selectedPack.id);

      console.log("[PackSelectPage] Full pack data loaded:", fullPackData);
      console.log(
        "[PackSelectPage] Days count:",
        fullPackData.days?.length || 0
      );

      // ✅ 전체 데이터를 store에 저장
      selectPack(selectedPack.id, fullPackData);

      // 캘린더 페이지로 이동
      navigate("/calendar");
    } catch (error) {
      console.error("[PackSelectPage] Failed to load pack data:", error);

      // ✅ 에러 처리 - 사용자에게 알림
      alert("학습팩 데이터를 불러오는데 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            학습팩을 불러오는 중...
          </h2>
          <p className="text-gray-600">잠시만 기다려주세요</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <BookOpen className="w-16 h-16 mx-auto mb-2" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            오류가 발생했습니다
          </h2>
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
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              학습팩 선택
            </h1>
            <p className="text-gray-600">
              당신에게 맞는 영어 학습 프로그램을 선택해보세요
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 검색 및 필터 */}
        <div className="bg-white rounded-xl p-6 shadow-sm border mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* 검색바 */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="학습팩 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </div>

            {/* 정렬 및 필터 버튼 */}
            <div className="flex gap-4">
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

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-3 border rounded-xl transition-colors ${
                  showFilters
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                    : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Filter className="w-5 h-5" />
                필터
              </button>
            </div>
          </div>

          {/* 필터 옵션 */}
          {showFilters && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200">
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
          )}
        </div>

        {/* 메인 콘텐츠 */}
        {filteredAndSortedPacks.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
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
                <span className="font-semibold text-indigo-600">
                  {filteredAndSortedPacks.length}
                </span>
                개의 학습팩
              </p>

              {selectedPack && (
                <button
                  onClick={handleStartLearning}
                  disabled={isLoading} // ✅ 로딩 중 비활성화
                  className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
                    isLoading
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg"
                  }`}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      데이터 로딩 중...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      선택한 팩으로 시작하기
                    </>
                  )}
                </button>
              )}
            </div>

            {/* 팩 카드 그리드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

        {/* 하단 도움말 */}
        <div className="mt-12 bg-indigo-50 rounded-xl p-6 text-center">
          <h3 className="text-lg font-semibold text-indigo-900 mb-2">
            학습팩을 선택하셨나요?
          </h3>
          <p className="text-indigo-700">
            언제든 학습을 중단하고 이어서 할 수 있어요. 자신에게 맞는 학습팩으로
            영어 실력을 향상시켜보세요!
          </p>
        </div>
      </div>
    </div>
  );
}
