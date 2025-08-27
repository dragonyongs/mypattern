import React, { useState } from "react";
import {
  MapPin,
  Briefcase,
  Coffee,
  Plane,
  GraduationCap,
  Users,
  ArrowRight,
  Star,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { useNavigate } from "react-router-dom";

interface Interest {
  id: string;
  name: string;
  icon: typeof MapPin;
  description: string;
  examples: string[];
  recommendedLevel: ("beginner" | "intermediate" | "advanced")[];
}

const interests: Interest[] = [
  {
    id: "directions",
    name: "길 안내",
    icon: MapPin,
    description: "길을 묻고 설명하기",
    examples: ["Where is the subway?", "It's around the corner"],
    recommendedLevel: ["beginner", "intermediate"],
  },
  {
    id: "business",
    name: "비즈니스",
    icon: Briefcase,
    description: "업무 상황에서의 소통",
    examples: ["Let's schedule a meeting", "I'll get back to you"],
    recommendedLevel: ["intermediate", "advanced"],
  },
  {
    id: "daily",
    name: "일상 대화",
    icon: Coffee,
    description: "카페, 식당에서의 대화",
    examples: ["Can I have a coffee?", "What would you recommend?"],
    recommendedLevel: ["beginner", "intermediate"],
  },
  {
    id: "travel",
    name: "여행",
    icon: Plane,
    description: "여행지에서 필요한 표현",
    examples: ["Where can I buy tickets?", "How much does it cost?"],
    recommendedLevel: ["beginner", "intermediate", "advanced"],
  },
  {
    id: "study",
    name: "학습/교육",
    icon: GraduationCap,
    description: "학교나 교육 상황",
    examples: ["Could you explain this?", "I don't understand"],
    recommendedLevel: ["intermediate", "advanced"],
  },
  {
    id: "social",
    name: "사교 모임",
    icon: Users,
    description: "파티나 모임에서",
    examples: ["Nice to meet you", "What do you do for work?"],
    recommendedLevel: ["beginner", "intermediate", "advanced"],
  },
];

export function InterestsPage() {
  const { user, updateUser } = useAuthStore();
  const { calculatedLevel, completeOnboarding } = useOnboardingStore();
  const navigate = useNavigate();
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const userLevel = user?.level || calculatedLevel || "beginner";

  const handleInterestToggle = (interestId: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interestId)
        ? prev.filter((id) => id !== interestId)
        : [...prev, interestId]
    );
  };

  const handleComplete = () => {
    console.log("🟢 온보딩 완료:", selectedInterests);
    updateUser({
      interests: selectedInterests,
      onboardingCompleted: true,
    });
    completeOnboarding();
    navigate("/app/learn", { replace: true });
  };

  // 사용자 레벨에 따른 추천 관심사
  const getRecommendedInterests = () => {
    return interests.filter((interest) =>
      interest.recommendedLevel.includes(userLevel)
    );
  };

  const recommendedInterests = getRecommendedInterests();

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-sm mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-6">
          <div className="bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1 rounded-full mb-3 inline-block">
            {userLevel.toUpperCase()} 레벨
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            어떤 상황에서 영어를 사용하고 싶나요?
          </h1>
          <p className="text-sm text-gray-600">
            {user?.name}님의 레벨에 맞는 학습을 제공해드려요
          </p>
        </div>

        {/* 추천 섹션 */}
        {recommendedInterests.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <Star className="h-4 w-4 text-yellow-500 mr-1" />
              {userLevel} 레벨 추천
            </h2>
            <div className="space-y-2">
              {recommendedInterests.map((interest) => {
                const Icon = interest.icon;
                const isSelected = selectedInterests.includes(interest.id);

                return (
                  <button
                    key={interest.id}
                    onClick={() => handleInterestToggle(interest.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 shadow-sm"
                        : "border-gray-200 bg-white hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div
                        className={`p-2 rounded-lg ${
                          isSelected ? "bg-blue-100" : "bg-gray-100"
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 ${
                            isSelected ? "text-blue-600" : "text-gray-600"
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center">
                          <h3 className="font-medium text-gray-900 mr-2">
                            {interest.name}
                          </h3>
                          <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded">
                            추천
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {interest.description}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {interest.examples
                            .slice(0, 1)
                            .map((example, index) => (
                              <span
                                key={index}
                                className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                              >
                                {example}
                              </span>
                            ))}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="text-blue-600">
                          <svg
                            className="h-5 w-5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 기타 관심사 */}
        <div className="mb-8">
          <h2 className="text-sm font-medium text-gray-700 mb-3">
            기타 관심사
          </h2>
          <div className="space-y-2">
            {interests
              .filter((i) => !recommendedInterests.includes(i))
              .map((interest) => {
                const Icon = interest.icon;
                const isSelected = selectedInterests.includes(interest.id);

                return (
                  <button
                    key={interest.id}
                    onClick={() => handleInterestToggle(interest.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 shadow-sm"
                        : "border-gray-200 bg-white hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div
                        className={`p-2 rounded-lg ${
                          isSelected ? "bg-blue-100" : "bg-gray-100"
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 ${
                            isSelected ? "text-blue-600" : "text-gray-600"
                          }`}
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 mb-1">
                          {interest.name}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {interest.description}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {interest.examples
                            .slice(0, 1)
                            .map((example, index) => (
                              <span
                                key={index}
                                className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                              >
                                {example}
                              </span>
                            ))}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="text-blue-600">
                          <svg
                            className="h-5 w-5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
          </div>
        </div>

        {/* 완료 버튼 */}
        <button
          onClick={handleComplete}
          disabled={selectedInterests.length === 0}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
            selectedInterests.length > 0
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          <span>학습 시작하기</span>
          <ArrowRight className="h-4 w-4" />
        </button>

        {selectedInterests.length > 0 && (
          <p className="text-xs text-center text-gray-500 mt-3">
            선택된 항목: {selectedInterests.length}개
          </p>
        )}
      </div>
    </div>
  );
}
