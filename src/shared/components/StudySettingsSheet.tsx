// src/shared/components/StudySettingsSheet.tsx
import React, { useEffect, useMemo, useCallback, useRef } from "react";
import ReactDOM from "react-dom";
import { StudySettingsPanel } from "./StudySettingsPanel";

type Props = {
  open: boolean;
  onClose: () => void;
  settings: any;
  onModeChange: (m: "assisted" | "immersive") => void;
  onAutoChange: (v: boolean) => void;
  onAutoPlayChange?: (v: boolean) => void;
};

export const StudySettingsSheet: React.FC<Props> = ({
  open,
  onClose,
  settings,
  onModeChange,
  onAutoChange,
  onAutoPlayChange,
}) => {
  // 포털 타깃은 항상 계산
  const portalTarget = useMemo(() => document.body, []);

  // 직전 overflow 보관
  const prevOverflowRef = useRef<string>("");

  // 스크롤 락: 훅은 항상 호출, open에 반응
  useEffect(() => {
    const body = document.body;

    // 간단한 락 카운트(중첩 모달 대비)
    const getCount = () => Number(body.dataset.scrollLockCount || 0);
    const setCount = (n: number) =>
      (body.dataset.scrollLockCount = String(Math.max(0, n)));

    if (open) {
      if (getCount() === 0) {
        prevOverflowRef.current = body.style.overflow || "";
        body.style.overflow = "hidden";
      }
      setCount(getCount() + 1);
    } else {
      // open이 false로 바뀌면 즉시 한 번 해제 시도
      const next = getCount() - 1;
      setCount(next);
      if (next <= 0) {
        body.style.overflow = prevOverflowRef.current;
        delete body.dataset.scrollLockCount;
      }
    }

    // 언마운트/재렌더 시 정리
    return () => {
      if (open) {
        const next = getCount() - 1;
        setCount(next);
        if (next <= 0) {
          body.style.overflow = prevOverflowRef.current;
          delete body.dataset.scrollLockCount;
        }
      }
    };
  }, [open]); // 🔥 open 변화에 반응

  // ESC 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // 전파만 차단(모바일 클릭 무력화 방지)
  const stopBubble = useCallback((e: React.SyntheticEvent) => {
    e.stopPropagation();
  }, []);

  if (!open) return null; // 🔥 훅 이후에 조건부 반환

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z- lg:hidden" aria-modal="true" role="dialog">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px] pointer-events-auto"
        onClick={onClose}
      />
      <div
        className="absolute inset-x-0 bottom-16 z- bg-white rounded-t-2xl shadow-2xl
                   p-6 max-h-[80vh] overflow-y-auto pointer-events-auto"
        onClick={stopBubble}
        onTouchEnd={stopBubble}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-800">학습 모드</h2>
          <button
            onClick={onClose}
            onTouchEnd={onClose}
            className="w-9 h-9 -mr-2 rounded-full text-gray-500 hover:text-gray-700
                       hover:bg-gray-100 active:bg-gray-200 transition"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <StudySettingsPanel
          settings={settings}
          isSettingOpen={open}
          handleModeChange={onModeChange}
          handleAutoProgressChange={onAutoChange}
          handleAutoPlayChange={onAutoPlayChange}
        />
      </div>
    </div>,
    portalTarget
  );
};

export default StudySettingsSheet;
