// src/features/learn/components/DailyPatternsSection.tsx
import React, { useMemo, useState, useEffect } from "react";
import {
  BookOpen,
  Play,
  ArrowRight,
  CheckCircle,
  Clock,
  Target,
  Volume2,
  Edit3,
} from "lucide-react";
import { useLearningStore } from "@/stores/learningStore";
import { featureFlags } from "@/shared/config/featureFlags";
import { TranslationPractice } from "../components/TranslationPractice";
import { PatternLearningModal } from "./PatternLearningModal";
import { EditPatternModal } from "./EditPatternModal";

export const DailyPatternsSection: React.FC = React.memo(() => {
  const { dailyPatterns, userProgress, getPatternProgress, uiIntent } =
    useLearningStore();

  const [selectedPattern, setSelectedPattern] = useState<
    (typeof dailyPatterns)[number] | null
  >(null);
  const [showPractice, setShowPractice] = useState(false);
  const [showLearningModal, setShowLearningModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // UI 인텐트 반응: 큐에 추가 직후 자동 모달 오픈
  useEffect(() => {
    if (!uiIntent?.patternId || !uiIntent.mode) return;
    const p = dailyPatterns.find((x) => x.id === uiIntent.patternId);
    if (!p) return;
    setSelectedPattern(p);
    if (uiIntent.mode === "voice") setShowLearningModal(true);
    if (uiIntent.mode === "write") setShowPractice(true);
    if (uiIntent.mode === "edit") setShowEditModal(true);
  }, [uiIntent?.token, uiIntent?.patternId, uiIntent?.mode, dailyPatterns]);

  const completedCount = useMemo(
    () => dailyPatterns.filter((p) => p.completed).length,
    [dailyPatterns]
  );
  const progressPercent = useMemo(
    () =>
      dailyPatterns.length > 0
        ? (completedCount / dailyPatterns.length) * 100
        : 0,
    [completedCount, dailyPatterns.length]
  );

  const getPatternStatus = (pattern: (typeof dailyPatterns)[number]) => {
    if (pattern.completed) return "completed";
    const progress = getPatternProgress(pattern.id);
    if (!progress) return "not-started";
    if (progress.masteryLevel >= 80) return "mastered";
    if (progress.masteryLevel >= 50) return "practiced";
    return "learning";
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-50 border-green-200";
      case "mastered":
        return "bg-blue-50 border-blue-200";
      case "practiced":
        return "bg-yellow-50 border-yellow-200";
      case "learning":
        return "bg-orange-50 border-orange-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "mastered":
        return <Target className="h-4 w-4 text-blue-600" />;
      case "practiced":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "learning":
        return <Play className="h-4 w-4 text-orange-600" />;
      default:
        return <Play className="h-4 w-4 text-gray-600" />;
    }
  };

  // 브라우저 기본 TTS
  const playTTS = (text: string) => {
    if (!featureFlags.webTTSEnabled) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  // 아이콘/버튼 핸들러
  const openTTS = (pattern: (typeof dailyPatterns)[number]) =>
    playTTS(pattern.text);
  const openVoiceLesson = (pattern: (typeof dailyPatterns)[number]) => {
    setSelectedPattern(pattern);
    setShowLearningModal(true); // 항상 모달 사용
  };
  const openWritingPractice = (pattern: (typeof dailyPatterns)[number]) => {
    setSelectedPattern(pattern);
    setShowPractice(true);
  };
  const openEditPattern = (pattern: (typeof dailyPatterns)[number]) => {
    setSelectedPattern(pattern);
    setShowEditModal(true);
  };

  const handleStartAllVoice = () => {
    const first = dailyPatterns.find((p) => !p.completed) || dailyPatterns;
    if (first) openVoiceLesson(first);
  };
  const handleStartAllWriting = () => {
    const first = dailyPatterns.find((p) => !p.completed) || dailyPatterns;
    if (first) openWritingPractice(first);
  };

  return (
    <>
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <BookOpen className="h-5 w-5 text-blue-500 mr-2" />
            오늘의 핵심 패턴
          </h2>
          <div className="text-right">
            <span className="text-sm text-gray-500">
              {userProgress.level} 레벨
            </span>
            <div className="text-xs text-gray-400">
              {completedCount}/{dailyPatterns.length} 완료
            </div>
          </div>
        </div>

        {dailyPatterns.length > 0 && (
          <div className="mb-4">
            <div
              className="w-full bg-gray-200 rounded-full h-3"
              role="progressbar"
              aria-valuenow={Math.round(progressPercent)}
            >
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300 flex items-center justify-end pr-2"
                style={{ width: `${progressPercent}%` }}
              >
                {progressPercent > 18 && (
                  <span className="text-xs font-medium text-white">
                    {Math.round(progressPercent)}%
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {dailyPatterns.map((pattern) => {
            const status = getPatternStatus(pattern);
            const progress = getPatternProgress(pattern.id);
            return (
              <div
                key={pattern.id}
                className={`border rounded-lg ${getStatusColor(status)}`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        {getStatusIcon(status)}
                        <span className="ml-2 font-medium text-gray-900">
                          {pattern.text}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mb-1">
                        {pattern.korean}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="capitalize">{pattern.category}</span>
                        <span>{pattern.estimatedTime}분 소요</span>
                        {progress && (
                          <span>마스터리: {progress.masteryLevel}%</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="TTS"
                        onClick={() => openTTS(pattern)}
                        className="p-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200"
                        title="원어민 발음(TTS)"
                      >
                        <Volume2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="패턴 학습(음성)"
                        onClick={() => openVoiceLesson(pattern)}
                        className="p-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200"
                        title="패턴 학습(음성 모달)"
                      >
                        <Play className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="패턴 수정"
                        onClick={() => openEditPattern(pattern)}
                        className="p-2 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                        title="패턴 수정"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 하단 버튼: 두 모드 병렬 제공 */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleStartAllVoice}
            disabled={dailyPatterns.every((p) => p.completed)}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              dailyPatterns.every((p) => p.completed)
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            <span>패턴 학습 시작하기</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={handleStartAllWriting}
            className="w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700"
          >
            <span>영작하기</span>
            <Edit3 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 규칙 기반 영작 모달 */}
      {selectedPattern && showPractice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg">
            <TranslationPractice
              patternId={selectedPattern.id}
              initialKorean={selectedPattern.korean}
              initialEnglishHint={selectedPattern.text}
              onComplete={() => {
                setShowPractice(false);
                setSelectedPattern(null);
              }}
            />
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowPractice(false);
                  setSelectedPattern(null);
                }}
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 패턴 학습(음성) 모달 */}
      {selectedPattern && showLearningModal && (
        <PatternLearningModal
          pattern={selectedPattern}
          isOpen={showLearningModal}
          onClose={() => {
            setShowLearningModal(false);
            setSelectedPattern(null);
          }}
        />
      )}

      {/* 패턴 수정 모달 */}
      {selectedPattern && showEditModal && (
        <EditPatternModal
          initialKorean={selectedPattern.korean}
          initialEnglish={selectedPattern.text}
          patternId={selectedPattern.id}
          onClose={() => {
            setShowEditModal(false);
            setSelectedPattern(null);
          }}
        />
      )}
    </>
  );
});

DailyPatternsSection.displayName = "DailyPatternsSection";
