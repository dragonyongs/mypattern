import React from "react";
import { Volume2 } from "lucide-react";

export interface SpeakButtonProps {
  text: string;
  onSpeak: (text: string) => void;
  isSpeaking?: boolean;
  className?: string;
  disabled?: boolean;
}

export const SpeakButton: React.FC<SpeakButtonProps> = ({
  text,
  onSpeak,
  isSpeaking = false,
  className = "",
  disabled = false,
}) => {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onSpeak(text);
      }}
      disabled={disabled || isSpeaking}
      className={`inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 text-gray-700 rounded-full text-sm font-medium transition-all disabled:opacity-50 ${className}`}
    >
      <Volume2 className="w-4 h-4" />
      {isSpeaking ? "재생중..." : "발음 듣기"}
    </button>
  );
};

export default SpeakButton;
