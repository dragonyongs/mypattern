// src/shared/services/packDataService.ts
import type { PackData, ContentItem, DayPlan } from "@/types";
import {
  generateWorkbookFromSentence,
  GeneratedWorkbook,
  shouldGenerateWorkbook,
  generateWorkbookForDay,
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

  // 🔥 조건부 워크북 생성 로직 (기존 ensureGeneratedWorkbooks 대체)
  private ensureConditionalWorkbooks(data: PackDataWithGenerated) {
    if (!data.learningPlan?.days) return;

    const generatedWorkbooks: GeneratedWorkbook[] = [];
    const sentences = data.contents.filter((c) => c.type === "sentence");
    const allContents = [...data.contents];

    // 각 일자별로 조건부 워크북 생성 확인
    for (const dayPlan of data.learningPlan.days) {
      if (shouldGenerateWorkbook(dayPlan, dayPlan.day)) {
        console.log(`📝 Day ${dayPlan.day}: 조건부 워크북 생성 시작`);

        // 해당 일자의 문장들로부터 워크북 생성
        const dayWorkbooks = generateWorkbookForDay(
          dayPlan,
          dayPlan.day,
          allContents,
          4
        );

        if (dayWorkbooks.length > 0) {
          generatedWorkbooks.push(...dayWorkbooks);

          // 워크북 모드의 contentIds 업데이트
          const workbookMode = dayPlan.modes?.find(
            (mode: any) => mode.type === "workbook"
          );
          if (workbookMode && Array.isArray(workbookMode.contentIds)) {
            workbookMode.contentIds.push(...dayWorkbooks.map((wb) => wb.id));
          }

          console.log(
            `📝 Day ${dayPlan.day}: ${dayWorkbooks.length}개 워크북 생성 완료`
          );
        }
      }
    }

    // 생성된 워크북들을 데이터에 추가
    if (generatedWorkbooks.length > 0) {
      data.generatedWorkbooks = generatedWorkbooks;
      console.log(
        `🧩 총 ${generatedWorkbooks.length}개의 조건부 워크북 생성 완료`
      );
    } else {
      data.generatedWorkbooks = [];
      console.log(`🧩 조건부 워크북 생성 대상 없음`);
    }
  }

  // 🔥 개선된 팩 데이터 로드
  async loadPackData(packId: string): Promise<PackData> {
    if (this.cache.has(packId)) return this.cache.get(packId)!;
    if (this.loadingPromises.has(packId))
      return this.loadingPromises.get(packId)!;

    // 시도할 후보 경로들 (우선순위)
    const candidates = [`/data/packs/${packId}.min.json`];

    const tryFetchSequential = async () => {
      let lastErr: any = null;
      for (const url of candidates) {
        try {
          console.debug(`[packDataService] trying to fetch pack:`, url);
          const resp = await fetch(url);
          if (!resp.ok) {
            lastErr = new Error(`Fetch ${url} failed (${resp.status})`);
            continue;
          }
          const rawData: PackDataWithGenerated = await resp.json();

          // 최소 유효성 검사
          if (
            !rawData.id ||
            !rawData.title ||
            !rawData.contents ||
            !rawData.learningPlan
          ) {
            throw new Error(
              `Invalid pack data structure for ${packId} at ${url}`
            );
          }

          // 🔥 컨텐츠 정규화 (workbook 타입 호환성 보장)
          const normalizedContents =
            rawData.contents?.map((item: any) => {
              if (item.type === "workbook") {
                return {
                  ...item,
                  answer: item.answer || item.correctAnswer, // 호환성 보장
                };
              }
              return item;
            }) || [];

          const enhancedData = {
            ...rawData,
            contents: normalizedContents,
          };

          return { data: enhancedData, url };
        } catch (e) {
          lastErr = e;
          console.warn(`[packDataService] fetch failed for ${url}:`, e);
        }
      }
      throw lastErr;
    };

    const promise = tryFetchSequential()
      .then(({ data, url }) => {
        try {
          // 🔥 조건부 워크북 생성 (기존 강제 생성 로직 대체)
          this.ensureConditionalWorkbooks(data);

          // 🔥 학습 플랜 후처리 (조건부)
          this.ensureLearningPlanIntegrity(data);
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

  // 🔥 학습 플랜 무결성 확보 (조건부 워크북만 처리)
  private ensureLearningPlanIntegrity(data: PackDataWithGenerated) {
    if (!data.learningPlan || !Array.isArray(data.learningPlan.days)) return;

    const genBySentence = new Map<string, GeneratedWorkbook[]>();
    for (const g of data.generatedWorkbooks || []) {
      const key = g.relatedSentenceId;
      if (!genBySentence.has(key)) genBySentence.set(key, []);
      genBySentence.get(key)!.push(g);
    }

    const contentIdSet = new Set((data.contents || []).map((c) => c.id));
    const sentenceIdSet = new Set(
      (data.contents || [])
        .filter((c) => c.type === "sentence")
        .map((s) => s.id)
    );

    let mutated = false;

    for (const day of data.learningPlan.days) {
      day.modes = day.modes || [];

      // 1) 기존 워크북 모드의 누락된 contentIds 복구
      for (const mode of day.modes) {
        if (mode.type !== "workbook" || !Array.isArray(mode.contentIds))
          continue;

        const newIds: string[] = [];
        let changedInMode = false;

        for (const id of mode.contentIds) {
          if (
            contentIdSet.has(id) ||
            (data.generatedWorkbooks || []).some((g) => g.id === id)
          ) {
            // 존재하면 그대로
            newIds.push(id);
            continue;
          }

          // 2) w-* 형식을 s-*로 변환 시도
          if (typeof id === "string" && id.startsWith("w-")) {
            const candidate = id.replace(/^w-/, "s-");
            if (sentenceIdSet.has(candidate)) {
              const gList = genBySentence.get(candidate) || [];
              if (gList.length > 0) {
                for (const g of gList) newIds.push(g.id);
                changedInMode = true;
                continue;
              } else {
                // sentence는 있으나 generatedWorkbooks가 없으면 스킵
                console.warn(
                  `No generated workbooks for sentence "${candidate}" in pack ${data.id}, day ${day.day}`
                );
                changedInMode = true;
                continue;
              }
            }
          }

          // 3) 마지막: 누락된 id는 무시
          console.warn(
            `Missing contentId "${id}" in pack ${data.id}, day ${day.day} - skipping`
          );
          changedInMode = true;
        }

        if (changedInMode) {
          mode.contentIds = newIds;
          mutated = true;
          console.log(
            `🔧 Day ${day.day} 워크북 모드 contentIds 복구: ${newIds.length}개 항목`
          );
        }
      }
    }

    if (mutated) {
      console.log("🔧 학습 플랜 무결성 복구 완료:", data.id);
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

  // 🔥 최근 사용된 팩 ID 추론
  async inferRecentPackId(): Promise<string | null> {
    try {
      const availablePacks = await this.getAvailablePacks();
      if (availablePacks.length === 0) return null;

      // localStorage에서 학습 진행 상황 확인
      const progressData = localStorage.getItem("study-progress-v6");
      if (!progressData) {
        return availablePacks[0].id;
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

  // 🔥 특정 일자에 워크북 모드가 실제로 존재하는지 확인
  hasWorkbookModeForDay(packData: PackData, day: number): boolean {
    const dayPlan = this.getDayPlan(packData, day);
    if (!dayPlan) return false;

    const workbookMode = dayPlan.modes?.find(
      (mode: any) => mode.type === "workbook"
    );
    return !!(
      workbookMode &&
      Array.isArray(workbookMode.contentIds) &&
      workbookMode.contentIds.length > 0
    );
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
