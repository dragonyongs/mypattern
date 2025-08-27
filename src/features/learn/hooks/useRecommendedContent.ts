import { useMemo } from "react";
import { useUserLevel } from "./useUserLevel";
import type { RecommendedItem } from "../types";

export function useRecommendedContent() {
  const { userInterests, userLevel } = useUserLevel();

  const recommendedContent = useMemo((): RecommendedItem[] => {
    const recommendations: Record<string, string[]> = {
      directions: ["길 묻기 기본 패턴", "교통 관련 표현", "위치 설명하기"],
      business: ["회의 영어 표현", "이메일 작성법", "프레젠테이션 기초"],
      daily: ["카페 주문하기", "쇼핑 필수 표현", "일상 대화 패턴"],
      travel: ["공항 영어", "호텔 체크인", "관광지 질문하기"],
      study: ["질문하는 방법", "설명 요청하기", "토론 참여하기"],
      social: ["자기소개 패턴", "소핸 대화법", "관심사 나누기"],
    };

    return userInterests
      .map((interest, index) => ({
        interest,
        content: recommendations[interest] || [],
        priority: index,
      }))
      .filter((item) => item.content.length > 0);
  }, [userInterests]);

  return {
    recommendedContent,
    hasRecommendations: recommendedContent.length > 0,
  };
}
