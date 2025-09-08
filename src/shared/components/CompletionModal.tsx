// CompletionModal.tsx
import React from "react";
import { CheckCircle2, X } from "lucide-react";

interface CompletionModalProps {
  open: boolean;
  title: string;
  description?: string;
  totalCount?: number;
  onConfirm: () => void;
  confirmText?: string;
  onClose?: () => void;
  cancelText?: string;
}

export const CompletionModal: React.FC<CompletionModalProps> = ({
  open,
  title,
  description,
  totalCount,
  onConfirm,
  confirmText = "다음 단계",
  onClose,
  cancelText = "나중에",
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full">
        {/* ✅ 성공 아이콘 추가 */}
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>

          {typeof totalCount === "number" && (
            <p className="text-emerald-600 font-semibold mb-2">
              총 {totalCount}개 학습 완료! 🎉
            </p>
          )}

          {description && <p className="text-gray-600 mb-6">{description}</p>}

          {/* ✅ 버튼 레이아웃 개선 */}
          <div className="flex gap-3 w-full">
            {onClose && (
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {cancelText}
              </button>
            )}

            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
