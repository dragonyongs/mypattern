// src/shared/services/packDataService.ts
import type { PackData, ContentItem, DayPlan } from "@/types";
import {
  generateWorkbookFromSentence,
  GeneratedWorkbook,
} from "@/shared/utils/packUtils";

type PackDataWithGenerated = PackData & {
  generatedWorkbooks?: GeneratedWorkbook[];
};

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

  // helper: 문장 기반으로 generatedWorkbooks를 만든다 (캐시)
  private ensureGeneratedWorkbooks(data: PackDataWithGenerated) {
    if (data.generatedWorkbooks && data.generatedWorkbooks.length > 0) return;

    const sentences = data.contents.filter((c) => c.type === "sentence");
    const generated: GeneratedWorkbook[] = [];
    for (const s of sentences) {
      const ws = generateWorkbookFromSentence(s as any, data.contents);
      generated.push(...ws);
    }
    data.generatedWorkbooks = generated;
    // 로그
    console.log(
      `🧩 Generated ${generated.length} workbooks from sentences for pack ${data.id}`
    );
  }

  // 🔥 개선된 팩 데이터 로드
  async loadPackData(packId: string): Promise<PackData> {
    if (this.cache.has(packId)) return this.cache.get(packId)!;
    if (this.loadingPromises.has(packId))
      return this.loadingPromises.get(packId)!;

    // 시도할 후보 경로들 (우선순위)
    const candidates = [
      // `/data/packs/${packId}.json`,
      `/data/packs/${packId}.min.json`,
      // `/data/packs/${packId}-minimal.json`,
    ];

    const tryFetchSequential = async () => {
      let lastErr: any = null;
      for (const url of candidates) {
        try {
          console.debug(`[packDataService] trying to fetch pack:`, url);
          const resp = await fetch(url);
          if (!resp.ok) {
            lastErr = new Error(`Fetch ${url} failed (${resp.status})`);
            continue; // 다음 후보 시도
          }
          const data: PackDataWithGenerated = await resp.json();

          // 최소 유효성 검사
          if (!data.id || !data.title || !data.contents || !data.learningPlan) {
            throw new Error(
              `Invalid pack data structure for ${packId} at ${url}`
            );
          }

          // 성공하면 해당 data와 url 반환
          return { data, url };
        } catch (e) {
          lastErr = e;
          console.warn(`[packDataService] fetch failed for ${url}:`, e);
          // 다음 후보로 계속
        }
      }
      throw lastErr;
    };

    const promise = tryFetchSequential()
      .then(({ data, url }) => {
        try {
          // 1) generatedWorkbooks 생성
          this.ensureGeneratedWorkbooks(data);

          // 2) learningPlan 보정: w-* → generatedWorkbooks / sentence 기반으로 치환
          this.ensureLearningPlanHasWorkbooks(data); // ← add this line
        } catch (e) {
          console.warn("⚠️ 워크북/학습플랜 후처리 중 오류 발생:", e);
        }

        this.cache.set(packId, data);
        this.loadingPromises.delete(packId);
        console.log(
          `✅ Pack data loaded: ${packId} from ${url} (${data.contents.length} items)`
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

  // ensureLearningPlanHasWorkbooks 개선판
  private ensureLearningPlanHasWorkbooks(data: PackDataWithGenerated) {
    if (!data.learningPlan || !Array.isArray(data.learningPlan.days)) return;

    // ensure generated are created
    if (!data.generatedWorkbooks || data.generatedWorkbooks.length === 0) {
      try {
        this.ensureGeneratedWorkbooks(data);
      } catch (e) {
        console.warn("ensureGeneratedWorkbooks failed:", e);
      }
    }

    const genBySentence = new Map<string, GeneratedWorkbook[]>();
    for (const g of data.generatedWorkbooks || []) {
      const key = g.relatedSentenceId;
      if (!genBySentence.has(key)) genBySentence.set(key, []);
      genBySentence.get(key)!.push(g);
    }

    // fast lookup sets
    const contentIdSet = new Set((data.contents || []).map((c) => c.id));
    const sentenceIdSet = new Set(
      (data.contents || [])
        .filter((c) => c.type === "sentence")
        .map((s) => s.id)
    );

    let mutated = false;

    for (const day of data.learningPlan.days) {
      day.modes = day.modes || [];

      // 1) 기존 modes에서 workbook type이 있고 contentIds중 없는 id가 있는 경우 교정 시도
      for (const mode of day.modes) {
        if (!mode.contentIds || !Array.isArray(mode.contentIds)) continue;
        const newIds: string[] = [];
        let changedInMode = false;

        for (const id of mode.contentIds) {
          if (contentIdSet.has(id)) {
            // 존재하면 그대로
            newIds.push(id);
            continue;
          }

          // 2) 누락된 id 처리: 만약 'w-...' 형식이면 's-...'로 시도해본다
          if (typeof id === "string" && id.startsWith("w-")) {
            const candidate = id.replace(/^w-/, "s-");
            if (sentenceIdSet.has(candidate)) {
              // sentence가 있으면 그 sentence 기반의 generatedWorkbooks로 치환
              const gList = genBySentence.get(candidate) || [];
              if (gList.length > 0) {
                for (const g of gList) newIds.push(g.id);
                changedInMode = true;
                continue;
              } else {
                // sentence는 있으나 generatedWorkbooks가 없으면 그냥 push sentence id (fallback)
                newIds.push(candidate);
                changedInMode = true;
                continue;
              }
            }
          }

          // 3) 마지막 fallback: id가 없고 대응 못하면 무시(로깅)
          console.warn(
            `ensureLearningPlanHasWorkbooks: missing contentId "${id}" in pack ${data.id}, day ${day.day}.`
          );
          // don't push missing id
          changedInMode = true;
        } // end for contentIds

        if (changedInMode) {
          mode.contentIds = newIds;
          mutated = true;
          console.log(
            `Patched mode for day ${day.day} (type=${mode.type}): replaced missing workbook ids -> ${newIds.length} items.`
          );
        }
      } // end for mode

      // 4) 만약 workbook 모드 자체가 없고 day에 sentence ids가 있으면 새로 만들어 붙임
      const hasWorkbookMode = day.modes.some((m: any) => m.type === "workbook");
      if (!hasWorkbookMode) {
        // collect sentence ids for this day
        const sentenceIds = new Set<string>();
        for (const mode of day.modes) {
          const contentIds: string[] = mode.contentIds || mode.items || [];
          for (const cid of contentIds) {
            if (typeof cid === "string" && sentenceIdSet.has(cid))
              sentenceIds.add(cid);
            // also if it's a w-... and maps to s-..., add that
            if (typeof cid === "string" && cid.startsWith("w-")) {
              const cand = cid.replace(/^w-/, "s-");
              if (sentenceIdSet.has(cand)) sentenceIds.add(cand);
            }
          }
        }

        if (sentenceIds.size > 0) {
          const genIds: string[] = [];
          for (const sid of sentenceIds) {
            const arr = genBySentence.get(sid) || [];
            for (const g of arr) genIds.push(g.id);
          }
          if (genIds.length > 0) {
            day.modes.push({
              type: "workbook",
              displayName: "워크북 (자동생성)",
              contentIds: genIds,
            });
            mutated = true;
            console.log(
              `Added runtime workbook mode to day ${day.day} with ${genIds.length} generated items.`
            );
          }
        }
      }
    } // end for days

    if (mutated) {
      console.log(
        "🔧 ensureLearningPlanHasWorkbooks: learningPlan patched for pack",
        data.id
      );
    }
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

  getContentsByIds(
    packData: PackDataWithGenerated,
    ids: string[]
  ): ContentItem[] {
    const contentMap = new Map(packData.contents.map((c) => [c.id, c]));
    // generatedWorkbooks도 맵으로
    const genMap = new Map(
      (packData.generatedWorkbooks || []).map((g) => [g.id, g])
    );
    return ids
      .map((id) => contentMap.get(id) ?? genMap.get(id))
      .filter(Boolean) as ContentItem[];
  }

  getAllWorkbooks(packData: PackDataWithGenerated) {
    const orig = packData.contents.filter(
      (c) => c.type === "workbook"
    ) as any[];
    const gen = packData.generatedWorkbooks || [];
    return [...orig, ...gen];
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

// dev helper: expose for debug console
if (process.env.NODE_ENV !== "production") {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  (window as any).packDataService = packDataService;
}
