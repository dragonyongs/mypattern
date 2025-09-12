// src/shared/hooks/useTTS.ts
import { useState, useCallback, useRef, useEffect } from "react";
import EasySpeech from "easy-speech";
import { logger as appLogger } from "@/shared/utils/logger";

interface TTSOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  voice?: string;
}

// 안전 로거: appLogger가 없거나 메서드가 없으면 console 대체
const log = {
  info: (...args: any[]) =>
    (appLogger && typeof (appLogger as any).info === "function"
      ? (appLogger as any).info
      : console.info)(...args),
  warn: (...args: any[]) =>
    (appLogger && typeof (appLogger as any).warn === "function"
      ? (appLogger as any).warn
      : console.warn)(...args),
  error: (...args: any[]) =>
    (appLogger && typeof (appLogger as any).error === "function"
      ? (appLogger as any).error
      : console.error)(...args),
};

const isIOS = () =>
  typeof navigator !== "undefined" &&
  /iPad|iPhone|iPod/.test(navigator.userAgent) &&
  !(window as any).MSStream;

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const fallbackToNative = useRef(false);
  const nativeReadyOnce = useRef(false);
  const warned = useRef(false);

  useEffect(() => {
    const init = async () => {
      try {
        await EasySpeech.init({ maxTimeout: 5000, interval: 250 });
        setIsInitialized(true);
        fallbackToNative.current = false;
        setIsSupported(true);
        log.info("EasySpeech initialized");
      } catch (error) {
        if (!warned.current) {
          log.info("EasySpeech not available, using native Web Speech API.");
          warned.current = true;
        }
        fallbackToNative.current = true;
        setIsSupported(
          typeof window !== "undefined" && "speechSynthesis" in window
        );
      }
    };
    init();
  }, []);

  const unlockNativeIfNeeded = () => {
    try {
      if (!nativeReadyOnce.current && window.speechSynthesis) {
        const u = new SpeechSynthesisUtterance(" ");
        u.volume = 0;
        window.speechSynthesis.speak(u);
        nativeReadyOnce.current = true;
      }
      if (window.speechSynthesis?.paused) {
        window.speechSynthesis.resume();
      }
    } catch (e) {
      log.warn("Native unlock skipped:", e);
    }
  };

  const stopNative = () => {
    try {
      if (window.speechSynthesis?.speaking) {
        window.speechSynthesis.cancel();
      }
    } catch (e) {
      log.warn("Native stop failed:", e);
    }
  };

  const stopEasy = () => {
    try {
      const canUseEasy =
        isInitialized && typeof (EasySpeech as any).cancel === "function";
      if (canUseEasy) (EasySpeech as any).cancel();
    } catch (e) {
      log.warn("EasySpeech stop failed:", e);
    }
  };

  const speak = useCallback(
    async (text: string, options: TTSOptions = {}) => {
      if (!text) return;
      if (!(isSupported || fallbackToNative.current)) {
        log.warn("Speech synthesis not supported");
        return;
      }

      // 이전 발화 정리
      stopEasy();
      stopNative();

      try {
        const useEasy = isInitialized && !fallbackToNative.current;

        if (useEasy) {
          // 음성 목록 안전 획득
          let voices: any[] = [];
          try {
            voices = (EasySpeech as any).voices?.() || [];
          } catch {
            voices = [];
          }

          const selected =
            voices.find((v) => v?.lang?.includes(options.lang || "en-US")) ||
            voices ||
            undefined; // 보정: 배열 자체가 아닌 첫 음성/undefined

          setIsSpeaking(true);

          await (EasySpeech as any).speak({
            text,
            voice: selected,
            rate: options.rate ?? 0.9,
            pitch: options.pitch ?? 1,
            volume: 1,
          });

          setIsSpeaking(false);
          return;
        }

        // 네이티브
        if (window.speechSynthesis) {
          if (isIOS()) unlockNativeIfNeeded();

          const u = new SpeechSynthesisUtterance(text);
          u.lang = options.lang || "en-US";
          u.rate = options.rate ?? 0.9;
          u.pitch = options.pitch ?? 1;

          u.onstart = () => setIsSpeaking(true);
          u.onend = () => setIsSpeaking(false);
          u.onerror = (e) => {
            log.error("TTS Error:", e);
            setIsSpeaking(false);
          };

          window.speechSynthesis.speak(u);
        }
      } catch (e) {
        log.error("Speech failed:", e);
        setIsSpeaking(false);
      }
    },
    [isSupported, isInitialized]
  );

  const stop = useCallback(() => {
    try {
      stopEasy();
      stopNative();
      setIsSpeaking(false);
    } catch (e) {
      log.error("Stop failed:", e);
      setIsSpeaking(false);
    }
  }, []);

  const pause = useCallback(() => {
    try {
      stopEasy(); // EasySpeech는 pause 미지원 → cancel
      if (window.speechSynthesis?.speaking) {
        window.speechSynthesis.pause();
      }
    } catch (e) {
      log.error("Pause failed:", e);
    }
  }, []);

  const resume = useCallback(() => {
    try {
      if (window.speechSynthesis?.paused) {
        window.speechSynthesis.resume();
      }
    } catch (e) {
      log.error("Resume failed:", e);
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
