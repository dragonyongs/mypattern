// src/shared/services/unifiedPatternEngine.ts
import { dataPackLoader } from "./dataPackLoader";
import type {
  Lexeme,
  POS,
  LangTag,
} from "@/features/learn/types/patternCore.types";

export interface GenerationContext {
  intent?: string;
  category: LangTag;
  level: "beginner" | "intermediate" | "advanced";
  limit?: number;
  keywords?: string[];
  excludeUsed?: string[];
}

export interface GeneratedSentence {
  id: string;
  text: string;
  korean: string;
  templateId: string;
  usedLexemes: string[];
  category: LangTag;
  confidence: number;
}

export class UnifiedPatternEngine {
  // Learn용: 기본 패턴 생성
  generateLearnPatterns(context: GenerationContext): GeneratedSentence[] {
    const patterns = dataPackLoader.getPatternsByCategory([context.category]);
    const lexemes = dataPackLoader.getLexemesByCategory([context.category]);

    return this.createSentencesFromPatterns(patterns, lexemes, context);
  }

  // Build용: 의도 기반 대화 패턴 생성
  generateConversationPatterns(
    koreanIntent: string,
    context: GenerationContext
  ): GeneratedSentence[] {
    // 의도 분석
    const analyzedIntent = this.analyzeIntent(koreanIntent);

    // 관련 패턴 찾기
    const relevantPatterns = this.findRelevantPatterns(
      analyzedIntent,
      context.category
    );

    // 키워드 추출
    const keywords = this.extractKeywords(koreanIntent);

    // 적절한 lexemes 선택
    const contextLexemes = this.selectContextualLexemes(
      keywords,
      analyzedIntent,
      context.category
    );

    return this.createSentencesFromPatterns(
      relevantPatterns,
      contextLexemes,
      context
    );
  }

  private analyzeIntent(koreanText: string): {
    type: "question" | "request" | "information";
    domain: "directions" | "daily" | "business";
    confidence: number;
  } {
    const questionWords = ["어디", "어떻게", "언제", "무엇", "누구"];
    const requestWords = ["해주세요", "도와주세요", "알려주세요"];
    const directionWords = ["버스", "정류장", "역", "길", "가는"];
    const dailyWords = ["카페", "주문", "음식", "친구"];
    const businessWords = ["회의", "업무", "계약", "제안"];

    let type: "question" | "request" | "information" = "information";
    let domain: "directions" | "daily" | "business" = "daily";
    let confidence = 0.5;

    // 의도 타입 분석
    if (questionWords.some((word) => koreanText.includes(word))) {
      type = "question";
      confidence += 0.3;
    } else if (requestWords.some((word) => koreanText.includes(word))) {
      type = "request";
      confidence += 0.2;
    }

    // 도메인 분석
    if (directionWords.some((word) => koreanText.includes(word))) {
      domain = "directions";
      confidence += 0.3;
    } else if (businessWords.some((word) => koreanText.includes(word))) {
      domain = "business";
      confidence += 0.2;
    } else if (dailyWords.some((word) => koreanText.includes(word))) {
      domain = "daily";
      confidence += 0.2;
    }

    return { type, domain, confidence: Math.min(confidence, 1.0) };
  }

  private findRelevantPatterns(intent: any, category: LangTag) {
    let patterns = dataPackLoader.getPatternsByCategory([
      category,
      intent.domain,
    ]);

    // 의도 타입에 따른 패턴 필터링
    if (intent.type === "question") {
      patterns = patterns.filter(
        (p) =>
          p.surface.startsWith("Where") ||
          p.surface.startsWith("How") ||
          p.surface.startsWith("What") ||
          p.surface.includes("?")
      );
    }

    return patterns;
  }

  private extractKeywords(koreanText: string): string[] {
    // 간단한 키워드 추출 (실제로는 더 정교한 NLP 필요)
    const commonWords = [
      "은",
      "는",
      "이",
      "가",
      "을",
      "를",
      "에",
      "에서",
      "로",
      "으로",
    ];
    return koreanText
      .split(" ")
      .filter((word) => word.length > 1 && !commonWords.includes(word))
      .slice(0, 3);
  }

  private selectContextualLexemes(
    keywords: string[],
    intent: any,
    category: LangTag
  ): Lexeme[] {
    const allLexemes = dataPackLoader.getLexemesByCategory([
      category,
      intent.domain,
    ]);

    // 키워드와 관련된 lexemes 우선 선택
    const keywordMatched = allLexemes.filter((lexeme) =>
      keywords.some(
        (keyword) =>
          lexeme.ko.includes(keyword) ||
          lexeme.en.toLowerCase().includes(keyword.toLowerCase())
      )
    );

    // 부족하면 카테고리 기반으로 추가
    const additional = allLexemes
      .filter((lexeme) => !keywordMatched.includes(lexeme))
      .slice(0, 20);

    return [...keywordMatched, ...additional];
  }

  private createSentencesFromPatterns(
    patterns: any[],
    lexemes: Lexeme[],
    context: GenerationContext
  ): GeneratedSentence[] {
    const results: GeneratedSentence[] = [];
    const limit = context.limit || 10;

    // POS별로 lexemes 그룹화
    const lexemesByPos = this.groupLexemesByPos(lexemes);

    for (const pattern of patterns.slice(0, Math.ceil(limit / 2))) {
      // 각 패턴에 대해 여러 변형 생성
      for (let i = 0; i < 3 && results.length < limit; i++) {
        const sentence = this.fillPatternSlots(pattern, lexemesByPos);
        if (sentence) {
          results.push({
            id: `gen_${Date.now()}_${results.length}`,
            text: sentence.english,
            korean: sentence.korean,
            templateId: pattern.id,
            usedLexemes: sentence.usedLexemeIds,
            category: context.category,
            confidence: this.calculateConfidence(sentence, context),
          });
        }
      }
    }

    return results.sort((a, b) => b.confidence - a.confidence);
  }

  private groupLexemesByPos(lexemes: Lexeme[]): Record<POS, Lexeme[]> {
    const grouped: Record<POS, Lexeme[]> = {} as any;

    lexemes.forEach((lexeme) => {
      if (!grouped[lexeme.pos]) {
        grouped[lexeme.pos] = [];
      }
      grouped[lexeme.pos].push(lexeme);
    });

    return grouped;
  }

  private fillPatternSlots(pattern: any, lexemesByPos: Record<POS, Lexeme[]>) {
    let english = pattern.surface;
    let korean =
      pattern.koSurface || this.generateKoreanSurface(pattern.surface);
    const usedLexemeIds: string[] = [];

    for (const slot of pattern.slots) {
      const availableLexemes = lexemesByPos[slot.accept] || [];
      if (availableLexemes.length === 0 && slot.required) {
        return null; // 필수 슬롯을 채울 수 없음
      }

      if (availableLexemes.length > 0) {
        const lexeme =
          availableLexemes[Math.floor(Math.random() * availableLexemes.length)];
        english = english.replace(slot.name, lexeme.en);
        korean = korean.replace(slot.name, lexeme.ko);
        usedLexemeIds.push(lexeme.id);
      }
    }

    // 간단한 문법 보정
    english = this.applyGrammarCorrections(english);

    return {
      english,
      korean,
      usedLexemeIds,
    };
  }

  private generateKoreanSurface(englishSurface: string): string {
    // 간단한 영어->한국어 표면 변환
    const translations = {
      "Where is": "어디에 있나요",
      "How do I get to": "어떻게 가나요",
      "Can I have": "주세요",
      "I would like": "하고 싶어요",
    };

    let korean = englishSurface;
    Object.entries(translations).forEach(([eng, kor]) => {
      korean = korean.replace(eng, kor);
    });

    return korean;
  }

  private applyGrammarCorrections(text: string): string {
    // a/an 보정
    text = text.replace(/\ba\s+([aeiouAEIOU])/g, "an $1");
    // 첫 글자 대문자
    text = text.charAt(0).toUpperCase() + text.slice(1);
    return text;
  }

  private calculateConfidence(
    sentence: any,
    context: GenerationContext
  ): number {
    let confidence = 0.7; // 기본값

    // 키워드 매칭 점수
    if (context.keywords?.length) {
      const matchCount = context.keywords.filter(
        (keyword) =>
          sentence.english.toLowerCase().includes(keyword.toLowerCase()) ||
          sentence.korean.includes(keyword)
      ).length;
      confidence += (matchCount / context.keywords.length) * 0.3;
    }

    return Math.min(confidence, 1.0);
  }
}

export const unifiedPatternEngine = new UnifiedPatternEngine();
