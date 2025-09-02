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
}

class PackDataService {
  private cache = new Map<string, PackData>();
  private loadingPromises = new Map<string, Promise<PackData>>();

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
      throw new Error(`데이터 로드 실패: ${packId}`);
    }
  }

  private normalizePackData(rawData: any, packId: string): PackData {
    return {
      id: rawData.id || packId,
      title: rawData.title || "Real VOCA Basic",
      subtitle: rawData.subtitle,
      description: rawData.description || "14일 완성 영어 학습",
      totalDays: rawData.totalDays || 14,
      learningMethods: rawData.learningMethods || [],
      categories: rawData.categories || [],
      days: (rawData.days || []).map((day: any) => {
        // 🎯 기존 content 구조와 새로운 구조 모두 지원
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

  clearCache() {
    this.cache.clear();
    this.loadingPromises.clear();
  }
}

export const packDataService = new PackDataService();
