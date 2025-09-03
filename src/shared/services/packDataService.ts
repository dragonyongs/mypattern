// src/shared/services/packDataService.ts

export interface VocabItem {
  word: string;
  meaning: string;
  pronunciation?: string;
  emoji: string;
}

export interface SentenceItem {
  sentence: string;
  translation: string;
  targetWords: string[];
  situation?: string;
}

export interface WorkbookItem {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

export interface DayData {
  day: number;
  type?: string;
  category: string;
  page?: number;
  title?: string;
  methods?: string[];
  vocabularies: VocabItem[];
  sentences: SentenceItem[];
  workbook: WorkbookItem[];
}

export interface PackData {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  totalDays: number;
  learningMethods: Array<{
    phase: number;
    name: string;
    icon: string;
    description: string;
    days: string;
  }>;
  categories: Array<{
    name: string;
    page: number;
  }>;
  days: DayData[];
  // ✅ PackSelectPage용 메타데이터 추가
  level?: "beginner" | "intermediate" | "advanced";
  difficulty?: number;
  rating?: number;
  userCount?: number;
  tags?: string[];
  features?: string[];
  price?: {
    type: "free" | "paid";
    amount?: number;
    currency?: string;
  };
}

// ✅ PackSelectPage용 메타데이터 정의 (존재하는 팩에 대해서만)
const PACK_METADATA: Record<string, any> = {
  "real-voca-basic": {
    subtitle: "기초 어휘 완성",
    description:
      "영어 학습의 기초가 되는 핵심 어휘 1,000개를 14일 만에 완성하세요.",
    level: "beginner" as const,
    difficulty: 2,
    rating: 4.8,
    userCount: 12500,
    tags: ["기초", "어휘", "초보자"],
    features: ["음성 지원", "진도 관리", "복습 시스템"],
    price: { type: "free" as const },
  },
  // "real-voca-advanced": {
  //   subtitle: "고급 어휘 마스터",
  //   description:
  //     "토익, 토플, 수능에 필요한 고급 어휘 2,000개를 완벽하게 마스터하세요.",
  //   level: "advanced" as const,
  //   difficulty: 4,
  //   rating: 4.9,
  //   userCount: 8900,
  //   tags: ["고급", "시험대비", "토익", "토플"],
  //   features: ["AI 맞춤 학습", "실전 모의고사", "약점 분석"],
  //   price: { type: "paid" as const, amount: 29900, currency: "KRW" },
  // },
  // "business-english": {
  //   subtitle: "비즈니스 영어 완성",
  //   description:
  //     "실무에 바로 활용할 수 있는 비즈니스 영어 표현과 이메일 작성법을 익히세요.",
  //   level: "intermediate" as const,
  //   difficulty: 3,
  //   rating: 4.7,
  //   userCount: 5600,
  //   tags: ["비즈니스", "실무", "이메일", "미팅"],
  //   features: ["실무 예문", "이메일 템플릿", "발음 교정"],
  //   price: { type: "paid" as const, amount: 49900, currency: "KRW" },
  // },
};

class PackDataService {
  private cache = new Map<string, PackData>();
  private loadingPromises = new Map<string, Promise<PackData>>();
  private packListCache: string[] | null = null;

  async loadPackData(packId: string): Promise<PackData> {
    if (this.cache.has(packId)) {
      return this.cache.get(packId)!;
    }

    if (this.loadingPromises.has(packId)) {
      return this.loadingPromises.get(packId)!;
    }

    const loadingPromise = this.fetchPackData(packId);
    this.loadingPromises.set(packId, loadingPromise);

    try {
      const data = await loadingPromise;
      this.cache.set(packId, data);
      return data;
    } finally {
      this.loadingPromises.delete(packId);
    }
  }

  // ✅ index.json에서 실제 존재하는 팩 목록 가져오기
  async loadPackList(): Promise<string[]> {
    if (this.packListCache) {
      return this.packListCache;
    }

    try {
      const response = await fetch("/data/packs/index.json");
      if (!response.ok) {
        throw new Error(`Failed to load pack index: ${response.status}`);
      }

      const indexData = await response.json();
      this.packListCache = indexData.packs || [];

      console.log(
        "[PackDataService] 실제 존재하는 팩 목록:",
        this.packListCache
      );
      return this.packListCache;
    } catch (error) {
      console.error("Failed to load pack list from index.json:", error);
      // 폴백: 빈 배열 반환
      this.packListCache = [];
      return this.packListCache;
    }
  }

  // ✅ 모든 팩의 메타데이터 로드 (실제 존재하는 팩만)
  async loadAllPacksMetadata(): Promise<PackData[]> {
    const packIds = await this.loadPackList();

    if (packIds.length === 0) {
      console.warn("[PackDataService] 사용 가능한 팩이 없습니다.");
      return [];
    }

    const packPromises = packIds.map(async (packId) => {
      try {
        return await this.loadPackData(packId);
      } catch (error) {
        console.warn(`Failed to load pack ${packId}:`, error);
        // 실패시 메타데이터만으로 기본 팩 정보 반환 (해당 팩의 메타데이터가 있는 경우만)
        if (PACK_METADATA[packId]) {
          return this.createFallbackPackData(packId);
        }
        return null; // 메타데이터도 없으면 null 반환
      }
    });

    const results = await Promise.allSettled(packPromises);
    return results
      .filter(
        (result): result is PromiseFulfilledResult<PackData> =>
          result.status === "fulfilled" && result.value !== null
      )
      .map((result) => result.value);
  }

  private async fetchPackData(packId: string): Promise<PackData> {
    try {
      const response = await fetch(`/data/packs/${packId}.json`);
      if (!response.ok) {
        throw new Error(`Pack ${packId} not found (${response.status})`);
      }

      const rawData = await response.json();
      return this.normalizePackData(rawData, packId);
    } catch (error) {
      console.error(`Failed to load pack ${packId}:`, error);

      // ✅ JSON 로드 실패시 메타데이터가 있는 경우만 폴백 데이터 생성
      if (PACK_METADATA[packId]) {
        const fallbackData = this.createFallbackPackData(packId);
        console.warn(`Using fallback data for pack ${packId}`);
        return fallbackData;
      }

      // 메타데이터도 없으면 에러 던지기
      throw new Error(`Pack ${packId} not found and no metadata available`);
    }
  }

  // ✅ 메타데이터만으로 기본 팩 데이터 생성 (폴백용)
  private createFallbackPackData(packId: string): PackData {
    const metadata = PACK_METADATA[packId];

    if (!metadata) {
      throw new Error(`No metadata available for pack ${packId}`);
    }

    return {
      id: packId,
      title: packId.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      totalDays: 14,
      learningMethods: [
        {
          phase: 1,
          name: "단어학습",
          icon: "BookOpen",
          description: "체계적 어휘 학습",
          days: "1-14",
        },
        {
          phase: 2,
          name: "문장연습",
          icon: "MessageSquare",
          description: "실용적 문장 연습",
          days: "3-14",
        },
        {
          phase: 3,
          name: "워크북",
          icon: "PenTool",
          description: "다양한 문제 풀이",
          days: "7-14",
        },
      ],
      categories: [],
      days: [],
      ...metadata,
    };
  }

  private normalizePackData(rawData: any, packId: string): PackData {
    let days: any[] = [];

    // 🎯 새로운 구조: contents → days 변환
    if (rawData.contents && !rawData.days) {
      days = this.convertContentsToDays(rawData.contents, rawData.totalDays);
    }
    // 🎯 기존 구조: days 직접 사용
    else if (rawData.days) {
      days = rawData.days;
    }

    // ✅ 메타데이터 병합 (해당 팩의 메타데이터가 있는 경우만)
    const metadata = PACK_METADATA[packId];
    const basePackData = {
      id: rawData.id || packId,
      title: rawData.title || "Real VOCA Basic",
      subtitle: rawData.subtitle,
      description: rawData.description || "14일 완성 영어 학습",
      totalDays: rawData.totalDays || 14,
      learningMethods: rawData.learningMethods || [],
      categories: rawData.categories || [],
      days: days.map((day: any) => {
        const content = day.content || day;
        return {
          day: day.day,
          type: day.type,
          category: day.category || content.category || `Day ${day.day}`,
          page: day.page || content.page,
          title: day.title || content.title,
          methods: day.methods || content.methods || [1],
          vocabularies:
            content.vocabulary ||
            content.vocabularies ||
            day.vocabularies ||
            [],
          sentences: content.sentences || day.sentences || [],
          workbook: content.workbook || day.workbook || [],
        };
      }),
    };

    // ✅ 메타데이터가 있으면 병합, 없으면 기본값만 사용
    if (metadata) {
      return {
        ...basePackData,
        ...metadata,
        // JSON의 데이터가 우선
        subtitle: rawData.subtitle || metadata.subtitle,
        description: rawData.description || metadata.description,
        totalDays: basePackData.totalDays, // JSON 파일의 실제 일수 우선
      };
    }

    return basePackData;
  }

  // 나머지 메서드들은 동일...
  private convertContentsToDays(
    contents: any[],
    totalDays: number = 14
  ): any[] {
    const days: any[] = [];

    days.push({
      day: 1,
      type: "introduction",
      title: "학습 방법 소개",
      category: "학습 가이드",
      content: {
        introduction: true,
        learningGuide: {
          step1: "상상하고 - 단어를 그림과 상황으로 상상하며 익히기",
          step2: "훑어보고 - 전체 내용을 훑으며 Target Words 파악하기",
          step3: "말해보고 - 문장을 소리 내어 읽으며 익히기",
          step4: "확인하고 - 워크북으로 학습 내용 확인하기",
        },
      },
    });

    for (let day = 2; day <= totalDays; day++) {
      const dayContents = contents.filter((item) =>
        item.includedInDays?.includes(day)
      );

      const vocabularies = dayContents
        .filter((item) => item.type === "vocabulary")
        .map((item) => ({
          id: item.id,
          word: item.word,
          meaning: item.meaning,
          emoji: item.emoji,
          pronunciation: item.pronunciation,
          usage: item.usage,
        }));

      const sentences = dayContents
        .filter((item) => item.type === "sentence")
        .map((item) => ({
          id: item.id,
          text: item.text,
          translation: item.translation,
          targetWords: item.targetWords,
          situation: item.situation,
        }));

      const workbook = dayContents
        .filter((item) => item.type === "workbook")
        .map((item) => ({
          id: item.id,
          type: "fill-blank",
          sentence: item.question,
          options: item.options,
          correctAnswer: item.correctAnswer,
          explanation: item.explanation,
        }));

      days.push({
        day,
        type: "vocabulary",
        category: dayContents[0]?.category || `Day ${day}`,
        page: dayContents[0]?.page,
        title: dayContents[0]?.category || `Day ${day}`,
        methods: ["상상하고", "훑어보고"],
        content: {
          vocabularies,
          sentences,
          workbook,
        },
      });
    }

    return days;
  }

  // 헬퍼 메서드들
  getDayData(packData: PackData, day: number): DayData | null {
    return packData.days.find((d) => d.day === day) || null;
  }

  getVocabularyData(packData: PackData, day: number): VocabItem[] {
    const dayData = this.getDayData(packData, day);
    return dayData?.vocabularies || [];
  }

  getSentenceData(packData: PackData, day: number): SentenceItem[] {
    const dayData = this.getDayData(packData, day);
    return dayData?.sentences || [];
  }

  getWorkbookData(packData: PackData, day: number): WorkbookItem[] {
    const dayData = this.getDayData(packData, day);
    return dayData?.workbook || [];
  }

  // ✅ PackSelectPage용 헬퍼 메서드들 (실제 존재하는 팩만)
  async getPackMetadata(packId: string): Promise<Partial<PackData>> {
    try {
      const packData = await this.loadPackData(packId);
      return {
        id: packData.id,
        title: packData.title,
        subtitle: packData.subtitle,
        description: packData.description,
        level: packData.level,
        difficulty: packData.difficulty,
        rating: packData.rating,
        userCount: packData.userCount,
        tags: packData.tags,
        features: packData.features,
        price: packData.price,
        totalDays: packData.totalDays,
        learningMethods: packData.learningMethods,
      };
    } catch (error) {
      console.error(`Failed to get metadata for pack ${packId}:`, error);
      throw error; // 실패시 에러 던지기 (존재하지 않는 팩)
    }
  }

  // ✅ 특정 레벨의 팩들만 필터링 (실제 존재하는 팩만)
  async getPacksByLevel(
    level: "beginner" | "intermediate" | "advanced"
  ): Promise<PackData[]> {
    const allPacks = await this.loadAllPacksMetadata();
    return allPacks.filter((pack) => pack.level === level);
  }

  // ✅ 무료/유료 팩 필터링 (실제 존재하는 팩만)
  async getPacksByPriceType(priceType: "free" | "paid"): Promise<PackData[]> {
    const allPacks = await this.loadAllPacksMetadata();
    return allPacks.filter((pack) => pack.price?.type === priceType);
  }

  clearCache() {
    this.cache.clear();
    this.loadingPromises.clear();
    this.packListCache = null; // 팩 목록 캐시도 초기화
  }
}

export const packDataService = new PackDataService();
