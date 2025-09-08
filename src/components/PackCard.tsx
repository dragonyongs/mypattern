// src/components/PackCard.tsx

import React from "react";
import { Star, Users, Calendar } from "lucide-react";
// [수정] PackMetadata 타입을 import 합니다.
import { PackMetadata } from "@/shared/hooks/usePackData";

interface PackCardProps {
  // [수정] props 타입을 PackMetadata로 변경합니다.
  pack: PackMetadata;
  onSelect: (pack: PackMetadata) => void;
  isSelected?: boolean;
}

export const PackCard: React.FC<PackCardProps> = ({
  pack,
  onSelect,
  isSelected = false,
}) => {
  // [추가] Optional Chaining과 Nullish Coalescing으로 안전하게 값에 접근합니다.
  const level = pack.level ?? "beginner"; // pack.level이 없으면 'beginner'를 기본값으로 사용
  const tags = pack.tags ?? []; // pack.tags가 없으면 빈 배열을 사용
  // const userCount = pack.userCount ?? 0;
  // const rating = pack.rating ?? 0;
  // const difficulty = pack.difficulty ?? 1;

  const getLevelBadgeColor = (level: string) => {
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

  return (
    <div
      onClick={() => onSelect(pack)}
      className={`group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
        isSelected
          ? "border-indigo-500 ring-2 ring-indigo-500"
          : "border-gray-200"
      }`}
    >
      {/* 선택되었을 때의 시각적 표시 */}
      {isSelected && (
        <div className="absolute right-4 top-4 z-10 rounded-full bg-indigo-600 p-2 text-white">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}

      {/* 썸네일/헤더 영역 (옵션) */}
      <div className="relative h-32 bg-gray-100">
        {/* 이미지가 있다면 여기에 표시 <img ... /> */}
        <div
          className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${getLevelBadgeColor(
            level
          )}`}
        >
          {/* [수정] 이제 level은 항상 문자열이므로 toUpperCase()를 안전하게 호출 가능 */}
          {level.toUpperCase()}
        </div>
      </div>

      <div className="flex flex-grow flex-col p-5">
        <h3 className="text-xl font-bold text-gray-900">{pack.title}</h3>
        <p className="mt-1 text-sm text-gray-600">{pack.subtitle}</p>

        <div className="mt-4 flex-grow">
          <p className="text-sm text-gray-500 line-clamp-2">
            {pack.description}
          </p>
        </div>

        {/* 태그 목록 */}
        <div className="mt-4 flex flex-wrap gap-2">
          {tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>

      {/* 카드 푸터 */}
      <div className="border-t border-gray-200 bg-gray-50 px-5 py-4">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            <span>{pack.totalDays}일 과정</span>
          </div>
          {/* userCount, rating 등 추가 정보가 PackMetadata에 포함되면 여기에 표시 가능 */}
        </div>
      </div>
    </div>
  );
};
