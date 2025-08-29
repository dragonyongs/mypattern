// src/shared/services/unifiedPatternService.ts (완전한 버전)

import { unifiedGrammarEngine } from "./unifiedGrammarEngine";
import { useLexiconStore } from "@/stores/lexiconStore";
import { getWordCategory } from "@/features/learn/services/wordCategories";
import type { ConversationPattern, UserIntent } from "@/features/build/types";

interface GeneratedSentence {
  id: string;
  english: string;
  korean: string;
  ruleId: string;
  confidence: number;
  usedWords: string[];
  structure: string;
}

interface AnalyzedInput {
  intent: string;
  words: any[];
  categories: string[];
}

export class UnifiedPatternService {
  // ✅ Learn 탭에서 사용 (데이터 소스 통일)
  generateLearningPatterns(
    userLevel: string = "beginner",
    limit: number = 5
  ): any[] {
    // ✅ useLexiconStore에서 직접 가져오기
    const lexiconStore = useLexiconStore.getState();
    const userWords = lexiconStore.words;

    console.log("📊 실제 로드된 단어 수:", userWords.length);

    if (userWords.length === 0) {
      console.warn("⚠️ 단어가 없습니다. 기본 단어를 먼저 로드하세요.");
      return [];
    }

    const sentences = unifiedGrammarEngine.generateValidSentences(
      userWords,
      undefined,
      limit * 2
    );

    return sentences.slice(0, limit).map((sentence) => ({
      id: sentence.id,
      text: sentence.english,
      korean: sentence.korean,
      templateId: sentence.ruleId,
      difficulty: userLevel,
      category: this.inferCategory(sentence.structure),
      estimatedTime: 3,
      completed: false,
      confidence: sentence.confidence,
    }));
  }

  // ✅ Build 탭에서 사용 (데이터 소스 통일)
  matchPatternsForBuild(userInput: string): ConversationPattern[] {
    const analyzedInput = this.analyzeUserInput(userInput);
    const relatedWords = this.extractRelatedWords(analyzedInput);

    // ✅ lexiconStore에서 단어 가져오기
    const lexiconStore = useLexiconStore.getState();
    const allWords = lexiconStore.words;

    // 관련 단어가 없으면 전체 단어 사용
    const finalWords = relatedWords.length > 0 ? relatedWords : allWords;

    console.log("🔍 Build에서 사용할 단어 수:", finalWords.length);

    const sentences = unifiedGrammarEngine.generateValidSentences(
      finalWords,
      analyzedInput.intent,
      5
    );

    return sentences.map((sentence) => ({
      id: sentence.id,
      scenario: `${this.inferCategory(sentence.structure)} 상황`,
      userSide: {
        korean: sentence.korean,
        english: sentence.english,
        structure: sentence.structure,
        cards: this.generateCards(sentence.english),
      },
      responseSide: {
        korean: this.generateResponse(sentence).korean,
        english: this.generateResponse(sentence).english,
        variations: this.generateVariations(sentence),
      },
    }));
  }

  // ✅ 카테고리 추론 (패턴 구조 기반)
  private inferCategory(structure: string): string {
    console.log("🏷️ 카테고리 추론:", structure);

    // 구조 기반 카테고리 매핑
    const categoryMap: Record<string, string> = {
      POLITE_REQUEST: "daily",
      ORDER_REQUEST: "daily",
      WH_QUESTION: "directions",
      LOCATION_INQUIRY: "directions",
      TRANSPORTATION: "directions",
      GREETING: "daily",
      BUSINESS_MEETING: "business",
      SCHOOL_ASSIGNMENT: "school",
    };

    // 정확한 매칭 우선
    for (const [pattern, category] of Object.entries(categoryMap)) {
      if (structure.includes(pattern)) {
        console.log(`✅ 매칭: ${pattern} → ${category}`);
        return category;
      }
    }

    // 키워드 기반 추론
    if (/REQUEST|ORDER|WANT|NEED/.test(structure)) return "daily";
    if (/WHERE|HOW|DIRECTION|LOCATION/.test(structure)) return "directions";
    if (/BUSINESS|MEETING|WORK/.test(structure)) return "business";
    if (/SCHOOL|STUDY|HOMEWORK/.test(structure)) return "school";

    console.log("⚠️ 기본 카테고리 적용: daily");
    return "daily";
  }

  // ✅ 관련 단어 추출 (분석된 입력에서)
  private extractRelatedWords(analyzedInput: AnalyzedInput): any[] {
    console.log("🔍 관련 단어 추출:", analyzedInput);

    const relatedWords = [...(analyzedInput.words || [])];
    const lexiconStore = useLexiconStore.getState();
    const allLexemes = lexiconStore.words;

    // 카테고리 기반 관련 단어 추가
    for (const category of analyzedInput.categories || []) {
      const categoryWords = allLexemes.filter(
        (lex) =>
          lex.tags?.includes(category) ||
          getWordCategory(lex.en || lex.ko).includes(category.toUpperCase())
      );

      // 최대 3개씩만 추가 (성능 고려)
      relatedWords.push(...categoryWords.slice(0, 3));
    }

    // 중복 제거
    const uniqueWords = relatedWords.filter(
      (word, index, self) =>
        index === self.findIndex((w) => (w.id || w.en) === (word.id || word.en))
    );

    console.log(`📝 추출된 관련 단어: ${uniqueWords.length}개`);
    return uniqueWords.slice(0, 20); // 최대 20개로 제한
  }

  // ✅ 카드 생성 (문장을 단어 카드로 분해)
  private generateCards(english: string): any[] {
    if (!english) return [];

    console.log("🎴 카드 생성:", english);

    const words = english
      .replace(/[^\w\s]/g, "") // 구두점 제거
      .split(/\s+/)
      .filter((w) => w.length > 0);

    const cards = words.map((word, index) => {
      const isUserInput = word.startsWith("[") && word.endsWith("]");
      const cleanWord = isUserInput ? word.slice(1, -1) : word;
      const koreanTranslation = this.getKoreanTranslation(cleanWord);
      const pos = this.identifyPOS(cleanWord);

      return {
        id: `card_${Date.now()}_${index}`,
        text: cleanWord,
        korean: koreanTranslation,
        pos: pos,
        isPlaced: false,
        isCorrect: false,
        feedbackColor: "default" as const,
        needsUserInput: isUserInput,
      };
    });

    console.log(`🎯 생성된 카드: ${cards.length}개`);
    return cards;
  }

  // ✅ 변형 표현 생성
  private generateVariations(sentence: GeneratedSentence): string[] {
    if (!sentence) return [];

    console.log("🔄 변형 표현 생성:", sentence.structure);

    const variations: string[] = [];
    const structure = sentence.structure || "";

    if (structure.includes("POLITE_REQUEST") || structure.includes("REQUEST")) {
      variations.push(
        "Could you please help me?",
        "Would you mind assisting me?",
        "I'd appreciate your help"
      );
    } else if (
      structure.includes("WH_QUESTION") ||
      structure.includes("QUESTION")
    ) {
      variations.push(
        "Do you happen to know?",
        "Could you tell me?",
        "I'm looking for information about"
      );
    } else if (structure.includes("GREETING")) {
      variations.push(
        "Good morning!",
        "How are you doing?",
        "Nice to see you!"
      );
    } else {
      variations.push(
        "I see",
        "That makes sense",
        "Thank you for letting me know"
      );
    }

    console.log(`🎭 생성된 변형: ${variations.length}개`);
    return variations.slice(0, 3); // 최대 3개
  }

  // ✅ 카테고리 추출 (단어 목록에서)
  private extractCategories(words: any[]): string[] {
    if (!words || !Array.isArray(words)) return [];

    console.log("📊 카테고리 추출:", words.length + "개 단어");

    const categories = new Set<string>();

    for (const word of words) {
      // 직접적인 태그들
      if (word.tags && Array.isArray(word.tags)) {
        word.tags.forEach((tag: string) => categories.add(tag));
      }

      // POS 기반 카테고리
      if (word.pos) {
        categories.add(word.pos);
      }

      // 의미적 카테고리 (wordCategories.ts 활용)
      const semanticCategories = getWordCategory(word.en || word.ko || "");
      semanticCategories.forEach((cat) => categories.add(cat.toLowerCase()));
    }

    const result = Array.from(categories);
    console.log(`🏷️ 추출된 카테고리: [${result.join(", ")}]`);
    return result;
  }

  // ===== 헬퍼 메서드들 =====

  // ✅ 사용자 입력 분석 (기존 메서드 개선)
  private analyzeUserInput(input: string): AnalyzedInput {
    console.log("🔍 입력 분석 시작:", input);

    const words = input.split(/\s+/);
    const extractedWords: any[] = [];

    // ✅ lexiconStore에서 단어 가져오기
    const lexiconStore = useLexiconStore.getState();
    const allLexemes = lexiconStore.words;

    console.log("📚 분석에 사용할 전체 어휘:", allLexemes.length + "개");

    // 단어 매칭 (더 정교하게)
    for (const word of words) {
      // 정확한 매칭 우선
      const exactMatches = allLexemes.filter(
        (lex) => lex.ko === word || lex.en.toLowerCase() === word.toLowerCase()
      );

      if (exactMatches.length > 0) {
        extractedWords.push(...exactMatches);
        continue;
      }

      // 부분 매칭
      const partialMatches = allLexemes.filter(
        (lex) =>
          lex.ko.includes(word) ||
          word.includes(lex.ko) ||
          lex.en.toLowerCase().includes(word.toLowerCase()) ||
          word.toLowerCase().includes(lex.en.toLowerCase())
      );

      extractedWords.push(...partialMatches.slice(0, 2)); // 최대 2개
    }

    const categories = this.extractCategories(extractedWords);
    const intent = this.inferIntent(input);

    console.log(
      `📋 분석 결과: 의도=${intent}, 단어=${extractedWords.length}개, 카테고리=${categories.length}개`
    );

    return {
      intent,
      words: extractedWords,
      categories,
    };
  }

  // ✅ 의도 추론 (키워드 기반)
  private inferIntent(input: string): string {
    const normalized = input.toLowerCase();

    // 우선순위 기반 의도 분류
    const intentPatterns = [
      { intent: "request", patterns: [/주세요|주문|원해요|하고싶어요|부탁/] },
      { intent: "location", patterns: [/어디|위치|있나요|찾고있어요/] },
      { intent: "directions", patterns: [/어떻게|가나요|방법|길|가는/] },
      { intent: "greeting", patterns: [/안녕|반가워|만나서|처음/] },
      { intent: "business", patterns: [/회의|업무|보고|계약|미팅/] },
      { intent: "school", patterns: [/숙제|과제|시험|공부|학교/] },
    ];

    for (const { intent, patterns } of intentPatterns) {
      if (patterns.some((pattern) => pattern.test(normalized))) {
        console.log(`🎯 의도 감지: ${intent}`);
        return intent;
      }
    }

    console.log("🤷 기본 의도: general");
    return "general";
  }

  // ✅ 응답 생성 (컨텍스트 기반)
  private generateResponse(sentence: GeneratedSentence): {
    korean: string;
    english: string;
  } {
    const responseMap: Record<string, { korean: string; english: string }> = {
      POLITE_REQUEST: {
        korean: "네, 여기 있습니다",
        english: "Here you go",
      },
      WH_QUESTION: {
        korean: "저쪽에 있어요",
        english: "It's over there",
      },
      GREETING: {
        korean: "안녕하세요! 반가워요",
        english: "Hello! Nice to meet you",
      },
      BUSINESS: {
        korean: "네, 확인해드리겠습니다",
        english: "Yes, I'll check that for you",
      },
      SCHOOL: {
        korean: "도와드릴게요",
        english: "I'll help you with that",
      },
    };

    // 구조별 응답 찾기
    for (const [pattern, response] of Object.entries(responseMap)) {
      if (sentence.structure.includes(pattern)) {
        return response;
      }
    }

    // 기본 응답
    return {
      korean: "네, 알겠습니다",
      english: "Yes, I understand",
    };
  }

  // ✅ 한국어 번역 (기존 로직 활용)
  private getKoreanTranslation(word: string): string {
    // ✅ lexiconStore에서 찾기
    const lexiconStore = useLexiconStore.getState();
    const allLexemes = lexiconStore.words;

    const found = allLexemes.find(
      (lexeme) => lexeme.en.toLowerCase() === word.toLowerCase()
    );

    if (found) return found.ko;

    // 기본 번역 테이블
    const basicTranslations: Record<string, string> = {
      // 기본 동사들
      can: "할 수 있다",
      have: "가지다",
      want: "원하다",
      need: "필요하다",
      like: "좋아하다",
      get: "받다",
      go: "가다",
      come: "오다",

      // 기본 명사들
      water: "물",
      coffee: "커피",
      tea: "차",
      food: "음식",
      place: "장소",
      time: "시간",

      // 기본 형용사/부사들
      please: "주세요",
      here: "여기",
      there: "저기",
      good: "좋은",
      nice: "좋은",

      // 기본 대명사들
      i: "나",
      you: "당신",
      we: "우리",
      they: "그들",

      // 기본 전치사들
      to: "~로",
      at: "~에서",
      in: "~에",
      on: "~에",
    };

    return basicTranslations[word.toLowerCase()] || `[${word}]`;
  }

  // ✅ POS 식별 (품사 추론)
  private identifyPOS(word: string): string {
    const lowerWord = word.toLowerCase();

    // 질문사
    if (["where", "how", "what", "when", "who", "why"].includes(lowerWord)) {
      return "SUBJECT";
    }

    // 조동사/동사
    if (
      ["can", "could", "would", "should", "may", "might"].includes(lowerWord)
    ) {
      return "MODAL";
    }

    if (
      [
        "is",
        "are",
        "was",
        "were",
        "do",
        "does",
        "did",
        "have",
        "has",
        "had",
      ].includes(lowerWord)
    ) {
      return "VERB";
    }

    // 전치사
    if (
      ["to", "at", "in", "on", "by", "for", "with", "from"].includes(lowerWord)
    ) {
      return "PREPOSITION";
    }

    // 관사
    if (["a", "an", "the"].includes(lowerWord)) {
      return "ARTICLE";
    }

    // 기본값은 명사/객체로 처리
    return "OBJECT";
  }
}

export const unifiedPatternService = new UnifiedPatternService();
