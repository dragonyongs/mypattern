// src/features/build/services/intentAnalyzer.ts (수정된 버전)
import { unifiedPatternEngine } from "@/shared/services/unifiedPatternEngine";
import type { UserIntent, ConversationPattern } from "../types";

export class IntentAnalyzer {
  analyzeIntent(koreanText: string): UserIntent {
    // unifiedPatternEngine의 분석 활용
    const analysis = unifiedPatternEngine["analyzeIntent"](koreanText);

    return {
      korean: koreanText,
      category: analysis.type,
      confidence: analysis.confidence,
    };
  }

  matchPatterns(intent: UserIntent): ConversationPattern[] {
    // 실제 데이터팩에서 동적으로 패턴 생성
    const generated = unifiedPatternEngine.generateConversationPatterns(
      intent.korean,
      {
        category: "daily", // 기본 카테고리
        level: "beginner",
        limit: 5,
        keywords: this.extractKeywords(intent.korean),
      }
    );

    // GeneratedSentence를 ConversationPattern으로 변환
    return generated.map((sentence) => ({
      id: sentence.templateId,
      scenario: this.generateScenario(sentence.text),
      userSide: {
        korean: sentence.korean,
        english: sentence.text,
        structure: this.extractStructure(sentence.text),
        cards: this.generateCards(sentence.text),
      },
      responseSide: {
        korean: this.generateKoreanResponse(sentence.text),
        english: this.generateEnglishResponse(sentence.text),
        variations: this.generateResponseVariations(sentence.text),
      },
    }));
  }

  private extractKeywords(korean: string): string[] {
    const commonWords = ["은", "는", "이", "가", "을", "를", "에", "에서"];
    return korean
      .split(" ")
      .filter((word) => word.length > 1 && !commonWords.includes(word))
      .slice(0, 3);
  }

  private generateScenario(english: string): string {
    if (english.includes("bus") || english.includes("station")) {
      return "교통 관련 문의";
    }
    if (english.includes("coffee") || english.includes("order")) {
      return "카페 주문";
    }
    return "일반 대화";
  }

  private extractStructure(english: string): string {
    // 간단한 문장 구조 분석
    const words = english.split(" ");
    const structure = words
      .map((word) => {
        if (["Where", "How", "What", "When"].includes(word)) return "WH";
        if (["is", "are", "do", "does", "can", "could"].includes(word))
          return "AUX";
        if (["I", "you", "we", "they"].includes(word)) return "SUBJ";
        if (word.endsWith("ing")) return "VERB";
        return "X";
      })
      .filter((s) => s !== "X")
      .join(" + ");

    return structure || "SUBJ + VERB + OBJ";
  }

  private generateCards(english: string): any[] {
    const words = english.split(" ").filter((w) => w.length > 2);
    return words.map((word, index) => ({
      id: `card_${index}`,
      text: word,
      korean: this.translateWord(word),
      pos: this.identifyPOS(word),
      isPlaced: false,
      isCorrect: false,
      feedbackColor: "default" as const,
    }));
  }

  private translateWord(word: string): string {
    const translations: Record<string, string> = {
      where: "어디",
      bus: "버스",
      stop: "정류장",
      station: "역",
      coffee: "커피",
      please: "주세요",
    };
    return translations[word.toLowerCase()] || word;
  }

  private identifyPOS(word: string): any {
    const lowerWord = word.toLowerCase();
    if (["where", "how", "what"].includes(lowerWord)) return "SUBJECT";
    if (["is", "are", "do", "can"].includes(lowerWord)) return "VERB";
    if (["bus", "coffee", "ticket"].includes(lowerWord)) return "OBJECT";
    return "OBJECT";
  }

  private generateKoreanResponse(english: string): string {
    if (english.includes("Where is")) return "저쪽에 있어요";
    if (english.includes("How do I get")) return "직진해서 오른쪽으로 가세요";
    if (english.includes("coffee")) return "어떤 커피를 원하시나요?";
    return "네, 알겠습니다";
  }

  private generateEnglishResponse(english: string): string {
    if (english.includes("Where is")) return "It's over there";
    if (english.includes("How do I get")) return "Go straight and turn right";
    if (english.includes("coffee"))
      return "What kind of coffee would you like?";
    return "Sure, I understand";
  }

  private generateResponseVariations(english: string): string[] {
    if (english.includes("Where is")) {
      return [
        "It's around the corner",
        "You can find it over there",
        "It's about 2 minutes away",
      ];
    }
    if (english.includes("coffee")) {
      return [
        "We have americano and latte",
        "What size would you like?",
        "For here or to go?",
      ];
    }
    return ["Of course", "No problem", "I'd be happy to help"];
  }
}
