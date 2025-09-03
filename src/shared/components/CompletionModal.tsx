// src/shared/components/CompletionModal.tsx
import React from "react";

interface CompletionModalProps {
  open: boolean;
  title: string;
  description?: string;
  totalCount?: number;
  onConfirm: () => void;
  confirmText?: string;
  onClose?: () => void; // 추가
  cancelText?: string; // 추가
}

export const CompletionModal: React.FC<CompletionModalProps> = ({
  open,
  title,
  description,
  totalCount,
  onConfirm,
  confirmText = "확인",
  onClose,
  cancelText = "닫기",
}) => {
  if (!open) return null;

  return (
    <div className="z-20 fixed inset-0 grid place-items-center bg-black/30">
      <div className="w-[320px] rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold">{title}</h3>
        {typeof totalCount === "number" && (
          <p className="mt-2 text-sm text-gray-600">
            총 {totalCount}개 학습했습니다.
          </p>
        )}
        {description && (
          <p className="mt-1 text-sm text-gray-600">{description}</p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded border text-gray-700"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded bg-blue-600 text-white"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
