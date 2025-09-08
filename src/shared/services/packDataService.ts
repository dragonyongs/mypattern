// src/shared/services/packDataService.ts

import type { PackData, ContentItem, DayPlan } from "@/types";

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

    const promise = fetch(`/data/packs/${packId}.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`Pack ${packId} not found`);
        return response.json();
      })
      .then((data) => {
        this.cache.set(packId, data);
        this.loadingPromises.delete(packId);
        return data;
      });

    this.loadingPromises.set(packId, promise);
    return promise;
  }

  // [추가] 특정 Day의 학습 계획 가져오기
  getDayPlan(packData: PackData, day: number): DayPlan | null {
    return packData.learningPlan.days.find((d) => d.day === day) || null;
  }

  // [추가] ID 배열로 콘텐츠 아이템들 한번에 가져오기 (성능 최적화)
  getContentsByIds(packData: PackData, ids: string[]): ContentItem[] {
    const contentMap = new Map(packData.contents.map((c) => [c.id, c]));
    return ids.map((id) => contentMap.get(id)).filter(Boolean) as ContentItem[];
  }
}

export const packDataService = new PackDataService();
