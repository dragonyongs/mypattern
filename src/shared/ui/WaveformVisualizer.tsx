// src/shared/ui/WaveformVisualizer.tsx
import React, { useEffect, useRef, useState } from "react";

interface WaveformVisualizerProps {
  audioUrl?: string | null;
  isRecording?: boolean;
  width?: number;
  height?: number;
  barColor?: string;
  activeBarColor?: string;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  audioUrl,
  isRecording = false,
  width = 300,
  height = 60,
  barColor = "#e5e7eb",
  activeBarColor = "#3b82f6",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [audioData, setAudioData] = useState<number[]>([]);

  // 녹음 중일 때 실시간 파형 애니메이션
  useEffect(() => {
    if (isRecording) {
      const animate = () => {
        // 랜덤 파형 생성 (실제로는 Web Audio API를 사용해야 함)
        const newData = Array.from(
          { length: 50 },
          () => Math.random() * 0.8 + 0.2
        );
        setAudioData(newData);
        animationRef.current = requestAnimationFrame(animate);
      };
      animate();
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRecording]);

  // 오디오 URL이 있을 때 파형 분석
  useEffect(() => {
    if (audioUrl && !isRecording) {
      // 실제 구현에서는 Web Audio API로 오디오 파형을 분석해야 함
      // 여기서는 임시로 정적 파형 생성
      const staticData = Array.from(
        { length: 50 },
        (_, i) => Math.sin(i * 0.1) * 0.5 + 0.5
      );
      setAudioData(staticData);
    }
  }, [audioUrl, isRecording]);

  // Canvas에 파형 그리기
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || audioData.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Canvas 클리어
    ctx.clearRect(0, 0, width, height);

    // 파형 그리기
    const barWidth = width / audioData.length;

    audioData.forEach((value, index) => {
      const barHeight = value * height;
      const x = index * barWidth;
      const y = (height - barHeight) / 2;

      ctx.fillStyle =
        isRecording && Math.random() > 0.7 ? activeBarColor : barColor;
      ctx.fillRect(x, y, barWidth - 1, barHeight);
    });
  }, [audioData, width, height, barColor, activeBarColor, isRecording]);

  return (
    <div className="waveform-visualizer flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border border-gray-200 rounded bg-white"
      />
    </div>
  );
};

export default WaveformVisualizer;
