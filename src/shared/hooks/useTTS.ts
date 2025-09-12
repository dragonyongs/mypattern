import { useState, useCallback, useRef, useEffect } from "react";
import EasySpeech from "easy-speech";
import { logger } from "@/shared/utils/logger";

interface TTSOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  voice?: string;
}

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const fallbackToNative = useRef(false);

  // EasySpeech 초기화
  useEffect(() => {
    const initTTS = async () => {
      try {
        await EasySpeech.init({
          maxTimeout: 5000,
          interval: 250,
        });
        setIsInitialized(true);
        setIsSupported(true);
        logger.info("EasySpeech initialized successfully");
      } catch (error) {
        logger.warn("EasySpeech failed, falling back to native:", error);
        fallbackToNative.current = true;
        setIsSupported(
          typeof window !== "undefined" && "speechSynthesis" in window
        );
      }
    };

    initTTS();
  }, []);

  const speak = useCallback(
    async (text: string, options: TTSOptions = {}) => {
      if (!isSupported && !fallbackToNative.current) {
        logger.warn("Speech synthesis not supported");
        return;
      }

      // 이전 음성 중지
      stop();

      try {
        if (isInitialized && !fallbackToNative.current) {
          // EasySpeech 사용
          const voices = EasySpeech.voices();
          const selectedVoice =
            voices.find((voice) =>
              voice.lang.includes(options.lang || "en-US")
            ) || voices[0];

          setIsSpeaking(true);

          await EasySpeech.speak({
            text,
            voice: selectedVoice,
            rate: options.rate || 0.9,
            pitch: options.pitch || 1,
            volume: 1,
          });

          setIsSpeaking(false);
        } else {
          // 네이티브 Web Speech API 폴백
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

          window.speechSynthesis.speak(utterance);
        }
      } catch (error) {
        logger.error("Speech failed:", error);
        setIsSpeaking(false);
      }
    },
    [isSupported, isInitialized]
  );

  const stop = useCallback(() => {
    try {
      // EasySpeech 중지
      if (isInitialized && EasySpeech.speaking()) {
        EasySpeech.cancel();
      }

      // 네이티브 API 중지
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }

      // 오디오 객체 중지 (필요시)
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }

      setIsSpeaking(false);
    } catch (error) {
      logger.error("Stop failed:", error);
      setIsSpeaking(false);
    }
  }, [isInitialized]);

  const pause = useCallback(() => {
    try {
      if (isInitialized && EasySpeech.speaking()) {
        // EasySpeech는 pause/resume이 제한적이므로 stop 사용
        EasySpeech.cancel();
        setIsSpeaking(false);
      } else if (window.speechSynthesis?.speaking) {
        window.speechSynthesis.pause();
      }
    } catch (error) {
      logger.error("Pause failed:", error);
    }
  }, [isInitialized]);

  const resume = useCallback(() => {
    try {
      if (window.speechSynthesis?.paused) {
        window.speechSynthesis.resume();
      }
      // EasySpeech는 resume이 없으므로 재생성 필요
    } catch (error) {
      logger.error("Resume failed:", error);
    }
  }, []);

  return {
    speak,
    stop,
    pause,
    resume,
    isSpeaking,
    isSupported: isSupported || fallbackToNative.current,
  };
}
