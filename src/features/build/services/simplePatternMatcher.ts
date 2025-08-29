// src/features/build/services/simplePatternMatcher.ts (완전한 개선 버전)

import { unifiedPatternService } from "@/shared/services/unifiedPatternService";
import { dataPackLoader } from "@/shared/services/dataPackLoader";
import type { ConversationPattern, UserIntent } from "../types";

interface KeywordCluster {
  primary: string;
  synonyms: string[];
  related: string[];
  weight: number;
}

interface PatternTemplate {
  id: string;
  korean: string;
  english: string;
  structure: string;
  keywords: string[];
  keywordClusters: string[]; // 새로 추가: 필요한 클러스터들
  minimumMatches: number; // 새로 추가: 최소 매칭 수
  category: string;
  responseKorean: string;
  responseEnglish: string;
  variations: string[];
}

interface SemanticCategory {
  keywords: string[];
  english: string[];
  patterns: string[];
}

interface AnalyzedInput {
  categories: string[];
  items: { category: string; ko: string; en: string }[];
  originalInput: string;
}

export class SimplePatternMatcher {
  // ✅ 기존 키워드 클러스터 정의
  private keywordClusters: Record<string, KeywordCluster> = {
    LOCATION: {
      primary: "장소",
      synonyms: ["어디", "위치", "곳", "자리", "어딘가요", "어디에"],
      related: ["있나요", "있어요", "아시나요", "알고있나요"],
      weight: 2.0,
    },
    COFFEE_PLACE: {
      primary: "카페",
      synonyms: ["커피숍", "카페", "커피점", "메가커피", "스타벅스", "메가"],
      related: ["coffee", "cafe", "shop", "매장", "커피", "라떼"],
      weight: 1.8,
    },
    INQUIRY: {
      primary: "문의",
      synonyms: ["아시나요", "알고있나요", "있나요", "어딘가요"],
      related: ["know", "있는지", "어디", "물어봐도", "알려주세요"],
      weight: 1.5,
    },
    DIRECTION: {
      primary: "이동",
      synonyms: ["가는", "어떻게", "방법", "길"],
      related: ["go", "get", "way", "route", "가야", "가면"],
      weight: 1.7,
    },
    TRANSPORTATION: {
      primary: "교통",
      synonyms: ["버스", "지하철", "택시", "전철"],
      related: ["bus", "subway", "train", "타고", "이용"],
      weight: 1.6,
    },
    // ✅ 새로 추가: 의미적 카테고리들
    BEVERAGES: {
      primary: "음료",
      synonyms: [
        "물",
        "커피",
        "차",
        "주스",
        "음료",
        "라떼",
        "아메리카노",
        "아이스",
        "뜨거운",
      ],
      related: [
        "drink",
        "water",
        "coffee",
        "tea",
        "juice",
        "latte",
        "americano",
        "ice",
        "hot",
      ],
      weight: 2.0,
    },
    FOODS: {
      primary: "음식",
      synonyms: ["밥", "빵", "샐러드", "샌드위치", "음식", "케이크", "파스타"],
      related: [
        "food",
        "rice",
        "bread",
        "salad",
        "sandwich",
        "cake",
        "pasta",
        "meal",
      ],
      weight: 1.9,
    },
    REQUESTS: {
      primary: "요청",
      synonyms: [
        "주세요",
        "주문",
        "원해요",
        "하고싶어요",
        "드릴게요",
        "해주세요",
      ],
      related: [
        "please",
        "order",
        "want",
        "would like",
        "give me",
        "can I have",
      ],
      weight: 1.8,
    },
    QUANTITIES: {
      primary: "수량",
      synonyms: [
        "한잔",
        "두잔",
        "하나",
        "둘",
        "큰거",
        "작은거",
        "라지",
        "스몰",
      ],
      related: [
        "one glass",
        "two glasses",
        "one",
        "two",
        "large",
        "small",
        "big",
        "little",
      ],
      weight: 1.4,
    },
  };

  // ✅ 의미적 카테고리 맵핑 (핵심 개선)
  private semanticCategories: Record<string, SemanticCategory> = {
    BEVERAGES: {
      keywords: [
        "물",
        "커피",
        "차",
        "주스",
        "음료",
        "라떼",
        "아메리카노",
        "아이스",
        "뜨거운",
      ],
      english: [
        "water",
        "coffee",
        "tea",
        "juice",
        "drink",
        "latte",
        "americano",
        "iced",
        "hot",
      ],
      patterns: ["ORDER_BEVERAGE", "REQUEST_DRINK", "WANT_BEVERAGE"],
    },
    FOODS: {
      keywords: ["밥", "빵", "샐러드", "샌드위치", "음식", "케이크", "파스타"],
      english: ["rice", "bread", "salad", "sandwich", "food", "cake", "pasta"],
      patterns: ["ORDER_FOOD", "REQUEST_MEAL", "WANT_FOOD"],
    },
    REQUESTS: {
      keywords: [
        "주세요",
        "주문",
        "원해요",
        "하고싶어요",
        "드릴게요",
        "해주세요",
      ],
      english: [
        "please",
        "order",
        "want",
        "would like",
        "give me",
        "can I have",
      ],
      patterns: ["POLITE_REQUEST", "ORDER_ITEM", "WANT_ITEM"],
    },
    QUANTITIES: {
      keywords: [
        "한잔",
        "두잔",
        "하나",
        "둘",
        "큰거",
        "작은거",
        "라지",
        "스몰",
      ],
      english: [
        "one glass",
        "two glasses",
        "one",
        "two",
        "large",
        "small",
        "big",
        "little",
      ],
      patterns: ["SPECIFY_QUANTITY", "SIZE_PREFERENCE"],
    },
  };

  // 기존 패턴 템플릿 (클러스터 기반)
  private basePatterns: PatternTemplate[] = [
    {
      id: "location-inquiry",
      korean: "PLACE이/가 어디에 있나요?",
      english: "Where is PLACE?",
      structure: "WHERE + BE + PLACE",
      keywords: ["어디", "있나요", "위치", "장소"],
      keywordClusters: ["LOCATION", "COFFEE_PLACE", "INQUIRY"],
      minimumMatches: 2,
      category: "directions",
      responseKorean: "저쪽에 있어요",
      responseEnglish: "It's over there",
      variations: [
        "It's around the corner",
        "You can find it over there",
        "It's nearby",
      ],
    },
    {
      id: "how-to-go",
      korean: "PLACE으로/로 어떻게 가나요?",
      english: "How do I get to PLACE?",
      structure: "HOW + DO + I + GET + TO + PLACE",
      keywords: ["어떻게", "가나요", "길", "방법"],
      keywordClusters: ["DIRECTION", "LOCATION"],
      minimumMatches: 2,
      category: "directions",
      responseKorean: "직진하세요",
      responseEnglish: "Go straight",
      variations: [
        "Take the subway",
        "Turn left at the corner",
        "It takes 10 minutes",
      ],
    },
    {
      id: "transportation-inquiry",
      korean: "PLACE으로/로 가는 TRANSPORT이/가 있나요?",
      english: "Is there TRANSPORT to PLACE?",
      structure: "IS + THERE + TRANSPORT + TO + PLACE",
      keywords: ["버스", "가는", "있나요", "교통"],
      keywordClusters: ["TRANSPORTATION", "LOCATION", "INQUIRY"],
      minimumMatches: 2,
      category: "directions",
      responseKorean: "네, 142번 버스를 타세요",
      responseEnglish: "Yes, take bus number 142",
      variations: [
        "Take the blue line",
        "Transfer at Seoul Station",
        "It runs every 10 minutes",
      ],
    },
  ];

  // ✅ 메인 매칭 로직 개선 (의미적 분석 통합)
  matchPatterns(intent: UserIntent): ConversationPattern[] {
    console.log("🔧 통합 패턴 엔진 사용");

    // ✅ 이제 중앙화된 시스템 사용
    const patterns = unifiedPatternService.matchPatternsForBuild(intent.korean);

    return patterns.map((pattern, index) => ({
      ...pattern,
      matchScore: (patterns.length - index) * 2, // 순서 기반 점수
      matchReason: "통합 문법 엔진 기반 매칭",
    }));
  }
}

export const simplePatternMatcher = new SimplePatternMatcher();
