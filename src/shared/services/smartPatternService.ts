// src/shared/services/smartPatternService.ts
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

export interface PatternMatchResult {
  conversationPatterns: ConversationPattern[];
  dailyPatterns: DailyPattern[];
  confidence: number;
  usedWords: string[];
  suggestions: string[];
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

    const conversationPatterns = await this.generateConversationPatterns(
      analysis
    );
    const dailyPatterns = await this.generateDailyPatterns(analysis);
    const confidence = this.calculateConfidence(
      analysis,
      conversationPatterns,
      dailyPatterns
    );

    return {
      conversationPatterns,
      dailyPatterns,
      confidence,
      usedWords: analysis.extractedWords,
      suggestions: analysis.suggestions,
    };
  }

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

  private extractByPOS(input: string, words: any[], pos: POS) {
    return words
      .filter((w) => w.pos === pos && input.includes(w.ko))
      .map((w) => ({ ko: w.ko, en: w.en }));
  }

  private mapTagsToIntent(tags: LangTag[]): string {
    if (tags.includes("directions")) return "direction_request";
    if (tags.includes("daily")) return "daily_conversation";
    if (tags.includes("school")) return "school_conversation";
    if (tags.includes("business")) return "business_conversation";
    return "daily_conversation";
  }

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

  private async generateConversationPatterns(
    analysis: any
  ): Promise<ConversationPattern[]> {
    const patterns = await this.getRelevantPatternSchemas(analysis);

    return patterns.slice(0, 3).map((pattern) => {
      const filledPattern = this.fillPatternSlots(pattern, analysis);
      return this.createConversationPattern(filledPattern, analysis);
    });
  }

  private async generateDailyPatterns(analysis: any): Promise<DailyPattern[]> {
    const patterns = await this.getRelevantPatternSchemas(analysis);

    return patterns.slice(0, 5).map((pattern, index) => {
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

  private async getRelevantPatternSchemas(analysis: any) {
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

    return allPatterns
      .filter((pattern) => this.isPatternRelevant(pattern, analysis))
      .sort(
        (a, b) =>
          this.calculatePatternScore(b, analysis) -
          this.calculatePatternScore(a, analysis)
      );
  }

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

  private getRandomSlotValue(
    slotName: string
  ): { ko: string; en: string } | null {
    const values = DEFAULT_SLOT_VALUES[slotName];
    if (!values || values.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * values.length);
    return values[randomIndex];
  }

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

  private generateScenario(pattern: any, analysis: any): string {
    if (analysis.places.length > 0) {
      return `${pattern.category || "일상"} 상황 (${analysis.places[0].ko})`;
    }
    return pattern.category || "일반 대화";
  }

  private generateStructure(english: string): string {
    return english
      .replace(/\b(where|how|what|when)\b/gi, "WH-WORD")
      .replace(/\bis\b/gi, "BE")
      .replace(/\bthe\b/gi, "DET");
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
