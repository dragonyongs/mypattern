// src/shared/services/smartPatternService.ts (완전한 개선 버전)

import type {
  Lexeme,
  POS,
  LangTag,
  PatternSchema,
  SlotSpec,
} from "@/features/learn/types/patternCore.types";
import type {
  UserIntent,
  ConversationPattern,
  SentenceCard,
} from "@/features/build/types";
import type { DailyPattern } from "@/stores/learningStore";
import { dataPackLoader } from "./dataPackLoader";

export interface SmartPatternContext {
  userInput?: string;
  intent?: UserIntent;
  selectedTags?: LangTag[];
  level?: "beginner" | "intermediate" | "advanced";
  limit?: number;
}

// ✅ 개선된 결과 인터페이스
export interface PatternMatchResult {
  conversationPatterns: ConversationPattern[];
  dailyPatterns: DailyPattern[];
  confidence: number;
  usedWords: string[];
  suggestions: string[];
  // ✅ 새로운 필드들 추가
  matchQuality: "excellent" | "good" | "fair" | "poor";
  missingData: MissingDataInfo;
  recommendations: RecommendationInfo;
  warnings: string[];
}

// ✅ 부족한 데이터 정보
export interface MissingDataInfo {
  missingPatterns: string[];
  missingWords: { pos: POS; examples: string[] }[];
  lowConfidenceSlots: string[];
  fallbacksUsed: string[];
}

// ✅ 추천 정보
export interface RecommendationInfo {
  suggestedPatterns: string[];
  suggestedWords: { ko: string; en: string; pos: POS }[];
  learningTips: string[];
  nextSteps: string[];
}

// ✅ 인사 및 일상 대화 패턴 추가
const GREETING_PATTERNS: PatternSchema[] = [
  {
    id: "GREETING-HELLO",
    category: "daily",
    level: "beginner",
    surface: "Hello, nice to meet you!",
    koSurface: "안녕하세요, 만나서 반가워요!",
    slots: [],
  },
  {
    id: "GREETING-HOW-ARE-YOU",
    category: "daily",
    level: "beginner",
    surface: "How are you doing?",
    koSurface: "어떻게 지내세요?",
    slots: [],
  },
  {
    id: "GREETING-NICE-TO-MEET",
    category: "daily",
    level: "beginner",
    surface: "Nice to meet you, [PERSON]!",
    koSurface: "[PERSON], 만나서 반가워요!",
    slots: [{ name: "PERSON", accept: ["PERSON"], required: false }],
  },
  {
    id: "DAILY-HAVE-ITEM",
    category: "daily",
    level: "beginner",
    surface: "I have [ITEM] with me.",
    koSurface: "[ITEM] 가지고 있어요.",
    slots: [{ name: "ITEM", accept: ["ITEM"], required: false }],
  },
  {
    id: "DAILY-LIKE-ITEM",
    category: "daily",
    level: "beginner",
    surface: "I really like [ITEM].",
    koSurface: "[ITEM] 정말 좋아해요.",
    slots: [{ name: "ITEM", accept: ["ITEM"], required: false }],
  },
];

// ✅ 기본 슬롯값 풀
const DEFAULT_SLOT_VALUES = {
  PLACE: [
    { ko: "학교", en: "school" },
    { ko: "카페", en: "cafe" },
    { ko: "병원", en: "hospital" },
    { ko: "도서관", en: "library" },
    { ko: "공원", en: "park" },
    { ko: "시장", en: "market" },
  ],
  PERSON: [
    { ko: "친구", en: "friend" },
    { ko: "선생님", en: "teacher" },
    { ko: "동료", en: "colleague" },
    { ko: "가족", en: "family" },
  ],
  ITEM: [
    { ko: "커피", en: "coffee" },
    { ko: "책", en: "book" },
    { ko: "휴대폰", en: "phone" },
    { ko: "가방", en: "bag" },
    { ko: "음식", en: "food" },
  ],
  TIME: [
    { ko: "오늘", en: "today" },
    { ko: "내일", en: "tomorrow" },
    { ko: "아침", en: "morning" },
    { ko: "저녁", en: "evening" },
  ],
  BEVERAGE: [
    { ko: "커피", en: "coffee" },
    { ko: "차", en: "tea" },
    { ko: "물", en: "water" },
    { ko: "주스", en: "juice" },
  ],
  FOOD: [
    { ko: "밥", en: "rice" },
    { ko: "빵", en: "bread" },
    { ko: "사과", en: "apple" },
    { ko: "샐러드", en: "salad" },
  ],
  COOKABLE: [
    { ko: "파스타", en: "pasta" },
    { ko: "스프", en: "soup" },
    { ko: "케이크", en: "cake" },
    { ko: "샐러드", en: "salad" },
  ],
  VERB: [
    { ko: "먹다", en: "eats" },
    { ko: "마시다", en: "drinks" },
    { ko: "읽다", en: "reads" },
    { ko: "보다", en: "watches" },
  ],
  OBJECT: [
    { ko: "책", en: "book" },
    { ko: "영화", en: "movie" },
    { ko: "음악", en: "music" },
    { ko: "게임", en: "game" },
  ],
};

class SmartPatternService {
  private lexiconStore: any;
  private learningStore: any;
  private isInitialized = false;

  // ✅ 매칭 품질 임계값
  private readonly QUALITY_THRESHOLDS = {
    excellent: 0.8,
    good: 0.6,
    fair: 0.4,
    poor: 0.0,
  };

  initialize(lexiconStore: any, learningStore: any) {
    this.lexiconStore = lexiconStore;
    this.learningStore = learningStore;
    this.isInitialized = true;
    console.log("✅ SmartPatternService 초기화 완료");
  }

  async matchPatterns(
    context: SmartPatternContext
  ): Promise<PatternMatchResult> {
    if (!this.isInitialized) {
      throw new Error("SmartPatternService must be initialized with stores");
    }

    console.log("🎯 패턴 매칭 시작:", context);
    await this.ensureDataLoaded();

    const analysis = this.analyzeUserContext(context);
    console.log("🔍 분석 결과:", analysis);

    // ✅ 개선된 패턴 매칭
    const matchingResult = await this.performAdvancedMatching(analysis);

    const conversationPatterns = await this.generateConversationPatterns(
      matchingResult.patterns,
      analysis
    );
    const dailyPatterns = await this.generateDailyPatterns(
      matchingResult.patterns,
      analysis
    );

    const confidence = this.calculateAdvancedConfidence(
      analysis,
      conversationPatterns,
      dailyPatterns
    );
    const matchQuality = this.determineMatchQuality(confidence, matchingResult);

    // ✅ 부족한 데이터 및 추천 분석
    const missingData = this.analyzeMissingData(analysis, matchingResult);
    const recommendations = this.generateRecommendations(analysis, missingData);
    const warnings = this.generateWarnings(matchQuality, missingData);

    return {
      conversationPatterns,
      dailyPatterns,
      confidence,
      usedWords: analysis.extractedWords,
      suggestions: analysis.suggestions,
      matchQuality,
      missingData,
      recommendations,
      warnings,
    };
  }

  // ✅ 기존 메서드: 사용자 컨텍스트 분석
  private analyzeUserContext(context: SmartPatternContext) {
    const words = this.lexiconStore?.words || [];
    const userLevel =
      context.level || this.learningStore?.userProgress?.level || "beginner";

    let extractedInfo = {
      intent: "daily_conversation",
      places: [] as Array<{ ko: string; en: string }>,
      items: [] as Array<{ ko: string; en: string }>,
      persons: [] as Array<{ ko: string; en: string }>,
      times: [] as Array<{ ko: string; en: string }>,
      extractedWords: [] as string[],
      suggestions: [] as string[],
      userLevel,
    };

    if (context.userInput || context.intent?.korean) {
      const input = context.userInput || context.intent?.korean || "";
      extractedInfo = this.extractInformationFromInput(input, words);
      extractedInfo.userLevel = userLevel;
    }

    if (context.selectedTags?.length) {
      extractedInfo.intent = this.mapTagsToIntent(context.selectedTags);
    }

    return extractedInfo;
  }

  // ✅ 기존 메서드: 입력에서 정보 추출
  private extractInformationFromInput(input: string, words: any[]) {
    const places = this.extractPlaces(input, words);
    const items = this.extractByPOS(input, words, "ITEM");
    const persons = this.extractByPOS(input, words, "PERSON");
    const times = this.extractByPOS(input, words, "TIME");
    const intent = this.analyzeIntent(input);

    const extractedWords = [
      ...places.map((p) => p.en),
      ...items.map((i) => i.en),
      ...persons.map((p) => p.en),
      ...times.map((t) => t.en),
    ];

    return {
      intent,
      places,
      items,
      persons,
      times,
      extractedWords,
      suggestions: this.generateSuggestions(input, intent),
      userLevel: "beginner" as const,
    };
  }

  // ✅ 기존 메서드: 의도 분석
  private analyzeIntent(input: string): string {
    const normalized = input.toLowerCase().replace(/[^\w\s가-힣]/g, "");

    // 인사 관련 (최우선)
    if (/안녕|반가워|만나서|처음|소개|hello|hi|nice/.test(normalized)) {
      return "greeting_conversation";
    }

    // 일상 대화
    if (/좋아|싫어|가지고|있어|생각|느낌|기분|어때/.test(normalized)) {
      return "daily_conversation";
    }

    // 위치 문의
    if (/어디|위치|있나요|있어요/.test(normalized)) {
      if (/버스|정류장/.test(normalized)) return "transportation_inquiry";
      return "location_inquiry";
    }

    // 방향/길찾기 문의
    if (/어떻게|가나요|방법|가는|길/.test(normalized)) {
      if (/버스/.test(normalized)) return "transportation_inquiry";
      return "direction_request";
    }

    // 교통수단 문의
    if (/버스|지하철|전철|택시/.test(normalized) && !/어디/.test(normalized)) {
      return "transportation_inquiry";
    }

    // 주문/요청
    if (/주문|주세요|먹고|마시고|사고|할래/.test(normalized)) {
      return "order_request";
    }

    return "daily_conversation";
  }

  // ✅ 기존 메서드: 장소 추출
  private extractPlaces(input: string, words: any[]) {
    const places = [];

    // 기존 단어 매칭
    const placeWords = words.filter(
      (w) => w.pos === "PLACE" && input.includes(w.ko)
    );
    places.push(...placeWords.map((w) => ({ ko: w.ko, en: w.en })));

    // 복합 장소 패턴 인식
    const complexPatterns = [
      {
        regex: /(\w+역)으?로?\s*가는\s*(버스\s*정류장|지하철|버스|정류장)/g,
        handler: (match: RegExpMatchArray) => {
          const station = match[1].replace("역", "");
          const destination = match[2];
          if (destination.includes("버스") || destination.includes("정류장")) {
            return {
              ko: `${match[1]}으로 가는 버스정류장`,
              en: `bus stop to ${station} Station`,
            };
          }
          return {
            ko: match[0],
            en: `${station} Station`,
          };
        },
      },
      {
        regex: /(\w+)\s*(버스\s*정류장|지하철역|역)/g,
        handler: (match: RegExpMatchArray) => {
          const location = match[1];
          const type = match[2];
          if (type.includes("버스") || type.includes("정류장")) {
            return { ko: `${location} 버스정류장`, en: `${location} bus stop` };
          }
          return { ko: `${location}역`, en: `${location} Station` };
        },
      },
    ];

    complexPatterns.forEach(({ regex, handler }) => {
      let match;
      while ((match = regex.exec(input)) !== null) {
        const result = handler(match);
        if (result) {
          const exists = places.some(
            (p) => p.ko === result.ko || p.en === result.en
          );
          if (!exists) {
            places.push(result);
          }
        }
      }
    });

    // 기본 장소 키워드
    const basicPlaces = [
      { pattern: /버스\s*정류장/g, ko: "버스정류장", en: "bus stop" },
      { pattern: /지하철역/g, ko: "지하철역", en: "subway station" },
      { pattern: /병원/g, ko: "병원", en: "hospital" },
      { pattern: /학교/g, ko: "학교", en: "school" },
      { pattern: /카페/g, ko: "카페", en: "cafe" },
    ];

    basicPlaces.forEach(({ pattern, ko, en }) => {
      if (pattern.test(input)) {
        const exists = places.some((p) => p.ko === ko);
        if (!exists) {
          places.push({ ko, en });
        }
      }
    });

    console.log("🗺️ 추출된 장소들:", places);
    return places;
  }

  // ✅ 기존 메서드: POS별 추출
  private extractByPOS(input: string, words: any[], pos: POS) {
    return words
      .filter((w) => w.pos === pos && input.includes(w.ko))
      .map((w) => ({ ko: w.ko, en: w.en }));
  }

  // ✅ 기존 메서드: 태그를 의도로 매핑
  private mapTagsToIntent(tags: LangTag[]): string {
    if (tags.includes("directions")) return "direction_request";
    if (tags.includes("daily")) return "daily_conversation";
    if (tags.includes("school")) return "school_conversation";
    if (tags.includes("business")) return "business_conversation";
    return "daily_conversation";
  }

  // ✅ 기존 메서드: 제안 생성
  private generateSuggestions(input: string, intent: string): string[] {
    const suggestions = [];
    if (intent === "greeting_conversation") {
      suggestions.push("How are you doing today?");
      suggestions.push("Nice to meet you!");
    } else if (intent === "daily_conversation") {
      suggestions.push("I really like coffee.");
      suggestions.push("I have a book with me.");
    }
    return suggestions;
  }

  // ✅ 새로운 메서드: 개선된 매칭 로직
  private async performAdvancedMatching(analysis: any) {
    const allPatterns = await this.getAllAvailablePatterns();

    // 1단계: Intent 기반 필터링
    const intentFiltered = allPatterns.filter((pattern) =>
      this.isPatternRelevantForIntent(pattern, analysis.intent)
    );

    // 2단계: 컨텍스트 기반 스코어링
    const scoredPatterns = intentFiltered
      .map((pattern) => ({
        pattern,
        score: this.calculateAdvancedPatternScore(pattern, analysis),
        relevanceReasons: this.getRelevanceReasons(pattern, analysis),
      }))
      .sort((a, b) => b.score - a.score);

    // 3단계: 품질 검사
    const qualityChecked = scoredPatterns.map((item) => ({
      ...item,
      quality: this.assessPatternQuality(item.pattern, analysis),
      dataAvailability: this.checkDataAvailability(item.pattern, analysis),
    }));

    return {
      patterns: qualityChecked,
      totalAvailable: allPatterns.length,
      intentMatched: intentFiltered.length,
      highQuality: qualityChecked.filter((p) => p.quality >= 0.7).length,
    };
  }

  // ✅ 새로운 메서드: 모든 사용 가능한 패턴 수집
  private async getAllAvailablePatterns(): Promise<PatternSchema[]> {
    let allPatterns: PatternSchema[] = [...GREETING_PATTERNS];

    // 기존 PATTERN_SCHEMAS 로드
    try {
      const { PATTERN_SCHEMAS } = await import(
        "@/features/learn/services/patternSchemas"
      );
      if (Array.isArray(PATTERN_SCHEMAS)) {
        allPatterns = [...allPatterns, ...PATTERN_SCHEMAS];
        console.log("✅ PATTERN_SCHEMAS 로드:", PATTERN_SCHEMAS.length);
      }
    } catch (error) {
      console.warn("⚠️ patternSchemas.ts 로드 실패:", error);
    }

    // dataPackLoader에서 추가 패턴 로드
    try {
      const packPatterns = dataPackLoader.getAllPatterns();
      if (packPatterns && packPatterns.length > 0) {
        allPatterns = [...allPatterns, ...packPatterns];
        console.log("✅ 데이터팩 패턴 추가:", packPatterns.length);
      }
    } catch (error) {
      console.warn("⚠️ 데이터팩 패턴 로드 실패:", error);
    }

    console.log("📊 총 사용 가능한 패턴:", allPatterns.length);
    return allPatterns;
  }

  // ✅ 새로운 메서드: 향상된 패턴 관련성 판단
  private isPatternRelevantForIntent(
    pattern: PatternSchema,
    intent: string
  ): boolean {
    const intentPatternMap = {
      greeting_conversation: {
        keywords: ["GREETING", "HELLO", "NICE", "MEET"],
        categories: ["daily"],
        priority: "high",
      },
      daily_conversation: {
        keywords: ["DAILY", "HAVE", "LIKE", "WANT", "NEED"],
        categories: ["daily"],
        priority: "high",
      },
      location_inquiry: {
        keywords: ["WH-BE-PLACE", "WHERE", "LOCATION"],
        categories: ["directions"],
        priority: "high",
      },
      transportation_inquiry: {
        keywords: ["BUS-TO-PLACE", "TRANSPORT", "BUS", "SUBWAY"],
        categories: ["directions", "daily"],
        priority: "high",
      },
      direction_request: {
        keywords: ["HOW-GET-PLACE", "HOW", "WAY", "DIRECTION"],
        categories: ["directions"],
        priority: "high",
      },
      school_conversation: {
        keywords: ["SCHOOL", "STUDENT", "CLASS", "STUDY"],
        categories: ["school"],
        priority: "medium",
      },
      order_request: {
        keywords: ["ORDER", "WANT", "NEED", "BUY"],
        categories: ["daily", "business"],
        priority: "medium",
      },
    };

    const intentInfo = intentPatternMap[intent];
    if (!intentInfo) return false;

    // 키워드 매칭
    const keywordMatch = intentInfo.keywords.some(
      (keyword) =>
        pattern.id?.includes(keyword) ||
        pattern.surface?.toUpperCase().includes(keyword)
    );

    // 카테고리 매칭
    const categoryMatch = intentInfo.categories.includes(
      pattern.category as LangTag
    );

    return keywordMatch || categoryMatch;
  }

  // ✅ 새로운 메서드: 향상된 패턴 스코어 계산
  private calculateAdvancedPatternScore(
    pattern: PatternSchema,
    analysis: any
  ): number {
    let score = 0;

    // 1. Intent 매칭 점수 (최대 40점)
    score += this.calculateIntentScore(pattern, analysis.intent);

    // 2. 슬롯 데이터 가용성 점수 (최대 30점)
    score += this.calculateSlotAvailabilityScore(pattern, analysis);

    // 3. 사용자 레벨 적합성 점수 (최대 20점)
    score += this.calculateLevelScore(pattern, analysis.userLevel);

    // 4. 카테고리 매칭 점수 (최대 10점)
    score += this.calculateCategoryScore(pattern, analysis);

    return score;
  }

  private calculateIntentScore(pattern: PatternSchema, intent: string): number {
    const intentScoreMap = {
      greeting_conversation: {
        GREETING: 40,
        HELLO: 35,
        NICE: 30,
        MEET: 30,
      },
      daily_conversation: {
        DAILY: 35,
        HAVE: 30,
        LIKE: 30,
        WANT: 25,
        NEED: 25,
      },
      location_inquiry: {
        "WH-BE-PLACE": 40,
        WHERE: 35,
        LOCATION: 30,
      },
      transportation_inquiry: {
        "BUS-TO-PLACE": 40,
        BUS: 35,
        TRANSPORT: 30,
        SUBWAY: 30,
      },
      direction_request: {
        "HOW-GET-PLACE": 40,
        HOW: 35,
        DIRECTION: 30,
        WAY: 25,
      },
    };

    const scoreMap = intentScoreMap[intent] || {};

    for (const [keyword, points] of Object.entries(scoreMap)) {
      if (
        pattern.id?.includes(keyword) ||
        pattern.surface?.toUpperCase().includes(keyword)
      ) {
        return points;
      }
    }

    return 0;
  }

  private calculateSlotAvailabilityScore(
    pattern: PatternSchema,
    analysis: any
  ): number {
    if (!pattern.slots || pattern.slots.length === 0) return 30; // 슬롯이 없으면 만점

    let totalSlots = pattern.slots.length;
    let availableSlots = 0;

    pattern.slots.forEach((slot) => {
      switch (slot.name) {
        case "PLACE":
          if (analysis.places.length > 0) availableSlots++;
          break;
        case "ITEM":
          if (analysis.items.length > 0) availableSlots++;
          break;
        case "PERSON":
          if (analysis.persons.length > 0) availableSlots++;
          break;
        case "TIME":
          if (analysis.times.length > 0) availableSlots++;
          break;
        default:
          // 기본값이 있는 슬롯은 항상 사용 가능
          if (DEFAULT_SLOT_VALUES[slot.name]) availableSlots++;
      }
    });

    return Math.floor((availableSlots / totalSlots) * 30);
  }

  private calculateLevelScore(
    pattern: PatternSchema,
    userLevel: string
  ): number {
    if (pattern.level === userLevel) return 20;
    if (pattern.level === "beginner" && userLevel === "intermediate") return 15;
    if (pattern.level === "intermediate" && userLevel === "beginner") return 10;
    return 5;
  }

  private calculateCategoryScore(
    pattern: PatternSchema,
    analysis: any
  ): number {
    // 분석된 의도와 패턴 카테고리 매칭
    const categoryIntentMap = {
      daily: ["daily_conversation", "greeting_conversation"],
      directions: [
        "location_inquiry",
        "transportation_inquiry",
        "direction_request",
      ],
      school: ["school_conversation"],
      business: ["order_request"],
    };

    const matchingIntents =
      categoryIntentMap[pattern.category as LangTag] || [];
    return matchingIntents.includes(analysis.intent) ? 10 : 0;
  }

  // ✅ 새로운 메서드: 관련성 이유 (디버깅용)
  private getRelevanceReasons(pattern: PatternSchema, analysis: any): string[] {
    const reasons = [];
    if (
      pattern.id?.includes("GREETING") &&
      analysis.intent === "greeting_conversation"
    ) {
      reasons.push("인사 패턴 매칭");
    }
    if (pattern.category === analysis.intent.split("_")[0]) {
      reasons.push("카테고리 매칭");
    }
    return reasons;
  }

  // ✅ 기존 메서드 개선: 대화 패턴 생성
  private async generateConversationPatterns(
    patterns: any[],
    analysis: any
  ): Promise<ConversationPattern[]> {
    return patterns.slice(0, 3).map((patternItem) => {
      const pattern = patternItem.pattern || patternItem;
      const filledPattern = this.fillPatternSlots(pattern, analysis);
      return this.createConversationPattern(filledPattern, analysis);
    });
  }

  // ✅ 기존 메서드 개선: 일일 패턴 생성
  private async generateDailyPatterns(
    patterns: any[],
    analysis: any
  ): Promise<DailyPattern[]> {
    return patterns.slice(0, 5).map((patternItem, index) => {
      const pattern = patternItem.pattern || patternItem;
      const filledPattern = this.fillPatternSlots(pattern, analysis);
      return {
        id: `smart_${Date.now()}_${index}`,
        text: filledPattern.english,
        korean: filledPattern.korean,
        difficulty: analysis.userLevel,
        category: pattern.category || "daily",
        estimatedTime: 5,
        completed: false,
      };
    });
  }

  // ✅ 기존 메서드: 관련 패턴 스키마 가져오기 (하위 호환성)
  private async getRelevantPatternSchemas(analysis: any) {
    const allPatterns = await this.getAllAvailablePatterns();

    return allPatterns
      .filter((pattern) => this.isPatternRelevant(pattern, analysis))
      .sort(
        (a, b) =>
          this.calculatePatternScore(b, analysis) -
          this.calculatePatternScore(a, analysis)
      );
  }

  // ✅ 기존 메서드: 패턴 관련성 판단 (하위 호환성)
  private isPatternRelevant(pattern: PatternSchema, analysis: any): boolean {
    const intentPatternMap = {
      greeting_conversation: ["GREETING", "HELLO", "NICE", "MEET"],
      daily_conversation: ["DAILY", "HAVE", "LIKE", "DRANK", "ATE", "MADE"],
      location_inquiry: ["WH-BE-PLACE", "WHERE"],
      transportation_inquiry: ["BUS-TO-PLACE", "WH-BE-PLACE"],
      direction_request: ["HOW-GET-PLACE", "HOW"],
      school_conversation: ["NEED-ITEM-TIME"],
      order_request: ["ORDER", "WANT", "NEED"],
    };

    const relevantKeywords = intentPatternMap[analysis.intent] || [];
    const isRelevantByIntent = relevantKeywords.some(
      (keyword) =>
        pattern.id?.includes(keyword) ||
        pattern.surface?.includes(keyword.toLowerCase())
    );

    if (isRelevantByIntent) return true;

    // 카테고리별 기본 매칭
    if (
      analysis.intent.includes("conversation") &&
      pattern.category === "daily"
    )
      return true;
    if (
      analysis.intent.includes("location") &&
      pattern.category === "directions"
    )
      return true;

    return false;
  }

  // ✅ 기존 메서드: 패턴 점수 계산 (하위 호환성)
  private calculatePatternScore(pattern: PatternSchema, analysis: any): number {
    let score = 1;

    const intentScores = {
      greeting_conversation: pattern.id?.includes("GREETING") ? 25 : 0,
      daily_conversation:
        pattern.id?.includes("DAILY") ||
        pattern.id?.includes("HAVE") ||
        pattern.id?.includes("DRANK") ||
        pattern.id?.includes("ATE") ||
        pattern.id?.includes("MADE")
          ? 20
          : 0,
      location_inquiry: pattern.surface?.includes("Where") ? 15 : 0,
      transportation_inquiry: pattern.id?.includes("BUS") ? 18 : 0,
      direction_request: pattern.surface?.includes("How") ? 15 : 0,
      school_conversation: pattern.category === "school" ? 18 : 0,
      order_request: pattern.surface?.includes("order") ? 12 : 0,
    };

    score += intentScores[analysis.intent] || 0;

    // 슬롯 매칭은 낮은 점수
    if (pattern.surface?.includes("[PLACE]") && analysis.places.length > 0)
      score += 3;
    if (pattern.surface?.includes("[ITEM]") && analysis.items.length > 0)
      score += 3;

    console.log(
      `📊 패턴 점수 - ${pattern.id}: ${score}점 (의도: ${analysis.intent})`
    );
    return score;
  }

  // ✅ 기존 메서드: 패턴 슬롯 채우기
  private fillPatternSlots(pattern: PatternSchema, analysis: any) {
    let korean = pattern.koSurface || pattern.surface || "";
    let english = pattern.surface || "";

    const slotReplacements = this.getSlotReplacements(pattern, analysis);

    Object.entries(slotReplacements).forEach(([slotName, value]) => {
      korean = korean.replace(new RegExp(`\\[${slotName}\\]`, "g"), value.ko);
      english = english.replace(new RegExp(`\\[${slotName}\\]`, "g"), value.en);
    });

    return {
      ...pattern,
      korean,
      english,
      slotReplacements,
    };
  }

  // ✅ 기존 메서드: 슬롯 대체값 가져오기
  private getSlotReplacements(pattern: PatternSchema, analysis: any) {
    const replacements: Record<string, { ko: string; en: string }> = {};

    pattern.slots?.forEach((slot) => {
      const slotName = slot.name;
      let replacement;

      // 1. 추출된 값이 있으면 우선 사용
      switch (slotName) {
        case "PLACE":
          replacement = analysis.places[0] || this.getRandomSlotValue("PLACE");
          break;
        case "ITEM":
          replacement = analysis.items[0] || this.getRandomSlotValue("ITEM");
          break;
        case "PERSON":
          replacement =
            analysis.persons[0] || this.getRandomSlotValue("PERSON");
          break;
        case "TIME":
          replacement = analysis.times[0] || this.getRandomSlotValue("TIME");
          break;
        case "BEVERAGE":
          replacement =
            analysis.items.find((item) => this.isBeverage(item)) ||
            this.getRandomSlotValue("BEVERAGE");
          break;
        case "FOOD":
          replacement =
            analysis.items.find((item) => this.isFood(item)) ||
            this.getRandomSlotValue("FOOD");
          break;
        case "COOKABLE":
          replacement =
            analysis.items.find((item) => this.isCookable(item)) ||
            this.getRandomSlotValue("COOKABLE");
          break;
        case "VERB":
          replacement = this.getRandomSlotValue("VERB");
          break;
        case "OBJECT":
          replacement = analysis.items[0] || this.getRandomSlotValue("OBJECT");
          break;
        default:
          replacement = this.getRandomSlotValue(slotName);
      }

      if (replacement) {
        replacements[slotName] = replacement;
      }
    });

    return replacements;
  }

  // ✅ 기존 메서드: 랜덤 슬롯 값 가져오기
  private getRandomSlotValue(
    slotName: string
  ): { ko: string; en: string } | null {
    const values = DEFAULT_SLOT_VALUES[slotName];
    if (!values || values.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * values.length);
    return values[randomIndex];
  }

  // ✅ 기존 메서드들: 타입 체크
  private isBeverage(item: any): boolean {
    const beverages = ["coffee", "tea", "water", "juice", "milk"];
    return beverages.includes(item.en.toLowerCase());
  }

  private isFood(item: any): boolean {
    const foods = ["rice", "bread", "apple", "salad", "sandwich"];
    return foods.includes(item.en.toLowerCase());
  }

  private isCookable(item: any): boolean {
    const cookables = ["pasta", "soup", "cake", "pizza", "stew"];
    return cookables.includes(item.en.toLowerCase());
  }

  // ✅ 기존 메서드: 대화 패턴 생성
  private createConversationPattern(
    pattern: any,
    analysis: any
  ): ConversationPattern {
    const words = pattern.english
      .split(" ")
      .filter((w: string) => w.length > 1);

    const cards: SentenceCard[] = words.map((word: string, index: number) => ({
      id: `card_${index}`,
      text: word,
      korean: this.getKoreanTranslation(word),
      pos: this.identifyPOS(word),
      isPlaced: false,
      isCorrect: false,
      feedbackColor: "default" as const,
    }));

    return {
      id: pattern.id || `pattern_${Date.now()}`,
      scenario: this.generateScenario(pattern, analysis),
      userSide: {
        korean: pattern.korean,
        english: pattern.english,
        structure: this.generateStructure(pattern.english),
        cards,
      },
      responseSide: {
        korean: "네, 알겠습니다.",
        english: "Yes, I understand.",
        variations: ["Of course!", "Sure thing!", "Got it!"],
      },
    };
  }

  // ✅ 기존 메서드: 시나리오 생성
  private generateScenario(pattern: any, analysis: any): string {
    if (analysis.places.length > 0) {
      return `${pattern.category || "일상"} 상황 (${analysis.places[0].ko})`;
    }
    return pattern.category || "일반 대화";
  }

  // ✅ 기존 메서드: 구조 생성
  private generateStructure(english: string): string {
    return english
      .replace(/\b(where|how|what|when)\b/gi, "WH-WORD")
      .replace(/\bis\b/gi, "BE")
      .replace(/\bthe\b/gi, "DET");
  }

  // ✅ 기존 메서드: 한국어 번역
  private getKoreanTranslation(word: string): string {
    const translations: Record<string, string> = {
      where: "어디",
      is: "이다",
      how: "어떻게",
      do: "하다",
      get: "가다",
      to: "~로",
      i: "나",
      the: "그",
      bus: "버스",
      stop: "정류장",
      station: "역",
      hello: "안녕",
      nice: "좋은",
      meet: "만나다",
      you: "당신",
      have: "가지다",
      like: "좋아하다",
    };

    return translations[word.toLowerCase()] || word;
  }

  // ✅ 기존 메서드: POS 식별
  private identifyPOS(word: string): SentenceCard["pos"] {
    const questionWords = ["where", "how", "what", "when"];
    const verbs = [
      "is",
      "are",
      "do",
      "can",
      "get",
      "go",
      "goes",
      "have",
      "like",
    ];
    const modals = ["can", "could", "would", "should"];

    if (questionWords.includes(word.toLowerCase())) return "SUBJECT";
    if (modals.includes(word.toLowerCase())) return "MODAL";
    if (verbs.includes(word.toLowerCase())) return "VERB";
    if (["to", "at", "in", "on"].includes(word.toLowerCase())) return "PLACE";

    return "OBJECT";
  }

  // ✅ 새로운 메서드: 부족한 데이터 분석
  private analyzeMissingData(
    analysis: any,
    matchingResult: any
  ): MissingDataInfo {
    const missingPatterns: string[] = [];
    const missingWords: { pos: POS; examples: string[] }[] = [];
    const lowConfidenceSlots: string[] = [];
    const fallbacksUsed: string[] = [];

    // 1. Intent에 맞는 패턴이 부족한지 확인
    if (matchingResult.intentMatched < 3) {
      missingPatterns.push(`${analysis.intent}에 맞는 패턴이 부족합니다.`);
    }

    // 2. 추출된 정보에 대응하는 단어가 부족한지 확인
    if (analysis.places.length === 0 && analysis.intent.includes("location")) {
      missingWords.push({
        pos: "PLACE",
        examples: ["병원", "학교", "카페", "도서관"],
      });
    }

    if (analysis.items.length === 0 && analysis.intent.includes("daily")) {
      missingWords.push({
        pos: "ITEM",
        examples: ["커피", "책", "가방", "음식"],
      });
    }

    // 3. 낮은 신뢰도 슬롯 확인
    matchingResult.patterns.forEach((item: any) => {
      if (item.dataAvailability < 0.5) {
        item.pattern.slots?.forEach((slot: SlotSpec) => {
          if (!lowConfidenceSlots.includes(slot.name)) {
            lowConfidenceSlots.push(slot.name);
          }
        });
      }
    });

    return {
      missingPatterns,
      missingWords,
      lowConfidenceSlots,
      fallbacksUsed,
    };
  }

  // ✅ 새로운 메서드: 추천 정보 생성
  private generateRecommendations(
    analysis: any,
    missingData: MissingDataInfo
  ): RecommendationInfo {
    const suggestedPatterns: string[] = [];
    const suggestedWords: { ko: string; en: string; pos: POS }[] = [];
    const learningTips: string[] = [];
    const nextSteps: string[] = [];

    // 패턴 추천
    if (missingData.missingPatterns.length > 0) {
      suggestedPatterns.push(
        `"${analysis.intent}" 의도에 맞는 더 많은 패턴을 추가해보세요.`
      );
    }

    // 단어 추천
    missingData.missingWords.forEach((missing) => {
      missing.examples.forEach((example) => {
        suggestedWords.push({
          ko: example,
          en: this.getEnglishTranslation(example) || example,
          pos: missing.pos,
        });
      });
    });

    // 학습 팁
    if (analysis.extractedWords.length === 0) {
      learningTips.push(
        "더 구체적인 단어(장소, 사물, 사람)를 포함해서 입력해보세요."
      );
    }

    if (analysis.intent === "daily_conversation") {
      learningTips.push(
        "일상 대화는 'I have...', 'I like...' 같은 기본 패턴부터 시작해보세요."
      );
    }

    // 다음 단계 제안
    nextSteps.push("내 단어장에서 관련 단어들을 추가해보세요.");
    nextSteps.push("비슷한 상황의 패턴들을 더 연습해보세요.");

    return {
      suggestedPatterns,
      suggestedWords,
      learningTips,
      nextSteps,
    };
  }

  // ✅ 새로운 메서드: 경고 메시지 생성
  private generateWarnings(
    matchQuality: string,
    missingData: MissingDataInfo
  ): string[] {
    const warnings: string[] = [];

    if (matchQuality === "poor") {
      warnings.push(
        "⚠️ 입력하신 내용에 적합한 패턴을 찾기 어려워 임의의 패턴을 제공했습니다."
      );
    }

    if (matchQuality === "fair") {
      warnings.push("💡 더 정확한 패턴을 위해 구체적인 단어를 추가해보세요.");
    }

    if (missingData.lowConfidenceSlots.length > 0) {
      warnings.push(
        `🔄 다음 항목들은 기본값으로 채웠습니다: ${missingData.lowConfidenceSlots.join(
          ", "
        )}`
      );
    }

    if (missingData.missingWords.length > 0) {
      warnings.push(
        "📚 관련 단어가 부족합니다. 단어장에 추가하시면 더 정확한 패턴을 제공할 수 있습니다."
      );
    }

    return warnings;
  }

  // ✅ 새로운 메서드: 매칭 품질 판단
  private determineMatchQuality(
    confidence: number,
    matchingResult: any
  ): "excellent" | "good" | "fair" | "poor" {
    if (
      confidence >= this.QUALITY_THRESHOLDS.excellent &&
      matchingResult.highQuality >= 3
    ) {
      return "excellent";
    }
    if (
      confidence >= this.QUALITY_THRESHOLDS.good &&
      matchingResult.highQuality >= 1
    ) {
      return "good";
    }
    if (confidence >= this.QUALITY_THRESHOLDS.fair) {
      return "fair";
    }
    return "poor";
  }

  // ✅ 새로운 메서드: 패턴 품질 평가
  private assessPatternQuality(pattern: PatternSchema, analysis: any): number {
    let quality = 0.5; // 기본 품질

    // Intent 매칭 품질
    if (this.isPatternRelevantForIntent(pattern, analysis.intent)) {
      quality += 0.3;
    }

    // 슬롯 데이터 가용성
    if (pattern.slots) {
      const availableSlots = pattern.slots.filter((slot) =>
        this.hasDataForSlot(slot.name, analysis)
      ).length;
      quality += (availableSlots / pattern.slots.length) * 0.2;
    } else {
      quality += 0.2; // 슬롯이 없으면 완벽
    }

    return Math.min(quality, 1.0);
  }

  // ✅ 새로운 메서드: 슬롯 데이터 가용성 확인
  private checkDataAvailability(pattern: PatternSchema, analysis: any): number {
    if (!pattern.slots || pattern.slots.length === 0) return 1.0;

    const availableCount = pattern.slots.filter((slot) =>
      this.hasDataForSlot(slot.name, analysis)
    ).length;

    return availableCount / pattern.slots.length;
  }

  private hasDataForSlot(slotName: string, analysis: any): boolean {
    switch (slotName) {
      case "PLACE":
        return analysis.places.length > 0;
      case "ITEM":
        return analysis.items.length > 0;
      case "PERSON":
        return analysis.persons.length > 0;
      case "TIME":
        return analysis.times.length > 0;
      default:
        return !!DEFAULT_SLOT_VALUES[slotName];
    }
  }

  // ✅ 새로운 메서드: 영어 번역 헬퍼
  private getEnglishTranslation(korean: string): string | null {
    const translations: Record<string, string> = {
      병원: "hospital",
      학교: "school",
      카페: "cafe",
      도서관: "library",
      공원: "park",
      커피: "coffee",
      책: "book",
      가방: "bag",
      음식: "food",
    };

    return translations[korean] || null;
  }

  // ✅ 기존 메서드: 신뢰도 계산 (하위 호환성)
  private calculateConfidence(
    analysis: any,
    convPatterns: any[],
    dailyPatterns: any[]
  ): number {
    let confidence = 0.5;
    if (analysis.extractedWords.length > 0) confidence += 0.2;
    if (convPatterns.length > 0) confidence += 0.2;
    if (analysis.intent !== "general") confidence += 0.1;
    return Math.min(confidence, 1.0);
  }

  // ✅ 새로운 메서드: 향상된 신뢰도 계산
  private calculateAdvancedConfidence(
    analysis: any,
    convPatterns: any[],
    dailyPatterns: any[]
  ): number {
    let confidence = 0.3; // 기본값

    // 추출된 정보 품질
    if (analysis.extractedWords.length > 0) confidence += 0.2;
    if (analysis.places.length > 0) confidence += 0.1;
    if (analysis.items.length > 0) confidence += 0.1;

    // 패턴 매칭 품질
    if (convPatterns.length >= 2) confidence += 0.15;
    if (dailyPatterns.length >= 3) confidence += 0.15;

    return Math.min(confidence, 1.0);
  }

  // ✅ 기존 메서드: 데이터 로드 보장
  private async ensureDataLoaded() {
    try {
      await dataPackLoader.loadCorePacks();
      console.log("✅ 데이터팩 로드 완료");
    } catch (error) {
      console.warn("⚠️ 데이터팩 로드 실패, 기본 데이터만 사용:", error);
    }

    if (this.lexiconStore?.ensureBasicWordsAvailable) {
      this.lexiconStore.ensureBasicWordsAvailable();
    }
  }
}

export const smartPatternService = new SmartPatternService();
