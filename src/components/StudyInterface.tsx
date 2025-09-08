// src/components/StudyInterface.tsx
import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Book,
  MessageSquare,
  PenTool,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { VocabularyMode } from "./study-modes/VocabularyMode";
import { SentenceMode } from "./study-modes/SentenceMode";
import { WorkbookMode } from "./study-modes/WorkbookMode";
import { LearningMethodIntro } from "./LearningMethodIntro";
import { ErrorBoundary } from "./ErrorBoundary";
import { useAppStore } from "@/stores/appStore";
import { useStudyProgressStore } from "@/stores/studyProgressStore";
import { packDataService } from "@/shared/services/packDataService";
import type { PackData } from "@/types";
import { CompletionModal } from "@/shared/components/CompletionModal";

type StudyMode = "vocab" | "sentence" | "workbook";

export const StudyInterface: React.FC = () => {
  const navigate = useNavigate();
  const { day: dayParam } = useParams<{ day: string }>();
  const currentDay = parseInt(dayParam || "1", 10);

  const packData = useAppStore((state) => state.selectedPackData);
  const setCurrentDay = useAppStore((state) => state.setCurrentDay);
  const setModeCompleted = useStudyProgressStore(
    (state) => state.setModeCompleted
  );
  const getSettings = useStudyProgressStore((state) => state.getSettings);
  const dayProgress = useStudyProgressStore((state) =>
    packData ? state.progress[packData.id]?.progressByDay[currentDay] : null
  );

  const packId = packData?.id;
  const settings = useMemo(
    () => (packData ? getSettings(packData.id) : {}),
    [packData, getSettings]
  );

  const dayPlan = useMemo(() => {
    if (!packData) return null;
    return packData.learningPlan.days.find((d) => d.day === currentDay);
  }, [packData, currentDay]);

  const toStudyModeKey = useCallback((t: string): StudyMode | null => {
    if (t.includes("vocab")) return "vocab";
    if (t.includes("sentence")) return "sentence";
    if (t.includes("workbook")) return "workbook";
    return null;
  }, []);

  const availableModeKeys = useMemo<StudyMode[]>(() => {
    if (!dayPlan) return [];
    return dayPlan.modes
      .map((m) => toStudyModeKey(m.type))
      .filter((v): v is StudyMode => Boolean(v));
  }, [dayPlan, toStudyModeKey]);

  const [currentMode, setCurrentMode] = useState<StudyMode>("vocab");
  useEffect(() => {
    if (availableModeKeys.length && !availableModeKeys.includes(currentMode)) {
      setCurrentMode(availableModeKeys[0]);
    }
  }, [availableModeKeys, currentMode]);

  const [completion, setCompletion] = useState<{
    open: boolean;
    completed: StudyMode | null;
  }>({
    open: false,
    completed: null,
  });

  const typeFor = useCallback(
    (mode: StudyMode): string | undefined => {
      return dayPlan?.modes.find((m) => {
        if (mode === "vocab") return m.type.includes("vocab");
        if (mode === "sentence") return m.type.includes("sentence");
        if (mode === "workbook") return m.type.includes("workbook");
        return false;
      })?.type;
    },
    [dayPlan]
  );

  // ✅ 개선된 데이터 처리: 하나의 컨텐츠 풀에서 모드별로 변환
  const getSharedContent = useCallback(() => {
    if (!packData || !dayPlan)
      return { vocab: [], sentences: [], workbook: [] };

    // 모든 컨텐츠 ID 수집
    const allContentIds = dayPlan.modes.flatMap((mode) => mode.contentIds);
    const allContents = packDataService.getContentsByIds(
      packData,
      allContentIds
    );

    // 타입별로 분류
    const vocab = allContents.filter((item) => item.type === "vocabulary");
    const sentences = allContents.filter((item) => item.type === "sentence");
    const workbook = allContents.filter((item) => item.type === "workbook");

    return { vocab, sentences, workbook };
  }, [packData, dayPlan]);

  // ✅ 모드별 데이터 변환 (중복 없이)
  const getModeData = useCallback(
    (mode: StudyMode) => {
      const { vocab, sentences, workbook } = getSharedContent();

      switch (mode) {
        case "vocab":
          return vocab; // 단어 중심 보기
        case "sentence":
          return sentences; // 문장 중심 보기 (targetWords 강조)
        case "workbook":
          return workbook; // 빈칸 문제 보기
        default:
          return [];
      }
    },
    [getSharedContent]
  );

  const getItemProgress = useCallback(
    (itemId: string) => {
      if (!packData) return { isCompleted: false, lastStudied: null };

      // 개별 아이템 완료 상태 조회
      return useStudyProgressStore
        .getState()
        .getItemProgress(packData.id, currentDay, itemId);
    },
    [packData, currentDay]
  );

  // ✅ 개별 아이템 완료 처리 함수 추가
  const handleItemCompleted = useCallback(
    (itemId: string, completed: boolean = true) => {
      if (!packData) return;

      console.log(`🎯 Item completed: ${itemId} = ${completed}`);

      useStudyProgressStore
        .getState()
        .setItemCompleted(packData.id, currentDay, itemId, completed);
    },
    [packData, currentDay]
  );

  const handleBack = useCallback(() => {
    navigate("/calendar");
  }, [navigate]);

  const handleModeComplete = useCallback(
    (completedMode: StudyMode) => {
      if (completion.open || !packData || !dayPlan) return;

      const completedType = typeFor(completedMode);
      if (completedType) {
        setModeCompleted(packData.id, currentDay, completedType, packData);
      }

      const seq = availableModeKeys;
      const idx = seq.indexOf(completedMode);
      const next = idx >= 0 && idx < seq.length - 1 ? seq[idx + 1] : null;

      if (settings?.autoProgressEnabled && next) {
        setCurrentMode(next);
        return;
      }
      setCompletion({ open: true, completed: completedMode });
    },
    [
      completion.open,
      packData,
      dayPlan,
      currentDay,
      setModeCompleted,
      settings,
      availableModeKeys,
      typeFor,
    ]
  );

  const handleConfirmNext = useCallback(() => {
    if (!completion.completed) {
      setCompletion({ open: false, completed: null });
      return;
    }
    const seq = availableModeKeys;
    const idx = seq.indexOf(completion.completed);
    const next = idx >= 0 && idx < seq.length - 1 ? seq[idx + 1] : null;

    if (next) {
      setCurrentMode(next);
    } else {
      const nextDay = currentDay + 1;
      if (nextDay <= (packData?.learningPlan.totalDays ?? 14)) {
        setCurrentDay(nextDay);
        navigate("/calendar");
      } else {
        navigate("/calendar");
      }
    }
    setCompletion({ open: false, completed: null });
  }, [
    availableModeKeys,
    completion.completed,
    currentDay,
    navigate,
    setCurrentDay,
    packData,
  ]);

  const handleCloseModal = useCallback(() => {
    setCompletion({ open: false, completed: null });
  }, []);

  // 검증 로직들 (기존과 동일)
  if (!packData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800">
            학습 데이터가 없습니다
          </h2>
          <p className="text-gray-500 mt-2">학습팩을 먼저 선택해주세요.</p>
          <button
            onClick={() => navigate("/")}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            홈으로 이동
          </button>
        </div>
      </div>
    );
  }

  if (!packId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800">
            학습팩 ID가 없습니다
          </h2>
          <p className="text-gray-500 mt-2">
            올바르지 않은 학습팩 데이터입니다.
          </p>
          <button
            onClick={() => navigate("/")}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            홈으로 이동
          </button>
        </div>
      </div>
    );
  }

  if (!dayPlan) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-700">
            Day {currentDay} 데이터를 찾을 수 없습니다.
          </p>
          <button
            onClick={handleBack}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            달력으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // Day 1 소개 화면
  if (currentDay === 1 && dayPlan.modes[0]?.type === "introduction") {
    return (
      <ErrorBoundary>
        <LearningMethodIntro
          methods={packData.learningMethods}
          packId={packId}
          onComplete={() => {
            setCurrentDay(2);
            navigate("/calendar");
          }}
        />
      </ErrorBoundary>
    );
  }

  // ✅ 개선된 컨텐츠 렌더링: 공통 데이터를 모드별로 다르게 표현
  const renderContent = () => {
    const items = getModeData(currentMode);
    const sharedContent = getSharedContent(); // 전체 컨텐츠 컨텍스트 제공

    switch (currentMode) {
      case "vocab":
        return (
          <ErrorBoundary>
            <VocabularyMode
              items={items}
              dayNumber={currentDay}
              category="단어 학습"
              packId={packData.id}
              settings={settings}
              getItemProgress={getItemProgress}
              onItemCompleted={handleItemCompleted}
              sharedContent={sharedContent} // 연관된 문장 정보도 함께 전달
              onComplete={() => handleModeComplete("vocab")}
            />
          </ErrorBoundary>
        );
      case "sentence":
        return (
          <ErrorBoundary>
            <SentenceMode
              items={items}
              dayNumber={currentDay}
              category="문장 학습"
              packId={packData.id}
              settings={settings}
              getItemProgress={getItemProgress}
              onItemCompleted={handleItemCompleted}
              sharedContent={sharedContent} // 연관된 단어 정보도 함께 전달
              onComplete={() => handleModeComplete("sentence")}
            />
          </ErrorBoundary>
        );
      case "workbook":
        return (
          <ErrorBoundary>
            <WorkbookMode
              items={items}
              dayNumber={currentDay}
              category="워크북"
              packId={packData.id}
              settings={settings}
              getItemProgress={getItemProgress}
              onItemCompleted={handleItemCompleted}
              sharedContent={sharedContent} // 연관된 문장/단어 정보도 함께 전달
              onComplete={() => handleModeComplete("workbook")}
            />
          </ErrorBoundary>
        );
      default:
        return null;
    }
  };

  // 나머지 UI 코드는 기존과 동일...
  const studyModes = useMemo(() => {
    const labelMap: Record<StudyMode, string> = {
      vocab: "단어",
      sentence: "문장",
      workbook: "워크북",
    };
    const iconMap: Record<StudyMode, React.ComponentType<any>> = {
      vocab: Book,
      sentence: MessageSquare,
      workbook: PenTool,
    };

    return availableModeKeys.map((key, idx) => {
      const typeInPlan =
        dayPlan?.modes.find(
          (m) =>
            (key === "vocab" && m.type.includes("vocab")) ||
            (key === "sentence" && m.type.includes("sentence")) ||
            (key === "workbook" && m.type.includes("workbook"))
        )?.type || "";

      const prevKey = idx > 0 ? availableModeKeys[idx - 1] : null;
      const prevTypeInPlan =
        prevKey &&
        (dayPlan?.modes.find(
          (m) =>
            (prevKey === "vocab" && m.type.includes("vocab")) ||
            (prevKey === "sentence" && m.type.includes("sentence")) ||
            (prevKey === "workbook" && m.type.includes("workbook"))
        )?.type ||
          "");

      const completed = dayProgress?.completedModes[typeInPlan] ?? false;
      const available =
        idx === 0
          ? true
          : prevTypeInPlan
          ? dayProgress?.completedModes[prevTypeInPlan] ?? false
          : false;

      return {
        key,
        label: labelMap[key],
        icon: iconMap[key],
        completed,
        available,
      };
    });
  }, [availableModeKeys, dayPlan, dayProgress]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* 헤더 */}
        <header className="bg-white shadow-sm border-b border-slate-200">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-2 py-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">뒤로</span>
            </button>
            <div className="text-center">
              <h1 className="text-lg font-bold text-slate-900">
                Day {currentDay}
              </h1>
              <p className="text-xs text-slate-500">{dayPlan.title}</p>
            </div>
            <div className="w-16"></div>
          </div>
        </header>

        {/* 모드 탭 */}
        <nav className="bg-white border-b border-slate-200 px-4 py-3">
          <div className="flex justify-center items-center gap-2 overflow-x-auto">
            {studyModes.map(
              ({ key, label, icon: Icon, completed, available }) => (
                <button
                  key={key}
                  onClick={() => available && setCurrentMode(key as StudyMode)}
                  disabled={!available}
                  className={`
                  flex items-center gap-2.5 px-4 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap
                  transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1
                  ${
                    currentMode === key
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25 scale-105"
                      : available
                      ? completed
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 hover:shadow-sm"
                        : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 hover:text-slate-900 hover:shadow-sm"
                      : "bg-slate-50 text-slate-400 border border-slate-100 cursor-not-allowed opacity-50"
                  }
                `}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                  {completed && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  )}
                </button>
              )
            )}
          </div>
        </nav>

        {/* 컨텐츠 영역 */}
        <main className="flex-1 bg-slate-50">{renderContent()}</main>

        {/* 완료 모달 */}
        <CompletionModal
          isOpen={completion.open}
          onClose={handleCloseModal}
          onConfirm={handleConfirmNext}
          title="학습 완료!"
          message="다음 단계로 이동하시겠습니까?"
        />
      </div>
    </ErrorBoundary>
  );
};
