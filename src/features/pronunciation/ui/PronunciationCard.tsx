import React, { useState, useCallback } from "react";
import { Play, Pause, Mic, MicOff, Volume2 } from "lucide-react";
import { VocaItem } from "@/entities";
import { useTTS, useVoiceRecorder } from "@/shared/hooks";
import { WaveformVisualizer } from "@/shared/ui";

interface PronunciationCardProps {
  item: VocaItem;
  onNext: () => void;
  onPrevious: () => void;
}

export function PronunciationCard({
  item,
  onNext,
  onPrevious,
}: PronunciationCardProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);

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
      speak(item.exampleEn || item.headword);
    }
  }, [isSpeaking, stop, speak, item]);

  const handleRecord = useCallback(async () => {
    if (isRecording) {
      await stopRecording();
      setIsRecording(false);
      setHasRecorded(true);
    } else {
      await startRecording();
      setIsRecording(true);
    }
  }, [isRecording, startRecording, stopRecording]);

  const handlePlayRecording = useCallback(() => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play();
    }
  }, [audioUrl]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
      {/* 단어 표시 */}
      <div className="text-center space-y-3">
        <h2 className="text-3xl font-bold text-gray-900">{item.headword}</h2>
        <p className="text-lg text-gray-600">{item.exampleEn}</p>
        {item.exampleKo && (
          <p className="text-sm text-gray-500">{item.exampleKo}</p>
        )}
      </div>

      {/* 음성 재생 */}
      <div className="text-center space-y-4">
        <button
          onClick={handleSpeak}
          className={`flex items-center gap-2 mx-auto px-6 py-3 rounded-lg transition-colors ${
            isSpeaking
              ? "bg-red-100 text-red-700 hover:bg-red-200"
              : "bg-blue-100 text-blue-700 hover:bg-blue-200"
          }`}
        >
          {isSpeaking ? (
            <>
              <Pause className="size-5" />
              정지
            </>
          ) : (
            <>
              <Volume2 className="size-5" />
              발음 듣기
            </>
          )}
        </button>
      </div>

      {/* 녹음 섹션 */}
      <div className="border-t pt-6 space-y-4">
        <h3 className="text-lg font-semibold text-center">따라 말해보세요</h3>

        {/* 파형 시각화 (녹음 중) */}
        {isRecording && (
          <div className="flex justify-center">
            <WaveformVisualizer isActive={isRecording} />
          </div>
        )}

        {/* 녹음 버튼 */}
        <div className="text-center">
          <button
            onClick={handleRecord}
            className={`flex items-center gap-2 mx-auto px-6 py-3 rounded-full transition-all ${
              isRecording
                ? "bg-red-500 text-white hover:bg-red-600 animate-pulse"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {isRecording ? (
              <>
                <MicOff className="size-5" />
                녹음 중지
              </>
            ) : (
              <>
                <Mic className="size-5" />
                녹음 시작
              </>
            )}
          </button>
        </div>

        {/* 녹음 재생 */}
        {hasRecorded && audioUrl && (
          <div className="text-center">
            <button
              onClick={handlePlayRecording}
              className="flex items-center gap-2 mx-auto px-4 py-2 text-sm text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <Play className="size-4" />내 발음 듣기
            </button>
          </div>
        )}
      </div>

      {/* 네비게이션 */}
      <div className="flex justify-between pt-6">
        <button
          onClick={onPrevious}
          className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          이전
        </button>
        <button
          onClick={onNext}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          다음
        </button>
      </div>
    </div>
  );
}
