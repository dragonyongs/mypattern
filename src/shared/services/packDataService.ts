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
    let days: any[] = [];

    // 🎯 새로운 구조: contents → days 변환
    if (rawData.contents && !rawData.days) {
      // contents 구조를 days 구조로 변환
      days = this.convertContentsToDays(rawData.contents, rawData.totalDays);
    }
    // 🎯 기존 구조: days 직접 사용
    else if (rawData.days) {
      days = rawData.days;
    }

    return {
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
  }

  // 🎯 contents를 days로 변환하는 헬퍼 함수
  private convertContentsToDays(
    contents: any[],
    totalDays: number = 14
  ): any[] {
    const days: any[] = [];

    // Day 1: 학습 방법 소개
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

    // Day 2부터: contents에서 데이터 추출
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

  clearCache() {
    this.cache.clear();
    this.loadingPromises.clear();
  }
}

export const packDataService = new PackDataService();
