// src/components/PackCard.tsx

import React from "react";
import { PackData } from "@/shared/hooks/usePackData";
import { DynamicIcon, IconName } from "@/shared/components/DynamicIcon";
import { Star, Users, Calendar, Zap, Award, Clock } from "lucide-react";

interface PackCardProps {
  pack: PackData;
  onSelect: (pack: PackData) => void;
  isSelected?: boolean;
}

export const PackCard: React.FC<PackCardProps> = ({
  pack,
  onSelect,
  isSelected = false,
}) => {
  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 2) return "text-green-600 bg-green-100";
    if (difficulty <= 3) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

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
      className={`group relative bg-white rounded-2xl shadow-lg border-2 transition-all duration-300 cursor-pointer hover:shadow-2xl hover:-translate-y-1 ${
        isSelected
          ? "border-indigo-500 ring-4 ring-indigo-200"
          : "border-gray-200 hover:border-indigo-300"
      }`}
      onClick={() => onSelect(pack)}
    >
      {/* 선택 인디케이터 */}
      {isSelected && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
          <DynamicIcon name="Check" size={16} className="text-white" />
        </div>
      )}

      {/* 썸네일 영역 */}
      <div className="relative h-48 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-t-2xl p-6 overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div
              className={`px-3 py-1 rounded-full text-xs font-medium ${getLevelBadgeColor(
                pack.level
              )}`}
            >
              {pack.level.toUpperCase()}
            </div>
            {pack.price.type === "free" && (
              <div className="px-3 py-1 bg-green-500 text-white rounded-full text-xs font-medium">
                FREE
              </div>
            )}
          </div>

          <h3 className="text-2xl font-bold text-white mb-2">{pack.title}</h3>
          <p className="text-indigo-100 text-sm">{pack.subtitle}</p>
        </div>

        {/* 장식 요소 */}
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/10 rounded-full transform translate-x-16 translate-y-16"></div>
      </div>

      {/* 카드 내용 */}
      <div className="p-6">
        {/* 설명 */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {pack.description}
        </p>

        {/* 통계 정보 */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Calendar className="w-4 h-4 text-indigo-600 mr-1" />
              <span className="text-lg font-semibold text-gray-900">
                {pack.totalDays}
              </span>
            </div>
            <p className="text-xs text-gray-500">일</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Users className="w-4 h-4 text-indigo-600 mr-1" />
              <span className="text-lg font-semibold text-gray-900">
                {pack.userCount > 1000
                  ? `${(pack.userCount / 1000).toFixed(1)}K`
                  : pack.userCount}
              </span>
            </div>
            <p className="text-xs text-gray-500">학습자</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Star className="w-4 h-4 text-yellow-500 mr-1" />
              <span className="text-lg font-semibold text-gray-900">
                {pack.rating}
              </span>
            </div>
            <p className="text-xs text-gray-500">평점</p>
          </div>
        </div>

        {/* 난이도 */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-600">난이도</span>
          <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((level) => (
              <div
                key={level}
                className={`w-2 h-2 rounded-full mx-0.5 ${
                  level <= pack.difficulty ? "bg-indigo-600" : "bg-gray-200"
                }`}
              />
            ))}
            <span
              className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(
                pack.difficulty
              )}`}
            >
              {pack.difficulty <= 2
                ? "쉬움"
                : pack.difficulty <= 3
                ? "보통"
                : "어려움"}
            </span>
          </div>
        </div>

        {/* 학습 방법들 */}
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-900 mb-2">학습 방법</p>
          <div className="flex flex-wrap gap-2">
            {pack.learningMethods.slice(0, 3).map((method, index) => (
              <div
                key={index}
                className="flex items-center bg-gray-50 rounded-full px-3 py-1"
              >
                <DynamicIcon
                  name={method.icon as IconName}
                  size={14}
                  className="text-indigo-600 mr-1"
                />
                <span className="text-xs text-gray-700">{method.name}</span>
              </div>
            ))}
            {pack.learningMethods.length > 3 && (
              <div className="flex items-center bg-gray-50 rounded-full px-3 py-1">
                <span className="text-xs text-gray-500">
                  +{pack.learningMethods.length - 3}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 태그들 */}
        {pack.tags.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1">
              {pack.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-indigo-50 text-indigo-600 text-xs rounded"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 선택 버튼 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect(pack);
          }}
          className={`w-full py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
            isSelected
              ? "bg-indigo-600 text-white hover:bg-indigo-700"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200 group-hover:bg-indigo-50 group-hover:text-indigo-600"
          }`}
        >
          {isSelected ? (
            <>
              <DynamicIcon name="CheckCircle" size={16} />
              선택됨
            </>
          ) : (
            <>
              <DynamicIcon name="Play" size={16} />
              학습 시작
            </>
          )}
        </button>
      </div>
    </div>
  );
};
