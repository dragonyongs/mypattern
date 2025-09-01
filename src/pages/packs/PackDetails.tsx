// src/pages/packs/PackDetails.tsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePackStore } from "@/stores/packStore";
import { useDailyPlanStore } from "@/stores/dailyPlanStore";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Star,
  Play,
  Download,
  Share2,
  Heart,
  CheckCircle,
  TrendingUp,
  Users,
  Target,
  Calendar,
  Zap,
} from "lucide-react";
import { Pack } from "@/entities";

const PackDetails: React.FC = () => {
  const { packId } = useParams<{ packId: string }>();
  const navigate = useNavigate();
  const { availablePacks, selectPack, selectedPack } = usePackStore();
  const { initializePlan, currentPlan } = useDailyPlanStore();

  const [pack, setPack] = useState<Pack | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (packId && availablePacks.length > 0) {
      const foundPack = availablePacks.find((p) => p.id === packId);
      setPack(foundPack || null);
    }
  }, [packId, availablePacks]);

  const handleStartPack = async () => {
    if (!pack) return;

    setIsStarting(true);
    try {
      await selectPack(pack.id);
      initializePlan(pack.id, pack.title, pack.items);
      navigate("/app/learn");
    } catch (error) {
      console.error("Failed to start pack:", error);
    } finally {
      setIsStarting(false);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "basic":
        return "bg-green-100 text-green-800 border-green-200";
      case "intermediate":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "advanced":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "vocabulary":
        return <BookOpen className="w-5 h-5" />;
      case "sentences":
        return <Zap className="w-5 h-5" />;
      case "grammar":
        return <Target className="w-5 h-5" />;
      default:
        return <BookOpen className="w-5 h-5" />;
    }
  };

  if (!pack) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            팩을 찾을 수 없습니다
          </h3>
          <button
            onClick={() => navigate("/app/packs")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            팩 목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/app/packs")}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-gray-900">
                {pack.title}
              </h1>
              <p className="text-gray-500 text-sm">{pack.description}</p>
            </div>
            <div className="flex gap-2">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Heart className="w-5 h-5 text-gray-400" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Share2 className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 메인 콘텐츠 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 팩 커버 & 기본 정보 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-48 h-48 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-20 h-20 text-blue-500" />
                </div>

                <div className="flex-1 space-y-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-bold text-gray-900">
                        {pack.title}
                      </h2>
                      <div
                        className={`px-3 py-1 rounded-full text-sm font-medium border ${getLevelColor(
                          pack.level
                        )}`}
                      >
                        {pack.level.toUpperCase()}
                      </div>
                    </div>
                    <p className="text-gray-600 leading-relaxed">
                      {pack.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <BookOpen className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                      <p className="text-lg font-semibold text-gray-900">
                        {pack.totalItems}
                      </p>
                      <p className="text-xs text-gray-500">항목</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <Clock className="w-5 h-5 text-green-500 mx-auto mb-1" />
                      <p className="text-lg font-semibold text-gray-900">
                        {pack.estimatedDays}
                      </p>
                      <p className="text-xs text-gray-500">일</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      {getTypeIcon(pack.type)}
                      <p className="text-lg font-semibold text-gray-900">
                        {pack.type}
                      </p>
                      <p className="text-xs text-gray-500">타입</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <Star className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
                      <p className="text-lg font-semibold text-gray-900">4.8</p>
                      <p className="text-xs text-gray-500">평점</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {pack.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 학습 내용 미리보기 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  학습 내용 미리보기
                </h3>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  {showPreview ? "숨기기" : "더보기"}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {pack.items.slice(0, 6).map((item, index) => (
                  <div key={item.id} className="p-3 border rounded-lg">
                    <div className="font-medium text-gray-900">{item.word}</div>
                    <div className="text-gray-600 text-sm">
                      {item.definition}
                    </div>
                  </div>
                ))}
              </div>

              {showPreview && (
                <div className="border-t pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pack.items.slice(6, 16).map((item) => (
                      <div key={item.id} className="p-3 border rounded-lg">
                        <div className="font-medium text-gray-900 mb-1">
                          {item.word}
                        </div>
                        <div className="text-gray-600 text-sm mb-2">
                          {item.definition}
                        </div>
                        {item.exampleEn && (
                          <div className="text-xs text-gray-500 italic">
                            "{item.exampleEn}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 학습 방법 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                14일 학습 과정
              </h3>
              <div className="space-y-3">
                {[
                  {
                    step: 1,
                    title: "상상하기",
                    desc: "이미지로 단어 의미 파악",
                    icon: "👁️",
                  },
                  {
                    step: 2,
                    title: "훑기",
                    desc: "전체 단어 빠르게 살펴보기",
                    icon: "📖",
                  },
                  {
                    step: 3,
                    title: "말하기",
                    desc: "발음 연습하기",
                    icon: "🎤",
                  },
                  {
                    step: 4,
                    title: "확인하기",
                    desc: "빈칸 채우기로 확인",
                    icon: "✏️",
                  },
                ].map((step) => (
                  <div
                    key={step.step}
                    className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="text-2xl">{step.icon}</div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {step.step}단계: {step.title}
                      </div>
                      <div className="text-gray-600 text-sm">{step.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 사이드바 */}
          <div className="space-y-6">
            {/* 액션 버튼들 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border sticky top-24">
              {selectedPack?.id === pack.id && currentPlan ? (
                <button
                  onClick={() => navigate("/app/learn")}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 mb-3"
                >
                  <Play className="w-5 h-5" />
                  학습 계속하기
                </button>
              ) : (
                <button
                  onClick={handleStartPack}
                  disabled={isStarting}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 mb-3"
                >
                  <Play className="w-5 h-5" />
                  {isStarting ? "시작하는 중..." : "학습 시작하기"}
                </button>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button className="flex items-center justify-center gap-2 py-2 px-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <Download className="w-4 h-4" />
                  <span className="text-sm">다운로드</span>
                </button>
                <button className="flex items-center justify-center gap-2 py-2 px-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <Heart className="w-4 h-4" />
                  <span className="text-sm">찜하기</span>
                </button>
              </div>
            </div>

            {/* 통계 정보 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h4 className="font-semibold text-gray-900 mb-4">학습 통계</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-gray-600">학습자</span>
                  </div>
                  <span className="font-medium">12,345명</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-gray-600">완주율</span>
                  </div>
                  <span className="font-medium">87%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-500" />
                    <span className="text-sm text-gray-600">평균 점수</span>
                  </div>
                  <span className="font-medium">92점</span>
                </div>
              </div>
            </div>

            {/* 추천 팩 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h4 className="font-semibold text-gray-900 mb-4">추천 팩</h4>
              <div className="space-y-3">
                {availablePacks
                  .filter((p) => p.id !== pack.id)
                  .slice(0, 2)
                  .map((recommendedPack) => (
                    <div
                      key={recommendedPack.id}
                      onClick={() =>
                        navigate(`/app/packs/${recommendedPack.id}`)
                      }
                      className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <div className="font-medium text-gray-900 text-sm">
                        {recommendedPack.title}
                      </div>
                      <div className="text-gray-600 text-xs">
                        {recommendedPack.totalItems}개 항목
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PackDetails;
