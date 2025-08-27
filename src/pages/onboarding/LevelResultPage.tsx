import React from "react";
import { CheckCircle, TrendingUp, BookOpen, ArrowRight } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { useNavigate } from "react-router-dom";

export function LevelResultPage() {
  const { user } = useAuthStore();
  const { calculatedLevel } = useOnboardingStore();
  const navigate = useNavigate();

  // 가상의 평가 결과 (실제로는 levelAssessment에서 가져와야 함)
  const assessment = {
    level: calculatedLevel || "beginner",
    confidence: 0.75,
    strengths: ["greeting", "formal"],
    weaknesses: ["grammar", "present-tense", "request"],
    recommendations: [
      "문법 기초 학습을 추천합니다",
      "기본 패턴 학습부터 시작하세요",
    ],
  };

  const getLevelInfo = (level: string) => {
    const levelMap = {
      beginner: {
        title: "초급",
        color: "bg-green-100 text-green-800",
        description: "기초적인 영어 패턴부터 차근차근 시작해보세요",
        icon: "🌱",
      },
      intermediate: {
        title: "중급",
        color: "bg-blue-100 text-blue-800",
        description: "실용적인 표현으로 영어 실력을 늘려나가세요",
        icon: "📈",
      },
      advanced: {
        title: "고급",
        color: "bg-purple-100 text-purple-800",
        description: "복잡한 상황에서도 자연스럽게 소통해보세요",
        icon: "🎯",
      },
    };
    return levelMap[level] || levelMap.beginner;
  };

  const levelInfo = getLevelInfo(assessment.level);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-sm mx-auto">
        {/* 완료 아이콘 */}
        <div className="text-center mb-8">
          <div className="bg-green-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            레벨 테스트 완료!
          </h1>
          <p className="text-gray-600 text-sm">
            {user?.name}님의 영어 실력을 분석했습니다
          </p>
        </div>

        {/* 레벨 결과 카드 */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 mb-6">
          <div className="text-center mb-6">
            <div className="text-3xl mb-3">{levelInfo.icon}</div>
            <div
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${levelInfo.color} mb-2`}
            >
              {levelInfo.title} 레벨
            </div>
            <p className="text-gray-600 text-sm">{levelInfo.description}</p>
          </div>

          {/* 신뢰도 표시 */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>평가 신뢰도</span>
              <span>{Math.round(assessment.confidence * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${assessment.confidence * 100}%` }}
              />
            </div>
          </div>

          {/* 강점 */}
          {assessment.strengths.length > 0 && (
            <div className="mb-4">
              <h3 className="font-medium text-gray-900 mb-2 flex items-center">
                <TrendingUp className="h-4 w-4 text-green-500 mr-2" />
                강점
              </h3>
              <div className="flex flex-wrap gap-2">
                {assessment.strengths.map((strength, index) => (
                  <span
                    key={index}
                    className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded"
                  >
                    {strength}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 개선점 (상위 3개만) */}
          {assessment.weaknesses.length > 0 && (
            <div className="mb-4">
              <h3 className="font-medium text-gray-900 mb-2 flex items-center">
                <BookOpen className="h-4 w-4 text-orange-500 mr-2" />
                집중 학습 영역
              </h3>
              <div className="flex flex-wrap gap-2">
                {assessment.weaknesses.slice(0, 3).map((weakness, index) => (
                  <span
                    key={index}
                    className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded"
                  >
                    {weakness}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 추천사항 */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-blue-900 mb-2">맞춤 학습 추천</h3>
          <ul className="space-y-1">
            {assessment.recommendations.map((rec, index) => (
              <li
                key={index}
                className="text-blue-800 text-sm flex items-start"
              >
                <span className="text-blue-500 mr-2">•</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>

        {/* 다음 단계 버튼 */}
        <button
          onClick={() => navigate("/onboarding/interests")}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
        >
          <span>관심 분야 선택하기</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
