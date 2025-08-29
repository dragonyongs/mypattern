// src/features/build/services/simplePatternMatcher.ts (완전한 개선 버전)

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
    const input = intent.korean.toLowerCase();

    console.log("🎯 입력 분석 시작:", input);

    // 1단계: 의미적 분석
    const analyzedInput = this.analyzeUserInput(input);
    console.log("🔍 의미적 분석 결과:", analyzedInput);

    // 2단계: 동적 패턴 생성
    const dynamicPatterns = this.generateDynamicPatterns(analyzedInput);
    console.log("🧩 생성된 동적 패턴:", dynamicPatterns.length + "개");

    // 3단계: 기존 정적 패턴과 합치기
    const allPatterns = [...this.basePatterns, ...dynamicPatterns];
    console.log("📚 전체 사용 가능한 패턴:", allPatterns.length + "개");

    // 4단계: 클러스터 매칭 (기존 로직)
    const clusterMatches = this.findClusterMatches(input);
    console.log("🎪 클러스터 매칭:", clusterMatches);

    // 5단계: 의미적 매칭 점수 계산
    const patternScores: Array<{
      pattern: PatternTemplate;
      totalScore: number;
      matchedClusters: string[];
      semanticMatches: string[];
    }> = [];

    for (const pattern of allPatterns) {
      const clusterScore = this.calculateClusterScore(pattern, clusterMatches);
      const semanticScore = this.calculateSemanticScore(pattern, analyzedInput);
      const keywordScore = this.calculateKeywordScore(pattern, input);

      // 의미적 점수를 가장 높게 가중치 부여
      const totalScore =
        semanticScore * 2.0 + clusterScore.score + keywordScore * 0.3;

      if (totalScore > 0) {
        patternScores.push({
          pattern,
          totalScore,
          matchedClusters: clusterScore.clusters,
          semanticMatches: this.getSemanticMatches(pattern, analyzedInput),
        });
      }
    }

    // 점수순 정렬 후 상위 3개 반환
    patternScores.sort((a, b) => b.totalScore - a.totalScore);
    console.log(
      "📊 최종 패턴 점수:",
      patternScores.slice(0, 3).map((p) => ({
        id: p.pattern.id,
        score: p.totalScore,
        semantic: p.semanticMatches,
        clusters: p.matchedClusters,
      }))
    );

    return patternScores
      .slice(0, 3)
      .map(({ pattern, matchedClusters, semanticMatches }) => {
        const filledPattern = this.fillPatternWithSemanticData(
          pattern,
          analyzedInput
        );
        const conversationPattern = this.convertToConversationPattern(
          filledPattern,
          pattern
        );

        // 매칭 정보 추가
        const scoreInfo = patternScores.find(
          (p) => p.pattern.id === pattern.id
        );
        (conversationPattern as any).matchScore = scoreInfo?.totalScore || 0;
        (
          conversationPattern as any
        ).matchReason = `의미적 매칭: ${semanticMatches.join(
          ", "
        )} | 키워드 그룹: ${matchedClusters.join(", ")}`;

        return conversationPattern;
      });
  }

  // ✅ 사용자 입력 의미 분석
  private analyzeUserInput(input: string): AnalyzedInput {
    const words = input.split(/\s+/);
    const analyzedCategories: string[] = [];
    const extractedItems: { category: string; ko: string; en: string }[] = [];

    console.log("🔤 분석할 단어들:", words);

    // 각 단어를 의미적 카테고리와 매칭
    for (const word of words) {
      for (const [categoryName, categoryData] of Object.entries(
        this.semanticCategories
      )) {
        // 한국어 키워드 매칭
        const matchedKoreanIndex = categoryData.keywords.findIndex(
          (keyword) => word.includes(keyword) || keyword.includes(word)
        );

        if (matchedKoreanIndex >= 0) {
          if (!analyzedCategories.includes(categoryName)) {
            analyzedCategories.push(categoryName);
            console.log(`✅ 카테고리 매칭: ${word} → ${categoryName}`);
          }

          // 구체적인 아이템 추출
          const koreanKeyword = categoryData.keywords[matchedKoreanIndex];
          const englishKeyword =
            categoryData.english[matchedKoreanIndex] || koreanKeyword;

          const existingItem = extractedItems.find(
            (item) =>
              item.ko === koreanKeyword && item.category === categoryName
          );

          if (!existingItem) {
            extractedItems.push({
              category: categoryName,
              ko: koreanKeyword,
              en: englishKeyword,
            });
            console.log(`📝 아이템 추출: ${koreanKeyword} (${englishKeyword})`);
          }
        }
      }
    }

    return {
      categories: analyzedCategories,
      items: extractedItems,
      originalInput: input,
    };
  }

  // ✅ 동적 패턴 생성 (핵심 아이디어)
  private generateDynamicPatterns(
    analyzedInput: AnalyzedInput
  ): PatternTemplate[] {
    const dynamicPatterns: PatternTemplate[] = [];

    // 음료 + 요청 조합
    if (
      analyzedInput.categories.includes("BEVERAGES") &&
      analyzedInput.categories.includes("REQUESTS")
    ) {
      dynamicPatterns.push({
        id: "dynamic-beverage-request",
        korean: "BEVERAGE를 주세요",
        english: "Can I have BEVERAGE please?",
        structure: "CAN + I + HAVE + BEVERAGE + PLEASE",
        keywords: ["음료", "주세요"],
        keywordClusters: ["BEVERAGES", "REQUESTS"],
        minimumMatches: 2,
        category: "daily",
        responseKorean: "네, 여기 있습니다",
        responseEnglish: "Here you go",
        variations: ["Right away!", "Of course!", "Coming up!"],
      });

      // 수량이 포함된 경우
      if (analyzedInput.categories.includes("QUANTITIES")) {
        dynamicPatterns.push({
          id: "dynamic-quantity-beverage",
          korean: "BEVERAGE QUANTITY 주세요",
          english: "I'd like QUANTITY of BEVERAGE please",
          structure: "I + WOULD + LIKE + QUANTITY + OF + BEVERAGE + PLEASE",
          keywords: ["음료", "한잔", "주세요"],
          keywordClusters: ["BEVERAGES", "QUANTITIES", "REQUESTS"],
          minimumMatches: 2,
          category: "daily",
          responseKorean: "어떤 사이즈로 드릴까요?",
          responseEnglish: "What size would you like?",
          variations: ["Hot or cold?", "For here or to go?", "Any extras?"],
        });
      }
    }

    // 음식 + 요청 조합
    if (
      analyzedInput.categories.includes("FOODS") &&
      analyzedInput.categories.includes("REQUESTS")
    ) {
      dynamicPatterns.push({
        id: "dynamic-food-request",
        korean: "FOOD를 주문하고 싶어요",
        english: "I would like to order FOOD",
        structure: "I + WOULD + LIKE + TO + ORDER + FOOD",
        keywords: ["음식", "주문"],
        keywordClusters: ["FOODS", "REQUESTS"],
        minimumMatches: 2,
        category: "daily",
        responseKorean: "곧 준비해드릴게요",
        responseEnglish: "We'll prepare that for you",
        variations: [
          "How would you like that?",
          "Any sides?",
          "That will be ready soon!",
        ],
      });
    }

    // 단순 요청 패턴 (음료나 음식만 있어도)
    if (analyzedInput.categories.includes("REQUESTS")) {
      if (
        analyzedInput.categories.includes("BEVERAGES") ||
        analyzedInput.categories.includes("FOODS")
      ) {
        dynamicPatterns.push({
          id: "dynamic-simple-request",
          korean: "ITEM 주세요",
          english: "ITEM please",
          structure: "ITEM + PLEASE",
          keywords: ["주세요"],
          keywordClusters: ["REQUESTS"],
          minimumMatches: 1,
          category: "daily",
          responseKorean: "네",
          responseEnglish: "Sure",
          variations: ["Of course", "Right away", "No problem"],
        });
      }
    }

    console.log(
      `🎪 동적 생성된 패턴들:`,
      dynamicPatterns.map((p) => p.id)
    );
    return dynamicPatterns;
  }

  // ✅ 의미적 점수 계산
  private calculateSemanticScore(
    pattern: PatternTemplate,
    analyzedInput: AnalyzedInput
  ): number {
    let score = 0;

    // 패턴이 필요로 하는 카테고리와 입력 카테고리 매칭
    for (const requiredCategory of pattern.keywordClusters || []) {
      if (analyzedInput.categories.includes(requiredCategory)) {
        score += 3.0; // 높은 점수
      }
    }

    // 동적 생성된 패턴은 추가 보너스
    if (pattern.id.startsWith("dynamic-")) {
      score += 2.0;
    }

    // 정확한 아이템 매칭 보너스
    if (analyzedInput.items.length > 0) {
      score += 1.0;
    }

    return score;
  }

  // ✅ 의미적 데이터로 패턴 채우기
  private fillPatternWithSemanticData(
    pattern: PatternTemplate,
    analyzedInput: AnalyzedInput
  ): PatternTemplate {
    let korean = pattern.korean;
    let english = pattern.english;

    // BEVERAGE 슬롯 채우기
    if (korean.includes("BEVERAGE")) {
      const beverageItem = analyzedInput.items.find(
        (item: any) => item.category === "BEVERAGES"
      );
      if (beverageItem) {
        korean = korean.replace(/BEVERAGE/g, beverageItem.ko);
        english = english.replace(/BEVERAGE/g, beverageItem.en);
      } else {
        korean = korean.replace(/BEVERAGE/g, "음료");
        english = english.replace(/BEVERAGE/g, "drink");
      }
    }

    // FOOD 슬롯 채우기
    if (korean.includes("FOOD")) {
      const foodItem = analyzedInput.items.find(
        (item: any) => item.category === "FOODS"
      );
      if (foodItem) {
        korean = korean.replace(/FOOD/g, foodItem.ko);
        english = english.replace(/FOOD/g, foodItem.en);
      } else {
        korean = korean.replace(/FOOD/g, "음식");
        english = english.replace(/FOOD/g, "food");
      }
    }

    // QUANTITY 슬롯 채우기
    if (korean.includes("QUANTITY")) {
      const quantityItem = analyzedInput.items.find(
        (item: any) => item.category === "QUANTITIES"
      );
      if (quantityItem) {
        korean = korean.replace(/QUANTITY/g, quantityItem.ko);
        english = english.replace(/QUANTITY/g, quantityItem.en);
      } else {
        korean = korean.replace(/QUANTITY/g, "한 잔");
        english = english.replace(/QUANTITY/g, "one glass");
      }
    }

    // ITEM (일반적인 아이템) 슬롯 채우기
    if (korean.includes("ITEM")) {
      const anyItem = analyzedInput.items[0]; // 첫 번째 아이템 사용
      if (anyItem) {
        korean = korean.replace(/ITEM/g, anyItem.ko);
        english = english.replace(/ITEM/g, anyItem.en);
      }
    }

    return { ...pattern, korean, english };
  }

  private getSemanticMatches(
    pattern: PatternTemplate,
    analyzedInput: AnalyzedInput
  ): string[] {
    const matches = [];
    for (const category of analyzedInput.categories) {
      if (pattern.keywordClusters?.includes(category)) {
        matches.push(category);
      }
    }
    return matches;
  }

  // ===== 기존 메서드들 (호환성 유지) =====

  // 기존 클러스터 매칭 로직
  private findClusterMatches(input: string): Record<string, number> {
    const matches: Record<string, number> = {};

    for (const [clusterName, cluster] of Object.entries(this.keywordClusters)) {
      let clusterScore = 0;

      // Primary 키워드 매칭 (최고 점수)
      if (this.containsAnyKeyword(input, [cluster.primary])) {
        clusterScore += cluster.weight * 1.0;
      }

      // Synonyms 매칭 (높은 점수)
      const synonymMatches = this.countKeywordMatches(input, cluster.synonyms);
      clusterScore += synonymMatches * cluster.weight * 0.8;

      // Related 키워드 매칭 (중간 점수)
      const relatedMatches = this.countKeywordMatches(input, cluster.related);
      clusterScore += relatedMatches * cluster.weight * 0.5;

      if (clusterScore > 0) {
        matches[clusterName] = clusterScore;
      }
    }

    return matches;
  }

  private calculateClusterScore(
    pattern: PatternTemplate,
    clusterMatches: Record<string, number>
  ): { score: number; matchedCount: number; clusters: string[] } {
    let totalScore = 0;
    const matchedClusters: string[] = [];

    for (const requiredCluster of pattern.keywordClusters) {
      if (clusterMatches[requiredCluster]) {
        totalScore += clusterMatches[requiredCluster];
        matchedClusters.push(requiredCluster);
      }
    }

    // 커버리지 보너스 (모든 필수 클러스터가 매치되면 보너스)
    const coverage = matchedClusters.length / pattern.keywordClusters.length;
    if (coverage >= 0.8) {
      totalScore *= 1.2; // 20% 보너스
    }

    return {
      score: totalScore,
      matchedCount: matchedClusters.length,
      clusters: matchedClusters,
    };
  }

  private calculateKeywordScore(
    pattern: PatternTemplate,
    input: string
  ): number {
    let score = 0;
    for (const keyword of pattern.keywords) {
      if (input.includes(keyword)) {
        score += 1;
      }
    }
    return score;
  }

  private containsAnyKeyword(input: string, keywords: string[]): boolean {
    return keywords.some((keyword) => input.includes(keyword.toLowerCase()));
  }

  private countKeywordMatches(input: string, keywords: string[]): number {
    return keywords.filter((keyword) => input.includes(keyword.toLowerCase()))
      .length;
  }

  // 개선된 엔티티 추출
  private fillPatternWithActualWords(
    pattern: PatternTemplate,
    originalInput: string
  ): PatternTemplate {
    let filledKorean = pattern.korean;
    let filledEnglish = pattern.english;

    // 더 정교한 엔티티 추출
    const entities = this.extractEntitiesFromInput(originalInput);

    // PLACE 슬롯 채우기
    if (pattern.korean.includes("PLACE") && entities.place) {
      const place = this.findMatchingLexeme(entities.place, "PLACE");
      if (place) {
        filledKorean = filledKorean.replace(/PLACE/g, place.ko);
        filledEnglish = filledEnglish.replace(/PLACE/g, place.en);
      } else {
        filledKorean = filledKorean.replace(/PLACE/g, entities.place);
        filledEnglish = filledEnglish.replace(/PLACE/g, `[${entities.place}]`);
      }
    }

    // TRANSPORT 슬롯 채우기 (새로 추가)
    if (pattern.korean.includes("TRANSPORT") && entities.transport) {
      filledKorean = filledKorean.replace(/TRANSPORT/g, entities.transport);
      filledEnglish = filledEnglish.replace(
        /TRANSPORT/g,
        this.translateTransport(entities.transport)
      );
    }

    return {
      ...pattern,
      korean: filledKorean,
      english: filledEnglish,
    };
  }

  private extractEntitiesFromInput(input: string): {
    place?: string;
    transport?: string;
    item?: string;
  } {
    const entities: any = {};

    // 카페/브랜드명 추출 (더 정교하게)
    const cafePattern = /(메가커피|메가|스타벅스|투썸|이디야|할리스|커피빈)/;
    const cafeMatch = input.match(cafePattern);
    if (cafeMatch) {
      entities.place = cafeMatch[1];
    }

    // 일반 장소 추출
    const placePattern = /([\w\s]+)(역|정류장|병원|은행|학교|카페|커피숍)/;
    const placeMatch = input.match(placePattern);
    if (placeMatch && !entities.place) {
      entities.place = placeMatch[0];
    }

    // 교통수단 추출
    const transportPattern = /(버스|지하철|택시|전철|기차)/;
    const transportMatch = input.match(transportPattern);
    if (transportMatch) {
      entities.transport = transportMatch[1];
    }

    return entities;
  }

  private findMatchingLexeme(word: string, pos: string): any {
    const allLexemes = dataPackLoader.getAllLexemes();
    return allLexemes.find(
      (lexeme) =>
        lexeme.pos === pos &&
        (lexeme.ko.includes(word) || word.includes(lexeme.ko))
    );
  }

  private translateTransport(transport: string): string {
    const translations: Record<string, string> = {
      버스: "bus",
      지하철: "subway",
      택시: "taxi",
      전철: "train",
      기차: "train",
    };
    return translations[transport] || transport;
  }

  // 기존 메서드들 유지 (호환성)
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
        needsUserInput: isUserInput,
      };
    });
  }

  private getKoreanTranslation(word: string): string {
    const allLexemes = dataPackLoader.getAllLexemes();
    const found = allLexemes.find(
      (lexeme) => lexeme.en.toLowerCase() === word.toLowerCase()
    );
    if (found) return found.ko;

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
      water: "물",
      coffee: "커피",
      tea: "차",
      juice: "주스",
      drink: "음료",
      food: "음식",
      one: "하나",
      glass: "잔",
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
