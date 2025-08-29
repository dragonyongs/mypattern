// src/features/build/services/simplePatternMatcher.ts
import { dataPackLoader } from "@/shared/services/dataPackLoader";
import type { ConversationPattern, UserIntent } from "../types";

interface PatternTemplate {
  id: string;
  korean: string;
  english: string;
  structure: string;
  keywords: string[];
  category: string;
  responseKorean: string;
  responseEnglish: string;
  variations: string[];
}

export class SimplePatternMatcher {
  // 기본 패턴 템플릿들
  private basePatterns: PatternTemplate[] = [
    {
      id: "where-is",
      korean: "PLACE이/가 어디에 있나요?",
      english: "Where is PLACE?",
      structure: "WHERE + BE + PLACE",
      keywords: ["어디", "있나요", "위치", "장소"],
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
      id: "bus-to-place",
      korean: "PLACE으로/로 가는 버스가 있나요?",
      english: "Is there a bus to PLACE?",
      structure: "IS + THERE + BUS + TO + PLACE",
      keywords: ["버스", "가는", "있나요", "교통"],
      category: "directions",
      responseKorean: "네, 142번 버스를 타세요",
      responseEnglish: "Yes, take bus number 142",
      variations: [
        "Take the blue line",
        "Transfer at Seoul Station",
        "It runs every 10 minutes",
      ],
    },
    {
      id: "order-drink",
      korean: "ITEM을/를 주문하고 싶어요",
      english: "I would like to order ITEM",
      structure: "I + WOULD + LIKE + TO + ORDER + ITEM",
      keywords: ["주문", "하고 싶어요", "카페", "음료"],
      category: "daily",
      responseKorean: "어떤 사이즈로 드릴까요?",
      responseEnglish: "What size would you like?",
      variations: ["For here or to go?", "Any extras?", "That will be $4.50"],
    },
    {
      id: "can-i-have",
      korean: "ITEM을/를 주세요",
      english: "Can I have ITEM please?",
      structure: "CAN + I + HAVE + ITEM + PLEASE",
      keywords: ["주세요", "줄 수", "있나요", "해주세요"],
      category: "daily",
      responseKorean: "네, 여기 있습니다",
      responseEnglish: "Here you go",
      variations: ["Of course", "Right away", "Anything else?"],
    },
    {
      id: "meeting-schedule",
      korean: "회의를 TIME에 잡고 싶어요",
      english: "I would like to schedule a meeting at TIME",
      structure: "I + WOULD + LIKE + TO + SCHEDULE + MEETING + AT + TIME",
      keywords: ["회의", "일정", "잡고", "예약"],
      category: "business",
      responseKorean: "확인해드릴게요",
      responseEnglish: "I'll check the schedule",
      variations: [
        "Let me confirm",
        "Is that available?",
        "I will send you an invite",
      ],
    },
  ];

  matchPatterns(intent: UserIntent): ConversationPattern[] {
    const input = intent.korean.toLowerCase();
    const matchedPatterns: Array<{ pattern: PatternTemplate; score: number }> =
      [];

    // 각 패턴과 키워드 매칭 점수 계산
    for (const pattern of this.basePatterns) {
      let score = 0;

      // 키워드 매칭
      for (const keyword of pattern.keywords) {
        if (input.includes(keyword)) {
          score += 2;
        }
      }

      // 부분 문자열 매칭
      const patternWords = pattern.korean
        .replace(/PLACE|ITEM|TIME|PERSON/g, "")
        .split(/\s+/);
      for (const word of patternWords) {
        if (word.length > 1 && input.includes(word)) {
          score += 1;
        }
      }

      if (score > 0) {
        matchedPatterns.push({ pattern, score });
      }
    }

    // 점수 순으로 정렬
    matchedPatterns.sort((a, b) => b.score - a.score);

    // ConversationPattern 형태로 변환하면서 실제 단어로 슬롯 채우기
    return matchedPatterns.slice(0, 3).map(({ pattern }) => {
      const filledPattern = this.fillPatternWithActualWords(
        pattern,
        intent.korean
      );
      return this.convertToConversationPattern(filledPattern, pattern);
    });
  }

  private fillPatternWithActualWords(
    pattern: PatternTemplate,
    originalInput: string
  ): PatternTemplate {
    let filledKorean = pattern.korean;
    let filledEnglish = pattern.english;

    // 실제 데이터에서 단어 찾기
    const places = dataPackLoader.getLexemesByPos(["PLACE"]);
    const items = dataPackLoader.getLexemesByPos(["ITEM"]);
    const times = dataPackLoader.getLexemesByPos(["TIME"]);
    const persons = dataPackLoader.getLexemesByPos(["PERSON"]);

    // PLACE 슬롯 채우기
    if (pattern.korean.includes("PLACE")) {
      const placeWord = this.extractPlaceFromInput(originalInput);
      if (placeWord) {
        const matchingPlace = places.find(
          (p) => p.ko.includes(placeWord) || placeWord.includes(p.ko)
        );

        if (matchingPlace) {
          filledKorean = filledKorean.replace(/PLACE/g, matchingPlace.ko);
          filledEnglish = filledEnglish.replace(/PLACE/g, matchingPlace.en);
        } else {
          // 매칭되는 장소가 없으면 사용자 입력 그대로 사용
          filledKorean = filledKorean.replace(/PLACE/g, placeWord);
          filledEnglish = filledEnglish.replace(/PLACE/g, `[${placeWord}]`); // 사용자가 채워야 함을 표시
        }
      }
    }

    // ITEM 슬롯 채우기
    if (pattern.korean.includes("ITEM")) {
      const itemWord = this.extractItemFromInput(originalInput);
      if (itemWord) {
        const matchingItem = items.find(
          (i) => i.ko.includes(itemWord) || itemWord.includes(i.ko)
        );

        if (matchingItem) {
          filledKorean = filledKorean.replace(/ITEM/g, matchingItem.ko);
          filledEnglish = filledEnglish.replace(/ITEM/g, matchingItem.en);
        } else {
          filledKorean = filledKorean.replace(/ITEM/g, itemWord);
          filledEnglish = filledEnglish.replace(/ITEM/g, `[${itemWord}]`);
        }
      }
    }

    // TIME 슬롯 채우기
    if (pattern.korean.includes("TIME")) {
      const timeWord = this.extractTimeFromInput(originalInput);
      if (timeWord) {
        const matchingTime = times.find(
          (t) => t.ko.includes(timeWord) || timeWord.includes(t.ko)
        );

        if (matchingTime) {
          filledKorean = filledKorean.replace(/TIME/g, matchingTime.ko);
          filledEnglish = filledEnglish.replace(/TIME/g, matchingTime.en);
        } else {
          filledKorean = filledKorean.replace(/TIME/g, timeWord);
          filledEnglish = filledEnglish.replace(/TIME/g, `[${timeWord}]`);
        }
      }
    }

    return {
      ...pattern,
      korean: filledKorean,
      english: filledEnglish,
    };
  }

  private extractPlaceFromInput(input: string): string {
    // 장소 관련 키워드 추출
    const placeKeywords = [
      "역",
      "정류장",
      "카페",
      "병원",
      "은행",
      "학교",
      "집",
      "회사",
    ];
    const words = input.split(" ");

    for (const word of words) {
      if (placeKeywords.some((keyword) => word.includes(keyword))) {
        return word;
      }
      // "강남역", "홍대입구역" 같은 패턴
      if (word.includes("역") || word.includes("정류장")) {
        return word;
      }
    }

    return "";
  }

  private extractItemFromInput(input: string): string {
    const itemKeywords = ["커피", "라떼", "아메리카노", "샌드위치", "음료"];
    const words = input.split(" ");

    for (const word of words) {
      if (itemKeywords.some((keyword) => word.includes(keyword))) {
        return word;
      }
    }

    return "";
  }

  private extractTimeFromInput(input: string): string {
    const timeKeywords = ["오전", "오후", "시", "분", "오늘", "내일", "다음주"];
    const words = input.split(" ");

    for (const word of words) {
      if (timeKeywords.some((keyword) => word.includes(keyword))) {
        return word;
      }
    }

    return "";
  }

  private convertToConversationPattern(
    filledPattern: PatternTemplate,
    originalPattern: PatternTemplate
  ): ConversationPattern {
    return {
      id: filledPattern.id,
      scenario: this.generateScenario(originalPattern.category),
      userSide: {
        korean: filledPattern.korean,
        english: filledPattern.english,
        structure: filledPattern.structure,
        cards: this.generateCards(filledPattern.english),
      },
      responseSide: {
        korean: filledPattern.responseKorean,
        english: filledPattern.responseEnglish,
        variations: filledPattern.variations,
      },
    };
  }

  private generateScenario(category: string): string {
    const scenarios = {
      directions: "길 찾기 및 교통 문의",
      daily: "일상 대화",
      business: "업무 관련 대화",
    };
    return scenarios[category] || "일반 대화";
  }

  private generateCards(english: string): any[] {
    // [단어] 형태는 사용자 입력 필요를 나타냄
    const words = english.split(" ").filter((w) => w.length > 1);

    return words.map((word, index) => {
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
        needsUserInput: isUserInput, // 사용자가 입력해야 하는 단어 표시
      };
    });
  }

  private getKoreanTranslation(word: string): string {
    // 데이터에서 번역 찾기
    const allLexemes = dataPackLoader.getAllLexemes();
    const found = allLexemes.find(
      (lexeme) => lexeme.en.toLowerCase() === word.toLowerCase()
    );

    if (found) return found.ko;

    // 기본 번역 사전
    const basicTranslations: Record<string, string> = {
      where: "어디",
      is: "이다",
      how: "어떻게",
      do: "하다",
      get: "가다",
      to: "~로",
      bus: "버스",
      station: "역",
      please: "주세요",
      can: "할 수 있다",
      have: "가지다",
      would: "~하고 싶다",
      like: "좋아하다",
      order: "주문하다",
    };

    return basicTranslations[word.toLowerCase()] || `[${word}]`;
  }

  private identifyPOS(word: string): any {
    const lowerWord = word.toLowerCase();
    if (["where", "how", "what", "when"].includes(lowerWord)) return "SUBJECT";
    if (["is", "are", "do", "can", "would"].includes(lowerWord)) return "VERB";
    if (["to", "at", "in", "on"].includes(lowerWord)) return "OBJECT";
    return "OBJECT";
  }
}

export const simplePatternMatcher = new SimplePatternMatcher();
