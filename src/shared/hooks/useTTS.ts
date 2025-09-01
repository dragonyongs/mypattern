import { useState, useCallback, useRef } from "react";
import { logger } from "@/shared/utils/logger";

interface TTSOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  voice?: string;
}

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported] = useState(
    typeof window !== "undefined" && "speechSynthesis" in window
  );
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null); // ✅ 타입 추가

  const speak = useCallback(
    (text: string, options: TTSOptions = {}) => {
      if (!isSupported) {
        logger.warn("Speech synthesis not supported");
        return;
      }

      // 이전 음성 중지
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = options.lang || "en-US";
      utterance.rate = options.rate || 0.9;
      utterance.pitch = options.pitch || 1;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = (e) => {
        logger.error("TTS Error:", e);
        setIsSpeaking(false);
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [isSupported]
  );

  const stop = useCallback(() => {
    if (isSupported && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isSupported]);

  const pause = useCallback(() => {
    if (isSupported && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
    }
  }, [isSupported]);

  const resume = useCallback(() => {
    if (isSupported && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  }, [isSupported]);

  return { speak, stop, pause, resume, isSpeaking, isSupported };
}
