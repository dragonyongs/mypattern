import React from "react";
import { Eye } from "lucide-react";

export interface MeaningButtonProps {
  onClick: () => void;
  active?: boolean;
  className?: string;
}

export const MeaningButton: React.FC<MeaningButtonProps> = ({
  onClick,
  active = false,
  className = "",
}) => {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`inline-flex items-center gap-2 px-5 py-2.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-full text-sm font-medium transition-all disabled:opacity-50 ${
        active ? "ring-2 ring-blue-400" : ""
      } ${className}`}
      type="button"
      title="뜻 보기"
    >
      <Eye className="w-4 h-4" />
      <span className="hidden sm:inline">뜻보기</span>
    </button>
  );
};

export default MeaningButton;
