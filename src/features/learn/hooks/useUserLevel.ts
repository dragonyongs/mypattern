import { useMemo } from "react";
import { useAuthStore } from "@/stores/authStore";
import type { LearningContent } from "../types";

export function useUserLevel() {
  const { user } = useAuthStore();

  const levelContent = useMemo((): LearningContent => {
    const userLevel = user?.level || "beginner";

    const contentMap: Record<string, LearningContent> = {
      beginner: {
        id: "beginner",
        title: "기초 패턴 마스터하기",
        description: "가장 자주 사용하는 핵심 패턴부터 시작해요",
        patterns: [
          "Hello, nice to meet you",
          "How are you doing?",
          "Could you help me?",
          "Excuse me, where is...?",
        ],
        color: "from-green-600 to-green-700",
        level: "beginner",
      },
      intermediate: {
        id: "intermediate",
        title: "실용 표현 늘리기",
        description: "다양한 상황에서 자연스럽게 대화해보세요",
        patterns: [
          "I'm still working on it",
          "Let me get back to you",
          "That sounds great",
          "I appreciate your help",
        ],
        color: "from-blue-400 to-blue-600",
        level: "intermediate",
      },
      advanced: {
        id: "advanced",
        title: "고급 소통 기술",
        description: "복잡한 상황에서도 매끄러운 의사소통을 해보세요",
        patterns: [
          "I'd like to propose an alternative",
          "From my perspective...",
          "That's an interesting point",
          "Let's explore this further",
        ],
        color: "from-purple-400 to-purple-600",
        level: "advanced",
      },
    };

    return contentMap[userLevel];
  }, [user?.level]);

  return {
    userLevel: user?.level || "beginner",
    levelContent,
    userInterests: user?.interests || [],
  };
}
