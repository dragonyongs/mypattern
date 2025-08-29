// src/features/library/LibraryPage.tsx
import React, { useMemo, useState, useCallback, useEffect } from "react";
import { useLexiconStore } from "@/stores/lexiconStore";

type ViewMode = "all" | "core" | "mine";
type FilterTag = "all" | "daily" | "directions" | "school" | "business";

const POS_OPTIONS = [
  { value: "NOUN", label: "명사" },
  { value: "VERB", label: "동사" },
  { value: "PLACE", label: "장소" },
  { value: "PERSON", label: "사람" },
  { value: "ITEM", label: "사물" },
  { value: "TIME", label: "시간" },
] as const;

const TAG_PRESETS = ["daily", "directions", "school", "business"] as const;
const TAG_LABELS: Record<string, string> = {
  daily: "일상",
  directions: "길찾기",
  school: "학교",
  business: "비즈니스",
};

const FILTER_LABELS: Record<FilterTag, string> = {
  all: "전체",
  daily: "일상",
  directions: "길찾기",
  school: "학교",
  business: "비즈니스",
};

const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  all: "전체",
  core: "앱 코어",
  mine: "내 단어장",
};

const ITEMS_PER_PAGE = 12;

export function LibraryPage() {
  const {
    words,
    addWord,
    removeWord,
    search,
    seedIfEmpty,
    hydrated,
    userAddedCoreWords,
    addCoreWordToUser,
    removeCoreWordFromUser,
  } = useLexiconStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [filterTag, setFilterTag] = useState<FilterTag>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [showCustomTags, setShowCustomTags] = useState(false);
  const [form, setForm] = useState({
    en: "",
    ko: "",
    pos: "NOUN" as const,
    tags: new Set<string>(["daily"]),
    customTags: "",
  });

  // 하이드레이션 완료 후 시드 데이터 로드
  useEffect(() => {
    if (hydrated && words.length === 0) {
      seedIfEmpty();
    }
  }, [hydrated, words.length, seedIfEmpty]);

  // 필터링된 단어 목록
  const filteredWords = useMemo(() => {
    let result = searchQuery.trim() ? search(searchQuery) : words;

    if (viewMode === "core") {
      // 모든 코어 단어를 항상 표시 (제거하지 않음)
      result = result.filter((word) => word.source === "global");
    } else if (viewMode === "mine") {
      // 사용자 단어 + 사용자가 추가한 코어 단어
      result = result.filter(
        (word) =>
          word.source === "user" ||
          (word.source === "global" && userAddedCoreWords.has(word.id))
      );
    }

    if (filterTag !== "all") {
      result = result.filter((word) => word.tags.includes(filterTag));
    }

    return result;
  }, [searchQuery, words, search, viewMode, filterTag, userAddedCoreWords]);

  // 페이징 처리
  const totalPages = Math.ceil(filteredWords.length / ITEMS_PER_PAGE);
  const paginatedWords = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredWords.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredWords, currentPage]);

  // 페이지 변경 시 첫 페이지로 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [viewMode, filterTag, searchQuery]);

  // 폼 유효성 검사
  const isFormValid = form.en.trim().length > 0 && form.ko.trim().length > 0;

  // 중복 단어 체크
  const isDuplicate = useMemo(() => {
    const normalizedEn = form.en.trim().toLowerCase();
    return words.some(
      (word) => word.en.toLowerCase() === normalizedEn && word.pos === form.pos
    );
  }, [form.en, form.pos, words]);

  // 태그 토글 핸들러
  const toggleTag = useCallback((tag: string) => {
    setForm((prev) => {
      const newTags = new Set(prev.tags);
      if (newTags.has(tag)) {
        newTags.delete(tag);
      } else {
        newTags.add(tag);
      }
      return { ...prev, tags: newTags };
    });
  }, []);

  // 단어 추가 핸들러
  const handleAddWord = useCallback(() => {
    if (!isFormValid || isDuplicate) return;

    const allTags = [
      ...Array.from(form.tags),
      ...form.customTags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ];

    addWord({
      en: form.en.trim(),
      ko: form.ko.trim(),
      pos: form.pos,
      tags: allTags as any,
      source: "user",
    });

    setForm((prev) => ({
      en: "",
      ko: "",
      pos: prev.pos,
      tags: new Set<string>(["daily"]),
      customTags: "",
    }));
  }, [addWord, isFormValid, isDuplicate, form]);

  // 코어 단어를 내 단어장에 추가 (참조 방식)
  const handleAddToMyLibrary = useCallback(
    (word: any) => {
      addCoreWordToUser(word.id);
    },
    [addCoreWordToUser]
  );

  // 코어 단어를 내 단어장에서 제거
  const handleRemoveFromMyLibrary = useCallback(
    (word: any) => {
      removeCoreWordFromUser(word.id);
    },
    [removeCoreWordFromUser]
  );

  // 엔터 키로 단어 추가
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleAddWord();
      }
    },
    [handleAddWord]
  );

  // 페이지 번호 생성
  const getPageNumbers = useMemo(() => {
    const pages = [];
    const showEllipsis = totalPages > 7;

    if (!showEllipsis) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  }, [currentPage, totalPages]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 - Sticky */}
      <div className="sticky top-0 z-10 bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-2xl font-bold text-gray-900">
              📚 내 단어장
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({filteredWords.length}개)
              </span>
            </h1>

            {/* 검색바 */}
            <div className="relative max-w-xs w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="단어 검색..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="absolute left-3 top-2.5 text-gray-400">🔍</div>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* 탭 네비게이션 */}
          <div className="mt-4 flex flex-wrap gap-2">
            {(Object.keys(VIEW_MODE_LABELS) as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                  viewMode === mode
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                {VIEW_MODE_LABELS[mode]}
              </button>
            ))}
          </div>

          {/* 필터 탭 */}
          <div className="mt-3 flex flex-wrap gap-2">
            {(Object.keys(FILTER_LABELS) as FilterTag[]).map((tag) => (
              <button
                key={tag}
                onClick={() => setFilterTag(tag)}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                  filterTag === tag
                    ? "bg-blue-100 text-blue-700 border border-blue-300"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {FILTER_LABELS[tag]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 단어 추가 폼 - 내 단어장 모드일 때만 표시 */}
        {viewMode === "mine" && (
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              새 단어 추가
            </h2>

            <div className="space-y-4">
              {/* 기본 입력 필드 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    영어
                  </label>
                  <input
                    type="text"
                    value={form.en}
                    onChange={(e) => setForm({ ...form, en: e.target.value })}
                    onKeyPress={handleKeyPress}
                    placeholder="예: bus stop"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    한국어
                  </label>
                  <input
                    type="text"
                    value={form.ko}
                    onChange={(e) => setForm({ ...form, ko: e.target.value })}
                    onKeyPress={handleKeyPress}
                    placeholder="예: 버스 정류장"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* 품사 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  품사
                </label>
                <div className="flex flex-wrap gap-2">
                  {POS_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setForm({ ...form, pos: option.value })}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        form.pos === option.value
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 태그 선택 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    카테고리 태그
                  </label>
                  <button
                    onClick={() => setShowCustomTags(!showCustomTags)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {showCustomTags ? "기본 태그만" : "+ 커스텀 태그"}
                  </button>
                </div>

                <div className="space-y-3">
                  {/* 프리셋 태그 */}
                  <div className="flex flex-wrap gap-2">
                    {TAG_PRESETS.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                          form.tags.has(tag)
                            ? "bg-blue-100 text-blue-700 border-blue-300"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {TAG_LABELS[tag]}
                      </button>
                    ))}
                  </div>

                  {/* 커스텀 태그 입력 */}
                  {showCustomTags && (
                    <div>
                      <input
                        type="text"
                        value={form.customTags}
                        onChange={(e) =>
                          setForm({ ...form, customTags: e.target.value })
                        }
                        placeholder="커스텀 태그를 쉼표로 구분해서 입력하세요 (예: 여행, 음식)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        💡 여러 태그는 쉼표(,)로 구분하세요
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 제출 버튼 */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleAddWord}
                  disabled={!isFormValid || isDuplicate}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    !isFormValid || isDuplicate
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {isDuplicate ? "이미 존재하는 단어" : "단어 추가"}
                </button>

                {!isFormValid && (
                  <span className="text-sm text-gray-500">
                    영어와 한국어를 모두 입력해주세요
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 단어 목록 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              {searchQuery
                ? `검색 결과: "${searchQuery}"`
                : `${VIEW_MODE_LABELS[viewMode]} ${
                    filterTag !== "all" ? `- ${FILTER_LABELS[filterTag]}` : ""
                  }`}
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({filteredWords.length}개)
              </span>
            </h3>
          </div>

          {filteredWords.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📝</div>
              <p className="text-gray-500">
                {searchQuery
                  ? "검색 결과가 없습니다"
                  : "저장된 단어가 없습니다"}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
                >
                  전체 단어 보기
                </button>
              )}
            </div>
          ) : (
            <>
              {/* 단어 카드 그리드 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {paginatedWords.map((word) => {
                  const isInMyLibrary = userAddedCoreWords.has(word.id);
                  const isCore = word.source === "global";
                  const showAsUserWord =
                    viewMode === "mine" && isCore && isInMyLibrary;

                  return (
                    <div
                      key={word.id}
                      className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">
                            {word.en}
                          </h4>
                          <p className="text-gray-600 text-sm">{word.ko}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                            {POS_OPTIONS.find((p) => p.value === word.pos)
                              ?.label || word.pos}
                          </span>
                          {isCore && !showAsUserWord && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                              코어
                            </span>
                          )}
                          {showAsUserWord && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                              내 단어장
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 태그 */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {word.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200"
                          >
                            {TAG_LABELS[tag] || tag}
                          </span>
                        ))}
                      </div>

                      {/* 액션 버튼 */}
                      <div className="flex gap-2">
                        {isCore ? (
                          isInMyLibrary ? (
                            viewMode === "mine" ? (
                              <button
                                onClick={() => handleRemoveFromMyLibrary(word)}
                                className="text-xs text-red-600 hover:text-red-700 font-medium"
                              >
                                내 단어장에서 제거
                              </button>
                            ) : (
                              <span className="text-xs text-gray-500 font-medium">
                                내 단어장 추가됨
                              </span>
                            )
                          ) : (
                            <button
                              onClick={() => handleAddToMyLibrary(word)}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                            >
                              내 단어장에 추가
                            </button>
                          )
                        ) : (
                          <button
                            onClick={() => removeWord(word.id)}
                            className="text-xs text-red-600 hover:text-red-700 font-medium"
                          >
                            삭제
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    이전
                  </button>

                  {getPageNumbers.map((page, index) => (
                    <React.Fragment key={index}>
                      {page === "..." ? (
                        <span className="px-3 py-2 text-gray-500">...</span>
                      ) : (
                        <button
                          onClick={() => setCurrentPage(page as number)}
                          className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                            currentPage === page
                              ? "bg-blue-600 text-white"
                              : "border border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {page}
                        </button>
                      )}
                    </React.Fragment>
                  ))}

                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    다음
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
