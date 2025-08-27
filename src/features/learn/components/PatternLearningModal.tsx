import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Volume2,
  Mic,
  MicOff,
  CheckCircle,
  XCircle,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { useLearningStore } from "@/stores/learningStore";
import type {
  DailyPattern,
  PatternLearningMode,
  PatternSession,
} from "../types";

interface PatternLearningModalProps {
  pattern: DailyPattern;
  isOpen: boolean;
  onClose: () => void;
}

export const PatternLearningModal: React.FC<PatternLearningModalProps> = ({
  pattern,
  isOpen,
  onClose,
}) => {
  const { completePattern } = useLearningStore();
  const [session, setSession] = useState<PatternSession | null>(null);
  const [currentMode, setCurrentMode] =
    useState<PatternLearningMode>("preview");
  const [userInput, setUserInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // 학습 단계 정의
  const learningSteps: {
    mode: PatternLearningMode;
    title: string;
    instruction: string;
  }[] = [
    {
      mode: "preview",
      title: "패턴 미리보기",
      instruction: "이 패턴이 어떤 상황에서 사용되는지 확인해보세요",
    },
    {
      mode: "listen",
      title: "듣고 이해하기",
      instruction: "원어민 발음을 들어보세요",
    },
    {
      mode: "repeat",
      title: "따라 말하기",
      instruction: "원어민처럼 따라 말해보세요",
    },
    {
      mode: "type",
      title: "타이핑 연습",
      instruction: "들은 내용을 정확히 입력해보세요",
    },
    {
      mode: "build",
      title: "패턴 응용하기",
      instruction: "상황에 맞게 패턴을 변형해보세요",
    },
  ];

  // 세션 초기화
  useEffect(() => {
    if (isOpen && !session) {
      const newSession: PatternSession = {
        id: `session_${Date.now()}`,
        patternId: pattern.id,
        mode: "preview",
        currentStep: 0,
        totalSteps: learningSteps.length,
        accuracy: 0,
        startTime: new Date().toISOString(),
        responses: [],
      };
      setSession(newSession);
    }
  }, [isOpen, pattern.id, session]);

  // 음성 인식 설정
  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        handleSpeechResult(transcript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error("음성 인식 오류:", event.error);
        setIsRecording(false);
        setFeedback("음성 인식에 실패했습니다. 다시 시도해주세요.");
      };
    }
  }, []);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";
      rec.onresult = (e: any) => {
        const transcript = e.results.transcript;
        handleSpeechResult(transcript);
      };
      rec.onerror = () => setIsRecording(false);
      // hold in ref
      // @ts-ignore
      recognitionRef.current = rec;
    }
    return () => {
      try {
        // @ts-ignore
        recognitionRef.current?.abort?.();
      } catch {}
      // stop any pending speechSynthesis
      try {
        window.speechSynthesis?.cancel?.();
      } catch {}
    };
  }, []);

  const handleSpeechResult = (transcript: string) => {
    setIsRecording(false);
    setUserInput(transcript);
    validateAnswer(transcript);
  };

  const validateAnswer = (answer: string) => {
    const cleanAnswer = answer.toLowerCase().trim();
    const expectedAnswer = pattern.text.toLowerCase().trim();
    const similarity = calculateSimilarity(cleanAnswer, expectedAnswer);

    const correct = similarity > 0.8;
    setIsCorrect(correct);

    if (correct) {
      setFeedback("훌륭해요! 정확한 발음입니다.");
    } else {
      setFeedback(`다시 한번 시도해보세요. 정답: "${pattern.text}"`);
    }

    // 응답 기록
    if (session) {
      const newResponse = {
        stepId: currentMode,
        userInput: answer,
        expectedAnswer: pattern.text,
        isCorrect: correct,
        timestamp: new Date().toISOString(),
        attempts:
          session.responses.filter((r) => r.stepId === currentMode).length + 1,
      };

      setSession({
        ...session,
        responses: [...session.responses, newResponse],
      });
    }
  };

  const calculateSimilarity = (str1: string, str2: string): number => {
    const words1 = str1.split(" ");
    const words2 = str2.split(" ");
    let matches = 0;

    words1.forEach((word) => {
      if (words2.includes(word)) matches++;
    });

    return matches / Math.max(words1.length, words2.length);
  };

  const startRecording = () => {
    if (recognitionRef.current) {
      setIsRecording(true);
      setUserInput("");
      setFeedback(null);
      recognitionRef.current.start();
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const playAudio = () => {
    // 실제 구현에서는 TTS API 또는 녹음된 파일 사용
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(pattern.text);
      utterance.lang = "en-US";
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  const nextStep = () => {
    if (!session) return;

    const currentIndex = learningSteps.findIndex(
      (step) => step.mode === currentMode
    );

    if (currentIndex < learningSteps.length - 1) {
      const nextMode = learningSteps[currentIndex + 1].mode;
      setCurrentMode(nextMode);
      setSession({
        ...session,
        mode: nextMode,
        currentStep: currentIndex + 1,
      });
      resetStepState();
    } else {
      // 학습 완료
      completeSessionAndClose();
    }
  };

  const previousStep = () => {
    if (!session) return;

    const currentIndex = learningSteps.findIndex(
      (step) => step.mode === currentMode
    );

    if (currentIndex > 0) {
      const prevMode = learningSteps[currentIndex - 1].mode;
      setCurrentMode(prevMode);
      setSession({
        ...session,
        mode: prevMode,
        currentStep: currentIndex - 1,
      });
      resetStepState();
    }
  };

  const resetStepState = () => {
    setUserInput("");
    setFeedback(null);
    setIsCorrect(null);
    setIsRecording(false);
  };

  const completeSessionAndClose = () => {
    if (session) {
      // 정확도 계산
      const correctResponses = session.responses.filter(
        (r) => r.isCorrect
      ).length;
      const totalResponses = session.responses.length;
      const finalAccuracy =
        totalResponses > 0 ? correctResponses / totalResponses : 0;

      // 학습 완료 처리
      completePattern(pattern.id);

      // 세션 데이터 저장 (추후 분석용)
      console.log("🎉 패턴 학습 완료:", {
        patternId: pattern.id,
        accuracy: finalAccuracy,
        duration: Date.now() - new Date(session.startTime).getTime(),
        responses: session.responses,
      });
    }

    onClose();
  };

  if (!isOpen || !session) return null;

  const currentStep = learningSteps.find((step) => step.mode === currentMode);
  const progress = ((session.currentStep + 1) / session.totalSteps) * 100;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">패턴 학습</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 진행률 */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>{currentStep?.title}</span>
            <span>
              {session.currentStep + 1} / {session.totalSteps}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* 패턴 카드 */}
        <div className="p-6 text-center border-b">
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <p className="text-lg font-medium text-gray-900 mb-2">
              {pattern.text}
            </p>
            <p className="text-sm text-gray-600">{pattern.korean}</p>
          </div>

          <button
            onClick={playAudio}
            className="flex items-center space-x-2 bg-green-100 text-green-700 px-4 py-2 rounded-lg hover:bg-green-200 transition-colors mx-auto"
          >
            <Volume2 className="h-4 w-4" />
            <span>원어민 발음 듣기</span>
          </button>
        </div>

        {/* 단계별 학습 UI */}
        <div className="p-6">
          <div className="text-center mb-6">
            <p className="text-gray-700 mb-4">{currentStep?.instruction}</p>
          </div>

          {/* 단계별 인터랙션 */}
          {currentMode === "preview" && (
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                "{pattern.text}"는 {pattern.category} 상황에서 사용하는
                표현입니다.
              </p>
            </div>
          )}

          {currentMode === "listen" && (
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                원어민 발음을 주의 깊게 들어보세요.
              </p>
            </div>
          )}

          {currentMode === "repeat" && (
            <div className="text-center">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className="flex items-center space-x-2 bg-red-100 text-red-700 px-6 py-3 rounded-lg hover:bg-red-200 transition-colors mx-auto"
                >
                  <Mic className="h-5 w-5" />
                  <span>녹음 시작</span>
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="flex items-center space-x-2 bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition-colors mx-auto"
                >
                  <MicOff className="h-5 w-5" />
                  <span>녹음 중... 클릭해서 중지</span>
                </button>
              )}

              {userInput && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">인식된 내용:</p>
                  <p className="font-medium">{userInput}</p>
                </div>
              )}
            </div>
          )}

          {currentMode === "type" && (
            <div>
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) =>
                  e.key === "Enter" && validateAnswer(userInput)
                }
                placeholder="들은 내용을 입력해주세요..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => validateAnswer(userInput)}
                className="w-full mt-3 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                확인
              </button>
            </div>
          )}

          {currentMode === "build" && (
            <div>
              <p className="text-sm text-gray-600 mb-3">
                다음 상황에서 이 패턴을 어떻게 사용할까요?
              </p>
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="예시 문장을 만들어보세요..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
              />
              <button
                onClick={() => validateAnswer(userInput)}
                className="w-full mt-3 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                확인
              </button>
            </div>
          )}

          {/* 피드백 */}
          {feedback && (
            <div
              className={`mt-4 p-3 rounded-lg flex items-start space-x-2 ${
                isCorrect
                  ? "bg-green-100 text-green-800"
                  : "bg-orange-100 text-orange-800"
              }`}
            >
              {isCorrect ? (
                <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              )}
              <p className="text-sm">{feedback}</p>
            </div>
          )}
        </div>

        {/* 네비게이션 버튼 */}
        <div className="flex items-center justify-between p-4 border-t">
          <button
            onClick={previousStep}
            disabled={session.currentStep === 0}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              session.currentStep === 0
                ? "text-gray-400 cursor-not-allowed"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>이전</span>
          </button>

          {currentMode === "preview" || currentMode === "listen" ? (
            <button
              onClick={nextStep}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <span>다음</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={isCorrect ? nextStep : () => setFeedback(null)}
              disabled={!feedback}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                !feedback
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : isCorrect
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "bg-orange-600 text-white hover:bg-orange-700"
              }`}
            >
              <span>{isCorrect ? "다음" : "다시 시도"}</span>
              {isCorrect ? (
                <ArrowRight className="h-4 w-4" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
