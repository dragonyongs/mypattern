export interface TranslationPattern {
  id: string;
  korean: string;
  english: string;
  structure: string; // SVO, SV, etc.
  level: "beginner" | "intermediate" | "advanced";
  category: string;
  variations: string[];
  usage: string;
}

export interface TranslationSuggestion {
  text: string;
  confidence: number;
  pattern: TranslationPattern;
  explanation: string;
}

class PatternBasedTranslator {
  private patterns: TranslationPattern[] = [
    {
      id: "greeting_1",
      korean: "안녕하세요",
      english: "Hello",
      structure: "INTJ",
      level: "beginner",
      category: "greeting",
      variations: ["Hi", "Good morning", "Nice to meet you"],
      usage: "일반적인 인사",
    },
    {
      id: "request_help",
      korean: "도와주세요",
      english: "Help me please",
      structure: "VP + ADV",
      level: "beginner",
      category: "request",
      variations: ["Could you help me?", "Can you help me?", "Please help me"],
      usage: "도움 요청",
    },
    {
      id: "location_ask",
      korean: "어디에 있나요?",
      english: "Where is it?",
      structure: "WH + SV",
      level: "beginner",
      category: "directions",
      variations: ["Where can I find...?", "Do you know where...?"],
      usage: "위치 묻기",
    },
    {
      id: "possession",
      korean: "저는 ... 있어요/가지고 있어요",
      english: "I have ...",
      structure: "S + V + O",
      level: "beginner",
      category: "possession",
      variations: ["I own...", "I've got..."],
      usage: "소유 표현",
    },
    {
      id: "present_continuous",
      korean: "저는 지금 ... 하고 있어요",
      english: "I am ... ing",
      structure: "S + BE + V-ing",
      level: "intermediate",
      category: "tense",
      variations: ["I'm currently...", "At the moment I'm..."],
      usage: "현재 진행형",
    },
  ];

  translateKoreanToEnglish(korean: string): TranslationSuggestion[] {
    const suggestions: TranslationSuggestion[] = [];
    const normalizedKorean = korean.trim().toLowerCase();

    this.patterns.forEach((pattern) => {
      const similarity = this.calculateSimilarity(
        normalizedKorean,
        pattern.korean
      );

      if (similarity > 0.3) {
        suggestions.push({
          text: pattern.english,
          confidence: similarity,
          pattern,
          explanation: `"${pattern.korean}" → "${pattern.english}" (${pattern.usage})`,
        });

        // 변형 표현도 추가
        pattern.variations.forEach((variation) => {
          suggestions.push({
            text: variation,
            confidence: similarity * 0.8,
            pattern,
            explanation: `"${pattern.korean}"의 다른 표현`,
          });
        });
      }
    });

    return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  }

  findEnglishPatterns(english: string): TranslationPattern[] {
    return this.patterns.filter((pattern) => {
      return (
        this.calculateSimilarity(
          english.toLowerCase(),
          pattern.english.toLowerCase()
        ) > 0.5 ||
        pattern.variations.some(
          (v) =>
            this.calculateSimilarity(english.toLowerCase(), v.toLowerCase()) >
            0.5
        )
      );
    });
  }

  private calculateSimilarity(text1: string, text2: string): number {
    // 간단한 유사도 계산 (Jaccard similarity)
    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));

    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  // 새로운 패턴 추가 (사용자/관리자용)
  addPattern(pattern: Omit<TranslationPattern, "id">): TranslationPattern {
    const newPattern: TranslationPattern = {
      ...pattern,
      id: `custom_${Date.now()}`,
    };

    this.patterns.push(newPattern);
    console.log("새 패턴 추가:", newPattern);

    return newPattern;
  }

  // 패턴 검증
  validatePattern(
    korean: string,
    english: string
  ): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    // 기본 검증
    if (korean.trim().length === 0) issues.push("한국어 문장이 필요합니다");
    if (english.trim().length === 0) issues.push("영어 문장이 필요합니다");

    // 영어 문법 검사
    const grammarResult = grammarChecker.checkGrammar(english);
    if (!grammarResult.isValid) {
      issues.push("영어 문법에 문제가 있을 수 있습니다");
      issues.push(...grammarResult.errors.map((e) => e.message));
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }
}

export const translationEngine = new PatternBasedTranslator();
