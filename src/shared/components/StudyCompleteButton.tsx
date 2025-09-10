import React from "react";

interface StudyCompleteButtonProps {
  isAllMastered: boolean;
  onComplete: () => void;
}

export const StudyCompleteButton: React.FC<StudyCompleteButtonProps> = ({
  isAllMastered,
  onComplete,
}) => {
  if (!isAllMastered) return null;

  return (
    <button
      onClick={onComplete}
      className="w-full mt-4 py-3 px-4 bg-green-500 text-white rounded-xl font-bold transition-all hover:bg-green-600"
    >
      🎉 모든 학습 완료!
    </button>
  );
};

export default StudyCompleteButton;
