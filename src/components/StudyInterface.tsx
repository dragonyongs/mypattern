// src/components/StudyInterface.tsx
import React, { useState, useCallback, useMemo } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react"; // 🔥 Book, MessageSquare, PenTool 제거
import { useNavigate } from "react-router-dom";
import { VocabularyMode } from "./study-modes/VocabularyMode";
import { SentenceMode } from "./study-modes/SentenceMode";
import { WorkbookMode } from "./study-modes/WorkbookMode";
import { LearningMethodIntro } from "./LearningMethodIntro";
import { useAppStore } from "@/stores/appStore";
import { useStudyProgressStore } from "@/stores/studyProgressStore";
import { useDayProgress } from "@/shared/hooks/useAppHooks";
import { useStudyModeManager } from "@/shared/hooks/useStudyModeManager"; // 🔥 훅 import
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

  // 🔥 공통 훅 사용
  const { studyModes, handleModeSwitch } = useStudyModeManager(
    pack.id,
    currentDay,
    currentMode,
    onModeChange
  );

  const { setCurrentDay } = useAppStore();
  const { getSettings } = useStudyProgressStore();
  const settings = useMemo(() => getSettings(pack.id), [pack.id, getSettings]);

  const [completion, setCompletion] = useState<{
    open: boolean;
    completed: StudyMode | null;
  }>({
    open: false,
    completed: null,
  });

  const [pendingMode, setPendingMode] = useState<StudyMode | null>(null);

  const { dayProgress, markModeCompleted } = useDayProgress(
    pack.id,
    currentDay
  );

  const dayData = useMemo(() => {
    return pack.days.find((d) => d.day === currentDay);
  }, [pack.days, currentDay]);

  const handleBack = useCallback(() => {
    navigate("/calendar");
  }, [navigate]);

  const handleIntroComplete = useCallback(() => {
    setCurrentDay(2);
    onModeChange("vocab");
    navigate("/calendar");
  }, [setCurrentDay, onModeChange, navigate]);

  // 🔥 간단해진 모드 변경 핸들러
  const handleModeChange = useCallback(
    (mode: StudyMode) => {
      const success = handleModeSwitch(mode);
      if (!success) {
        // 접근 불가능한 모드에 대한 피드백
        setCompletion({
          open: true,
          completed: null,
        });
      }
    },
    [handleModeSwitch]
  );

  const nextModeMap: Record<StudyMode, StudyMode | null> = useMemo(
    () => ({ vocab: "sentence", sentence: "workbook", workbook: null }),
    []
  );

  const handleModeComplete = useCallback(
    (completedMode: StudyMode) => {
      if (completion.open) return;
      markModeCompleted(currentDay, completedMode);
      const nextMode = nextModeMap[completedMode];
      if (settings?.autoProgressEnabled && nextMode) {
        onModeChange(nextMode);
        return;
      }
      setCompletion({ open: true, completed: completedMode });
    },
    [
      completion.open,
      markModeCompleted,
      currentDay,
      nextModeMap,
      onModeChange,
      settings,
    ]
  );

  const handleConfirmNext = useCallback(() => {
    if (pendingMode) {
      onModeChange(pendingMode);
    } else if (completion.completed) {
      const nextMode = nextModeMap[completion.completed];
      if (nextMode) {
        onModeChange(nextMode);
      } else {
        const nextDay = currentDay + 1;
        if (nextDay <= 14) {
          setCurrentDay(nextDay);
          onModeChange("vocab");
        }
        navigate("/calendar");
      }
    }
    setPendingMode(null);
    setCompletion({ open: false, completed: null });
  }, [
    completion,
    pendingMode,
    nextModeMap,
    currentDay,
    setCurrentDay,
    onModeChange,
    navigate,
  ]);

  const handleCloseModal = useCallback(() => {
    setPendingMode(null);
    setCompletion({ open: false, completed: null });
  }, []);

  if (!dayData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Day {currentDay} 데이터를 찾을 수 없습니다.
          </p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            달력으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (currentDay === 1 && dayData.type === "introduction") {
    const methodNames = dayData.methods || [];
    const allMethods = pack.learningMethods || [];
    const introductionMethods = methodNames
      .map((name) => allMethods.find((method) => method.name === name))
      .filter(Boolean);

    return (
      <LearningMethodIntro
        methods={introductionMethods}
        packId={pack.id}
        onComplete={handleIntroComplete}
      />
    );
  }

  // src/components/StudyInterface.tsx
  const renderContent = () => {
    if (!dayData) return null;

    switch (currentMode) {
      case "vocab":
        return (
          <VocabularyMode
            items={dayData.vocabularies || []} // 🔥 dayData -> items
            dayNumber={currentDay}
            category="단어 학습" // 🔥 새로운 prop
            packId={pack.id} // 🔥 새로운 prop
            onComplete={() => handleModeComplete("vocab")}
          />
        );
      case "sentence":
        return (
          <SentenceMode
            items={dayData.sentences || []} // 🔥 구조 맞춤
            dayNumber={currentDay}
            category="문장 학습"
            packId={pack.id}
            onComplete={() => handleModeComplete("sentence")}
          />
        );
      case "workbook":
        return (
          <WorkbookMode
            items={dayData.workbook || []} // 🔥 구조 맞춤
            dayNumber={currentDay}
            category="워크북"
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
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <h2 className="text-lg font-semibold">Day {currentDay}</h2>
              <p className="text-sm text-gray-600">{dayData.pageRange}</p>
            </div>
            <div></div>
          </div>

          {/* 🔥 모드 탭들 - 수정된 부분 */}
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            {studyModes.map(
              ({ key, label, icon: Icon, completed, available }) => (
                <button
                  key={key}
                  onClick={() => handleModeChange(key)}
                  disabled={!available}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md transition-all font-medium text-sm focus:outline-none ${
                    currentMode === key
                      ? "bg-white text-blue-600 shadow-sm"
                      : available
                      ? completed
                        ? "bg-green-50 text-green-700 hover:bg-green-100 cursor-pointer"
                        : "text-gray-600 hover:bg-gray-200 cursor-pointer"
                      : "text-gray-400 cursor-not-allowed bg-gray-200/80"
                  }`}
                >
                  <Icon className="w-4 h-4" /> {/* 🔥 이제 올바른 컴포넌트 */}
                  {label}
                  {completed && <CheckCircle2 className="w-4 h-4" />}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* 컨텐츠 */}
      <div className="w-full h-full mx-auto">{renderContent()}</div>

      {/* 완료 모달 */}
      <CompletionModal
        isOpen={completion.open}
        onClose={handleCloseModal}
        onConfirm={handleConfirmNext}
        title={
          pendingMode
            ? `이미 완료한 '${completion.completed}' 학습으로 이동하시겠습니까?`
            : `수고하셨습니다! 다음 학습을 이어서 진행해 주세요.`
        }
      />
    </div>
  );
};
