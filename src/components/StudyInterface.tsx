// src/components/StudyInterface.tsx
import React, { useState, useCallback, useMemo } from "react";
import {
  ArrowLeft,
  Book,
  MessageSquare,
  PenTool,
  Calendar,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { VocabularyMode } from "./study-modes/VocabularyMode";
import { SentenceMode } from "./study-modes/SentenceMode";
import { WorkbookMode } from "./study-modes/WorkbookMode";
import { LearningMethodIntro } from "./LearningMethodIntro";
import { useAppStore } from "@/stores/appStore";
import { useStudyProgressStore } from "@/stores/studyProgressStore";
import { useDayProgress } from "@/shared/hooks/useAppHooks";
import type { StudyMode, PackData } from "@/types";
import { CompletionModal } from "../shared/components/CompletionModal";
interface StudyInterfaceProps {
  pack: PackData;
  currentDay: number;
  currentMode: StudyMode;
  onModeChange: (mode: StudyMode) => void;
}

export const StudyInterface: React.FC<StudyInterfaceProps> = ({
  pack,
  currentDay,
  currentMode,
  onModeChange,
}) => {
  const navigate = useNavigate();
  const { setCurrentDay } = useAppStore();
  const { getDayProgress, isModeAvailable, getSettings } =
    useStudyProgressStore();
  const settings = useMemo(() => getSettings(pack.id), [pack.id, getSettings]);
  const [completion, setCompletion] = useState<{
    open: boolean;
    completed: StudyMode | null;
  }>({
    open: false,
    completed: null,
  });
  const [pendingMode, setPendingMode] = useState<StudyMode | null>(null);
  const { dayProgress, markModeCompleted, isModeAccessible } = useDayProgress(
    pack.id,
    currentDay
  );

  const dayData = useMemo(() => {
    return pack.days.find((d) => d.day === currentDay);
  }, [pack.days, currentDay]);

  const studyModes = useMemo(
    () => [
      {
        key: "vocab" as StudyMode,
        label: "단어",
        icon: Book,
        completed: dayProgress.vocab,
        available: isModeAccessible("vocab"), // 🎯 수정된 로직
      },
      {
        key: "sentence" as StudyMode,
        label: "문장",
        icon: MessageSquare,
        completed: dayProgress.sentence,
        available: isModeAccessible("sentence"), // 🎯 수정된 로직
      },
      {
        key: "workbook" as StudyMode,
        label: "워크북",
        icon: PenTool,
        completed: dayProgress.workbook,
        available: isModeAccessible("workbook"), // 🎯 수정된 로직
      },
    ],
    [dayProgress, isModeAccessible]
  );

  const handleBack = useCallback(() => {
    navigate("/calendar");
  }, [navigate]);

  // Day1 학습방법 소개 완료시
  const handleIntroComplete = useCallback(() => {
    setCurrentDay(2);
    onModeChange("vocab");
    navigate("/calendar");
  }, [setCurrentDay, onModeChange, navigate]);

  const handleModeChange = useCallback(
    (mode: StudyMode) => {
      const modeData = studyModes.find((m) => m.key === mode);
      if (!modeData) return;

      if (modeData.completed) {
        // ✅ 추가
        setPendingMode(mode);
        setCompletion({ open: true, completed: mode });
        return;
      }
      if (modeData.available) onModeChange(mode);
    },
    [studyModes, onModeChange]
  );

  const nextModeMap: Record<StudyMode, StudyMode | null> = useMemo(
    () => ({
      vocab: "sentence",
      sentence: "workbook",
      workbook: null,
    }),
    []
  );

  // 🎯 각 학습 모드 완료시 호출되는 핸들러

  const handleModeComplete = useCallback(
    (completedMode: StudyMode) => {
      if (completion.open) return; // 이미 열려 있으면 무시
      // 기존: 즉시 onModeChange(nextMode) → 제거
      const nextMode = nextModeMap[completedMode];

      // 자동 진행이 필요한 경우에만 즉시 전환(옵션)
      if (settings?.autoProgressEnabled && nextMode) {
        onModeChange(nextMode);
        return;
      }

      // 기본: 모달만 띄우고 현재 모드 유지
      setCompletion({ open: true, completed: completedMode });
    },
    [completion.open, nextModeMap, onModeChange, settings]
  );

  const handleConfirmNext = useCallback(() => {
    if (!completion.completed) return;
    const nextMode = nextModeMap[completion.completed];
    setCompletion({ open: false, completed: null });

    if (nextMode) {
      onModeChange(nextMode);
    } else {
      // 워크북 완료 후 다음 날 이동 로직은 유지
      const nextDay = currentDay + 1;
      if (nextDay <= 14) {
        setCurrentDay(nextDay);
        onModeChange("vocab");
        navigate("/calendar");
      } else {
        navigate("/calendar");
      }
    }
  }, [
    completion,
    nextModeMap,
    currentDay,
    setCurrentDay,
    onModeChange,
    navigate,
  ]);

  if (!dayData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600 mb-4">
            Day {currentDay} 데이터를 찾을 수 없습니다.
          </p>
          <button
            onClick={handleBack}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            달력으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // Day 1: 학습 방법 소개
  if (currentDay === 1 && dayData.type === "introduction") {
    return (
      <LearningMethodIntro
        methods={pack.learningMethods}
        onComplete={handleIntroComplete}
      />
    );
  }

  // 일반 학습 모드
  const renderContent = () => {
    if (!dayData) return null;

    switch (currentMode) {
      case "vocab":
        return (
          <VocabularyMode
            vocabularies={dayData?.vocabularies || []}
            dayNumber={currentDay}
            category={dayData?.category}
            packId={pack.id}
            onComplete={() => handleModeComplete("vocab")}
          />
        );
      case "sentence":
        return (
          <SentenceMode
            sentences={(dayData as any)?.sentences ?? []} // ✅ 배열 보장
            dayNumber={currentDay}
            category={
              (dayData as any)?.category ?? (dayData as any)?.title ?? ""
            }
            packId={pack.id} // ✅ 공통 설정용
            onComplete={() => handleModeComplete("sentence")} // ✅ 상위 모달
          />
        );
      case "workbook":
        return (
          <WorkbookMode
            workbook={dayData.workbook || []}
            dayNumber={currentDay}
            category={dayData.category || dayData.title || `Day ${currentDay}`}
            packId={pack.id}
            onComplete={() => handleModeComplete("workbook")}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">달력으로</span>
            </button>

            <div className="text-center">
              <h1 className="text-lg font-semibold text-gray-800">
                Day {currentDay}
              </h1>
              <p className="text-sm text-gray-600">
                {dayData.category || dayData.title}
              </p>
              {dayData.page && (
                <p className="text-xs text-gray-500">p.{dayData.page}</p>
              )}
            </div>

            <button
              onClick={() => navigate("/calendar")}
              className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <Calendar className="w-5 h-5" />
            </button>
          </div>

          {/* 모드 선택 탭 */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {studyModes.map(
              ({ key, label, icon: Icon, completed, available }) => (
                <button
                  key={key}
                  onClick={() => handleModeChange(key)}
                  disabled={!available}
                  className={`
                    flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md transition-all font-medium text-sm
                    ${
                      currentMode === key
                        ? "bg-white text-blue-600 shadow-sm"
                        : available
                        ? "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                        : "text-gray-400 cursor-not-allowed"
                    }
                    ${completed ? "bg-green-50 text-green-700" : ""}
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                  {completed && (
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                  )}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* 컨텐츠 */}
      <div className="max-w-4xl mx-auto px-4 py-6">{renderContent()}</div>

      <CompletionModal
        open={completion.open}
        title={
          completion.completed === "vocab"
            ? "단어 학습 완료"
            : completion.completed === "sentence"
            ? "문장 학습 완료"
            : "워크북 학습 완료"
        }
        description={
          completion.completed === "vocab"
            ? "문장 모드로 이동해 문맥 속에서 단어를 연결해 보세요."
            : undefined
        }
        onConfirm={handleConfirmNext}
        confirmText="다음으로"
        onClose={() => {
          // ✅ 기존 탭 UI 유지, 전환만 보류분 이행
          if (pendingMode) onModeChange(pendingMode);
          setPendingMode(null);
          setCompletion({ open: false, completed: null });
        }}
        cancelText={
          completion.completed === "vocab" ? "단어 다시 보기" : "닫기"
        }
      />
    </div>
  );
};
