// src/features/build/services/enhancedPatternMatcher.ts

interface KeywordCluster {
  primary: string;
  synonyms: string[];
  related: string[];
  weight: number;
}

interface PatternMatchScore {
  patternId: string;
  totalScore: number;
  matchedClusters: string[];
  coverage: number; // 패턴 커버리지 비율
}

export class EnhancedPatternMatcher {
  private keywordClusters: Record<string, KeywordCluster> = {
    // 장소 관련 클러스터
    LOCATION: {
      primary: "장소",
      synonyms: ["어디", "위치", "곳", "자리"],
      related: ["있나요", "있어요", "어딘가요", "어디에"],
      weight: 2.0,
    },

    COFFEE_PLACE: {
      primary: "카페",
      synonyms: ["커피숍", "카페", "커피점", "메가커피", "스타벅스"],
      related: ["메가", "coffee", "cafe", "shop", "매장"],
      weight: 1.8,
    },

    INQUIRY: {
      primary: "문의",
      synonyms: ["아시나요", "알고있나요", "있나요", "어딘가요"],
      related: ["know", "있는지", "어디", "물어봐도"],
      weight: 1.5,
    },

    DIRECTION: {
      primary: "이동",
      synonyms: ["가는", "어떻게", "방법", "길"],
      related: ["go", "get", "way", "route", "가야"],
      weight: 1.7,
    },
  };

  private patternTemplates = [
    {
      id: "location-inquiry",
      requiredClusters: ["LOCATION", "COFFEE_PLACE", "INQUIRY"],
      minimumMatches: 2, // 최소 2개 클러스터가 매치되어야 함
      korean: "PLACE이/가 어디에 있나요?",
      english: "Where is PLACE?",
      category: "location",
    },

    {
      id: "direction-request",
      requiredClusters: ["DIRECTION", "LOCATION"],
      minimumMatches: 2,
      korean: "PLACE으로/로 어떻게 가나요?",
      english: "How do I get to PLACE?",
      category: "directions",
    },
  ];

  matchPatterns(userInput: string): ConversationPattern[] {
    const normalizedInput = this.normalizeInput(userInput);
    const clusterMatches = this.findClusterMatches(normalizedInput);

    const patternScores: PatternMatchScore[] = [];

    for (const template of this.patternTemplates) {
      const score = this.calculatePatternScore(template, clusterMatches);

      if (
        score.totalScore > 0 &&
        score.matchedClusters.length >= template.minimumMatches
      ) {
        patternScores.push({
          patternId: template.id,
          ...score,
        });
      }
    }

    // 점수순 정렬 후 상위 3개 반환
    return patternScores
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 3)
      .map((score) => this.buildConversationPattern(score, userInput));
  }

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

  private calculatePatternScore(
    template: any,
    clusterMatches: Record<string, number>
  ): Omit<PatternMatchScore, "patternId"> {
    let totalScore = 0;
    const matchedClusters: string[] = [];

    for (const requiredCluster of template.requiredClusters) {
      if (clusterMatches[requiredCluster]) {
        totalScore += clusterMatches[requiredCluster];
        matchedClusters.push(requiredCluster);
      }
    }

    // 커버리지 보너스 (모든 필수 클러스터가 매치되면 보너스)
    const coverage = matchedClusters.length / template.requiredClusters.length;
    if (coverage >= 0.8) {
      totalScore *= 1.2; // 20% 보너스
    }

    return {
      totalScore,
      matchedClusters,
      coverage,
    };
  }

  private containsAnyKeyword(input: string, keywords: string[]): boolean {
    return keywords.some((keyword) => input.includes(keyword.toLowerCase()));
  }

  private countKeywordMatches(input: string, keywords: string[]): number {
    return keywords.filter((keyword) => input.includes(keyword.toLowerCase()))
      .length;
  }

  private normalizeInput(input: string): string {
    return input
      .toLowerCase()
      .replace(/[?!.]/g, "") // 문장부호 제거
      .trim();
  }
}
