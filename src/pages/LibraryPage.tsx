// src/features/library/LibraryPage.tsx
import React, { useMemo, useState, useCallback, useEffect } from "react";
import { useLexiconStore } from "@/stores/lexiconStore";

// 한국어 라벨 ↔ 내부 POS 코드 매핑
const POS_OPTIONS = [
  { value: "NOUN", label: "명사" },
  { value: "VERB", label: "동사" },
  { value: "PLACE", label: "장소" },
  { value: "PERSON", label: "사람" },
  { value: "ITEM", label: "사물" },
  { value: "TIME", label: "시간" },
  { value: "PRON", label: "대명사" },
] as const;

const TAG_PRESETS = ["daily", "directions", "school", "business"] as const;
const TAG_LABELS: Record<string, string> = {
  daily: "일상",
  directions: "길찾기",
  school: "학교",
  business: "비즈니스",
};

export function LibraryPage() {
  const {
    words,
    addWord,
    updateWord,
    removeWord,
    search,
    seedIfEmpty,
    hydrated,
  } = useLexiconStore();

  const [searchQuery, setSearchQuery] = useState("");
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

  // 검색 결과 또는 전체 단어 목록
  const filteredWords = useMemo(() => {
    return searchQuery.trim() ? search(searchQuery) : words;
  }, [searchQuery, words, search]);

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

    // 프리셋 태그와 커스텀 태그 결합
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
    });

    // 폼 초기화 (품사는 유지)
    setForm((prev) => ({
      en: "",
      ko: "",
      pos: prev.pos,
      tags: new Set<string>(["daily"]),
      customTags: "",
    }));
  }, [addWord, isFormValid, isDuplicate, form]);

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 - Sticky */}
      <div className="sticky top-0 z-10 bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-2xl font-bold text-gray-900">
              📚 내 단어장
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({words.length}개)
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
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 단어 추가 폼 */}
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

        {/* 단어 목록 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              {searchQuery ? `검색 결과: "${searchQuery}"` : "전체 단어"}
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
                  : "아직 저장된 단어가 없습니다"}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredWords.map((word) => (
                <div
                  key={word.id}
                  className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{word.en}</h4>
                      <p className="text-gray-600 text-sm">{word.ko}</p>
                    </div>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      {POS_OPTIONS.find((p) => p.value === word.pos)?.label ||
                        word.pos}
                    </span>
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
                    <button
                      onClick={() => removeWord(word.id)}
                      className="text-xs text-red-600 hover:text-red-700 font-medium"
                    >
                      삭제
                    </button>
                    {/* 필요시 수정 기능 추가 */}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
