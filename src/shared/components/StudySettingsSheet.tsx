// src/shared/components/StudySettingsSheet.tsx
import React from "react";
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
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        className="absolute inset-0 bg-black/40"
        aria-label="닫기"
        onClick={onClose}
      />
      <div
        className="absolute bottom-0 inset-x-0 bg-white rounded-t-2xl p-4 shadow-xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="mx-auto max-w-screen-sm">
          <StudySettingsPanel
            settings={settings}
            handleModeChange={onModeChange}
            handleAutoProgressChange={onAutoChange}
            handleAutoPlayChange={onAutoPlayChange}
          />
        </div>
      </div>
    </div>
  );
};
export default StudySettingsSheet;
