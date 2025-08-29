// src/features/build/services/fallbackPatternService.ts
import { useLexiconStore } from "@/stores/lexiconStore";
import type { ConversationPattern, UserIntent } from "../types";

export class FallbackPatternService {
  // 기본 패턴 템플릿
  private basePatterns = [
    {
      id: "where-is",
      keywords: ["어디", "있나요", "위치"],
      korean: "PLACE이/가 어디에 있나요?",
      english: "Where is PLACE?",
      structure: "WHERE + BE + PLACE",
      category: "directions",
      response: {
        korean: "저쪽에 있어요",
        english: "It's over there",
        variations: ["It's around the corner", "You can see it nearby"],
      },
    },
    {
      id: "how-to-go",
      keywords: ["어떻게", "가나요", "방법"],
      korean: "PLACE으로/로 어떻게 가나요?",
      english: "How do I get to PLACE?",
      structure: "HOW + DO + I + GET + TO + PLACE",
      category: "directions",
      response: {
        korean: "직진하세요",
        english: "Go straight",
        variations: ["Take the bus", "Turn left at the corner"],
      },
    },
    {
      id: "order-item",
      keywords: ["주문", "하고 싶어요", "주세요"],
      korean: "ITEM을/를 주문하고 싶어요",
      english: "I would like to order ITEM",
      structure: "I + WOULD + LIKE + TO + ORDER + ITEM",
      category: "daily",
      response: {
        korean: "어떤 사이즈로 드릴까요?",
        english: "What size would you like?",
        variations: ["For here or to go?", "Any extras?"],
      },
    },
  ];

  matchPatterns(intent: UserIntent): ConversationPattern[] {
    const input = intent.korean.toLowerCase();
    const matchedPatterns: Array<{ pattern: any; score: number }> = [];

    // 키워드 매칭
    for (const pattern of this.basePatterns) {
      let score = 0;

      for (const keyword of pattern.keywords) {
        if (input.includes(keyword)) {
          score += 2;
        }
      }

      if (score > 0) {
        matchedPatterns.push({ pattern, score });
      }
    }

    // 점수 순 정렬
    matchedPatterns.sort((a, b) => b.score - a.score);

    // ConversationPattern으로 변환
    return matchedPatterns.slice(0, 3).map(({ pattern }) => {
      const filledPattern = this.fillSlots(pattern, input);
      return this.createConversationPattern(filledPattern);
    });
  }

  private fillSlots(pattern: any, input: string): any {
    let korean = pattern.korean;
    let english = pattern.english;

    // 사용자 입력에서 키워드 추출
    const words = input.split(" ");
    const placeWords = ["역", "정류장", "카페", "병원", "은행"];
    const itemWords = ["커피", "라떼", "아메리카노", "샌드위치"];

    // PLACE 슬롯 채우기
    if (korean.includes("PLACE")) {
      for (const word of words) {
        if (placeWords.some((p) => word.includes(p))) {
          korean = korean.replace(/PLACE/g, word);
          english = english.replace(/PLACE/g, `[${word}]`);
          break;
        }
      }
    }

    // ITEM 슬롯 채우기
    if (korean.includes("ITEM")) {
      for (const word of words) {
        if (itemWords.some((i) => word.includes(i))) {
          korean = korean.replace(/ITEM/g, word);
          english = english.replace(/ITEM/g, `[${word}]`);
          break;
        }
      }
    }

    return { ...pattern, korean, english };
  }

  private createConversationPattern(pattern: any): ConversationPattern {
    const cards = pattern.english
      .split(" ")
      .filter((word) => word.length > 1)
      .map((word, index) => {
        const isUserInput = word.startsWith("[") && word.endsWith("]");
        const cleanWord = isUserInput ? word.slice(1, -1) : word;

        return {
          id: `card_${index}`,
          text: cleanWord,
          korean: this.getKoreanTranslation(cleanWord),
          pos: this.identifyPOS(cleanWord),
          isPlaced: false,
          isCorrect: false,
          feedbackColor: "default" as const,
          needsUserInput: isUserInput,
        };
      });

    return {
      id: pattern.id,
      scenario: `${pattern.category} 상황`,
      userSide: {
        korean: pattern.korean,
        english: pattern.english,
        structure: pattern.structure,
        cards,
      },
      responseSide: {
        korean: pattern.response.korean,
        english: pattern.response.english,
        variations: pattern.response.variations,
      },
    };
  }

  private getKoreanTranslation(word: string): string {
    const translations: Record<string, string> = {
      where: "어디",
      is: "이다",
      how: "어떻게",
      do: "하다",
      get: "가다",
      to: "~로",
      i: "나",
      would: "~하고 싶다",
      like: "좋아하다",
      order: "주문하다",
      please: "주세요",
    };
    return translations[word.toLowerCase()] || `[${word}]`;
  }

  private identifyPOS(word: string): any {
    const questionWords = ["where", "how", "what", "when"];
    const verbs = ["is", "are", "do", "can", "would"];

    if (questionWords.includes(word.toLowerCase())) return "SUBJECT";
    if (verbs.includes(word.toLowerCase())) return "VERB";
    return "OBJECT";
  }
}

export const fallbackPatternService = new FallbackPatternService();
