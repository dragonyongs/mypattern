// src/shared/services/packDataService.ts
import type { PackData, ContentItem, DayPlan } from "@/types";

interface PackRegistry {
  availablePacks: Array<{
    id: string;
    enabled: boolean;
    priority: number;
  }>;
  version: string;
  lastUpdated: string;
}

interface PackMetadata {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  level?: "beginner" | "intermediate" | "advanced";
  tags?: string[];
  totalDays: number;
  enabled: boolean;
  priority: number;
}

class PackDataService {
  private cache = new Map<string, PackData>();
  private metadataCache = new Map<string, PackMetadata>();
  private registryCache: PackRegistry | null = null;
  private loadingPromises = new Map<string, Promise<any>>();

  // 🔥 팩 레지스트리 로드
  async loadPackRegistry(): Promise<PackRegistry> {
    if (this.registryCache) {
      return this.registryCache;
    }

    if (this.loadingPromises.has("registry")) {
      return this.loadingPromises.get("registry")!;
    }

    const promise = fetch("/data/packs/registry.json")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Pack registry not found");
        }
        return response.json();
      })
      .then((registry: PackRegistry) => {
        this.registryCache = registry;
        this.loadingPromises.delete("registry");
        console.log(
          "✅ Pack registry loaded:",
          registry.availablePacks.length,
          "packs"
        );
        return registry;
      })
      .catch((error) => {
        console.error("❌ Failed to load pack registry:", error);
        this.loadingPromises.delete("registry");
        // 폴백: 기본 레지스트리 반환
        const fallbackRegistry: PackRegistry = {
          availablePacks: [
            { id: "real-voca-basic", enabled: true, priority: 1 },
            { id: "everyday-convo-3days", enabled: true, priority: 2 },
          ],
          version: "1.0.0",
          lastUpdated: new Date().toISOString(),
        };
        this.registryCache = fallbackRegistry;
        return fallbackRegistry;
      });

    this.loadingPromises.set("registry", promise);
    return promise;
  }

  // 🔥 사용 가능한 팩 목록 조회
  async getAvailablePacks(): Promise<PackMetadata[]> {
    try {
      const registry = await this.loadPackRegistry();
      const enabledPacks = registry.availablePacks
        .filter((pack) => pack.enabled)
        .sort((a, b) => a.priority - b.priority);

      // 메타데이터를 병렬로 로드
      const metadataPromises = enabledPacks.map(async (pack) => {
        if (this.metadataCache.has(pack.id)) {
          return this.metadataCache.get(pack.id)!;
        }

        try {
          const packData = await this.loadPackData(pack.id);
          const metadata: PackMetadata = {
            id: packData.id,
            title: packData.title,
            subtitle: packData.subtitle,
            description: packData.description,
            level: packData.level,
            tags: packData.tags,
            totalDays: packData.learningPlan.totalDays,
            enabled: pack.enabled,
            priority: pack.priority,
          };

          this.metadataCache.set(pack.id, metadata);
          return metadata;
        } catch (error) {
          console.warn(
            `⚠️ Failed to load metadata for pack: ${pack.id}`,
            error
          );
          return null;
        }
      });

      const results = await Promise.allSettled(metadataPromises);
      return results
        .filter(
          (result): result is PromiseFulfilledResult<PackMetadata> =>
            result.status === "fulfilled" && result.value !== null
        )
        .map((result) => result.value);
    } catch (error) {
      console.error("❌ Failed to get available packs:", error);
      return [];
    }
  }

  // 🔥 개선된 팩 데이터 로드
  async loadPackData(packId: string): Promise<PackData> {
    if (this.cache.has(packId)) {
      return this.cache.get(packId)!;
    }

    if (this.loadingPromises.has(packId)) {
      return this.loadingPromises.get(packId)!;
    }

    const promise = fetch(`/data/packs/${packId}.json`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Pack ${packId} not found (${response.status})`);
        }
        return response.json();
      })
      .then((data: PackData) => {
        // 데이터 유효성 검증
        if (!data.id || !data.title || !data.contents || !data.learningPlan) {
          throw new Error(`Invalid pack data structure for ${packId}`);
        }

        this.cache.set(packId, data);
        this.loadingPromises.delete(packId);
        console.log(
          `✅ Pack data loaded: ${packId} (${data.contents.length} items)`
        );
        return data;
      })
      .catch((error) => {
        console.error(`❌ Failed to load pack ${packId}:`, error);
        this.loadingPromises.delete(packId);
        throw error;
      });

    this.loadingPromises.set(packId, promise);
    return promise;
  }

  // 🔥 팩 존재 여부 확인
  async isPackAvailable(packId: string): Promise<boolean> {
    try {
      const registry = await this.loadPackRegistry();
      return registry.availablePacks.some(
        (pack) => pack.id === packId && pack.enabled
      );
    } catch {
      return false;
    }
  }

  // 🔥 최근 사용된 팩 ID 추론 (studyProgressStore 활용)
  async inferRecentPackId(): Promise<string | null> {
    try {
      const availablePacks = await this.getAvailablePacks();
      if (availablePacks.length === 0) return null;

      // localStorage에서 학습 진행 상황 확인
      const progressData = localStorage.getItem("study-progress-v6");
      if (!progressData) {
        return availablePacks[0].id; // 첫 번째 팩 반환
      }

      const progress = JSON.parse(progressData);
      const recentPackId = Object.keys(progress.state?.progress || {})
        .filter((packId) => availablePacks.some((pack) => pack.id === packId))
        .sort((a, b) => {
          const aTime = progress.state.progress[a]?.lastStudiedAt || "0";
          const bTime = progress.state.progress[b]?.lastStudiedAt || "0";
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        })[0];

      return recentPackId || availablePacks[0].id;
    } catch (error) {
      console.warn("⚠️ Failed to infer recent pack ID:", error);
      return null;
    }
  }

  // 기존 메서드들 유지
  getDayPlan(packData: PackData, day: number): DayPlan | null {
    return packData.learningPlan.days.find((d) => d.day === day) || null;
  }

  getContentsByIds(packData: PackData, ids: string[]): ContentItem[] {
    const contentMap = new Map(packData.contents.map((c) => [c.id, c]));
    return ids.map((id) => contentMap.get(id)).filter(Boolean) as ContentItem[];
  }

  // 🔥 캐시 관리
  clearCache(): void {
    this.cache.clear();
    this.metadataCache.clear();
    this.registryCache = null;
    this.loadingPromises.clear();
    console.log("🧹 Pack data cache cleared");
  }

  // 🔥 캐시 통계
  getCacheStats() {
    return {
      packsLoaded: this.cache.size,
      metadataCached: this.metadataCache.size,
      registryLoaded: !!this.registryCache,
      loadingPromises: this.loadingPromises.size,
    };
  }
}

export const packDataService = new PackDataService();
