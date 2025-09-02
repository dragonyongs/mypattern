// src/pages/PackSelectPage.tsx - 기존 UI 유지, AppStore 연동
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Play, Calendar, Users, Award } from "lucide-react";
import { packDataService } from "@/shared/services/packDataService";
import { useAppStore } from "@/stores/appStore";

export default function PackSelectPage() {
  const navigate = useNavigate();
  const { selectPack, selectedPackId } = useAppStore();

  const [packData, setPackData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPackData();
  }, []);

  // 이미 선택된 팩이 있으면 캘린더로 이동
  useEffect(() => {
    if (selectedPackId && packData) {
      navigate("/calendar");
    }
  }, [selectedPackId, packData, navigate]);

  const loadPackData = async () => {
    try {
      setLoading(true);
      const data = await packDataService.loadPackData("real-voca-basic");
      setPackData(data);
    } catch (err) {
      setError("팩 데이터를 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPack = (packData: any) => {
    selectPack(packData.id, packData);
    navigate("/calendar");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">학습팩을 불러우는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadPackData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        {/* 기존 UI 그대로 유지 */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">학습팩 선택</h1>
          <p className="text-gray-600">
            14일 완성 영어 학습 프로그램을
            <br />
            선택해보세요
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-200">
          <div className="flex items-center justify-between mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-blue-600" />
            </div>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
              Basic
            </span>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {packData?.title}
            </h2>
            <p className="text-gray-600 leading-relaxed">
              {packData?.subtitle}
            </p>
          </div>

          <div className="flex items-center justify-between mb-8 text-sm">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">{packData?.totalDays}일</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">12.5K+</span>
            </div>
            <div className="flex items-center gap-1">
              <Award className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">4.9★</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-8">
            {packData?.learningMethods?.slice(0, 4).map((method: any) => (
              <div
                key={method.phase}
                className="text-center p-4 bg-gray-50 rounded-lg"
              >
                <div className="text-3xl mb-2">{method.icon}</div>
                <div className="text-sm font-medium text-gray-700">
                  {method.name}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Day {method.days}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => handleSelectPack(packData)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5" />
            학습 시작하기
          </button>
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            언제든 학습을 중단하고 이어서 할 수 있어요
          </p>
        </div>
      </div>
    </div>
  );
}
