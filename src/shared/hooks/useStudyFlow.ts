// src/shared/hooks/useStudyFlow.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import { useItemCompletion } from "@/shared/hooks/useItemCompletion";
import { useStudySettings } from "@/shared/hooks/useAppHooks";

export type StudyFlowParams = {
  packId: string;
  dayNumber: number;
  itemIds: string[];
  onComplete?: () => void;
};

export function useStudyFlow({
  packId,
  dayNumber,
  itemIds,
  onComplete,
}: StudyFlowParams) {
  const safePackId = packId || "default";
  const { settings } = useStudySettings(safePackId); // 공통 설정을 모드 간 공유 사용
  const { isItemCompleted, completeIfNeeded, completedCount, allCompleted } =
    useItemCompletion(safePackId, dayNumber, itemIds);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showDetail, setShowDetail] = useState(false); // 단어: 의미, 문장: 해석
  const [openCompleteModal, setOpenCompleteModal] = useState(false);

  const currentItemId = useMemo(
    () => itemIds[currentIndex],
    [itemIds, currentIndex]
  );
  const currentCompleted = currentItemId
    ? isItemCompleted(currentItemId)
    : false;

  // 의미/해석 보기: 완료 트리거 제외
  const onToggleDetail = useCallback(() => {
    setShowDetail((p) => !p);
  }, []);

  // “학습 완료” 버튼: 의도 기반 완료
  const onMarkCompleted = useCallback(() => {
    if (!currentItemId) return;
    completeIfNeeded(currentItemId);
  }, [currentItemId, completeIfNeeded]);

  // 다음/이전 이동
  const onNext = useCallback(
    (total: number) => {
      if (!currentItemId) return;
      // 설정이 허용할 때만 자동 완료
      const completeOnNext = Boolean(
        (settings as any)?.autoAdvance || (settings as any)?.completeOnNext
      );
      if (completeOnNext && !isItemCompleted(currentItemId)) {
        completeIfNeeded(currentItemId);
      }
      if (currentIndex < total - 1) {
        setCurrentIndex((p) => p + 1);
        setShowDetail(false);
      }
    },
    [currentItemId, currentIndex, completeIfNeeded, isItemCompleted, settings]
  );

  const onPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((p) => p - 1);
      setShowDetail(false);
    }
  }, [currentIndex]);

  const goToIndex = useCallback((index: number) => {
    setCurrentIndex(index);
    setShowDetail(false);
  }, []);

  // 전체 완료 시 공통 모달
  useEffect(() => {
    if (allCompleted) {
      setOpenCompleteModal(true);
    }
  }, [allCompleted]);

  const onConfirmCompleteModal = useCallback(() => {
    setOpenCompleteModal(false);
    onComplete?.();
  }, [onComplete]);

  return {
    // 상태
    currentIndex,
    showDetail,
    openCompleteModal,
    currentCompleted,
    completedCount,
    allCompleted,
    // 행위
    onToggleDetail,
    onMarkCompleted,
    onNext,
    onPrev,
    goToIndex,
    onConfirmCompleteModal,
    // 조회
    isItemCompleted,
  };
}
