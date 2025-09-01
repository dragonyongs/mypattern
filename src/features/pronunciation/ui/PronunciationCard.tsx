// src/features/pronunciation/ui/PronunciationCard.tsx
import React, { useState, useCallback, useEffect, memo } from "react";
import {
  Play,
  Pause,
  Mic,
  MicOff,
  Volume2,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import { VocaItem } from "@/entities";
import { useTTS, useVoiceRecorder } from "@/shared/hooks";

export interface PronunciationCardProps {
  item: VocaItem;
  onComplete: (correct: boolean) => void; // 🔥 누락되었을 수 있는 prop
  onNext: () => void;
  onPrevious: () => void;
}

export const PronunciationCard = memo<PronunciationCardProps>(
  ({ item, onComplete, onNext, onPrevious }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [hasRecorded, setHasRecorded] = useState(false);
    const [hasListened, setHasListened] = useState(false);

    const { speak, isSpeaking, stop } = useTTS();
    const {
      startRecording,
      stopRecording,
      audioUrl,
      isRecording: recordingState,
    } = useVoiceRecorder();

    const handleSpeak = useCallback(() => {
      if (isSpeaking) {
        stop();
      } else {
        // ✅ 안전한 텍스트 확보
        const textToSpeak = item?.exampleEn || item?.headword || "";
        if (textToSpeak) {
          speak(textToSpeak);
          setHasListened(true);
        }
      }
    }, [isSpeaking, stop, speak, item]);

    const handleRecord = useCallback(async () => {
      if (isRecording) {
        await stopRecording();
        setIsRecording(false);
        setHasRecorded(true);

        // 🔥 연습 완료 콜백 호출
        if (hasListened && onComplete) {
          onComplete(true);
        }
      } else {
        await startRecording();
        setIsRecording(true);
      }
    }, [isRecording, startRecording, stopRecording, hasListened, onComplete]);

    const handlePlayRecording = useCallback(() => {
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audio.play();
      }
    }, [audioUrl]);

    // ✅ 안전한 렌더링 - 객체 속성만 출력
    return (
      <div className="pronunciation-card p-6">
        {/* 단어 표시 - 안전하게 속성 접근 */}
        <div className="text-center mb-6">
          <h3 className="text-3xl font-bold mb-2">
            {item?.headword || "No word"}
          </h3>
          <p className="text-gray-600 mb-4">
            {item?.definition || "No definition"}
          </p>

          {/* 예문 - 조건부 렌더링 */}
          {item?.exampleEn && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-blue-800 italic">"{item.exampleEn}"</p>
              {item?.exampleKo && (
                <p className="text-blue-600 text-sm mt-2">"{item.exampleKo}"</p>
              )}
            </div>
          )}
        </div>

        {/* 듣기 버튼 */}
        <button
          onClick={handleSpeak}
          disabled={isSpeaking}
          className={`w-full py-4 mb-4 rounded-lg font-semibold transition-colors ${
            isSpeaking
              ? "bg-blue-100 text-blue-700"
              : hasListened
              ? "bg-green-500 text-white hover:bg-green-600"
              : "bg-blue-500 text-white hover:bg-blue-600"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Volume2 size={20} className={isSpeaking ? "animate-pulse" : ""} />
            {isSpeaking ? "재생 중..." : hasListened ? "다시 듣기" : "🔊 듣기"}
          </div>
        </button>

        {/* 녹음 버튼 */}
        <button
          onClick={handleRecord}
          disabled={!hasListened}
          className={`w-full py-4 mb-4 rounded-lg font-semibold transition-colors ${
            isRecording
              ? "bg-red-500 text-white animate-pulse"
              : hasRecorded
              ? "bg-green-500 text-white hover:bg-green-600"
              : hasListened
              ? "bg-orange-500 text-white hover:bg-orange-600"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
            {isRecording
              ? "🎤 녹음 중단"
              : hasRecorded
              ? "🎤 다시 녹음"
              : "🎤 녹음 시작"}
          </div>
        </button>

        {/* 녹음 재생 버튼 */}
        {hasRecorded && audioUrl && (
          <button
            onClick={handlePlayRecording}
            className="w-full py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-semibold"
          >
            <div className="flex items-center justify-center gap-2">
              <Play size={18} />내 녹음 재생
            </div>
          </button>
        )}

        {/* 완료 상태 */}
        {hasListened && hasRecorded && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
            <CheckCircle size={24} className="mx-auto text-green-500 mb-2" />
            <p className="text-green-800 font-semibold">발음 연습 완료!</p>
          </div>
        )}
      </div>
    );
  }
);

PronunciationCard.displayName = "PronunciationCard";
