// src/shared/services/packDataService.ts
import type { PackData, ContentItem, DayPlan } from "@/types";
import {
  generateWorkbookFromSentence, // 레거시 유지 (다른 팩에서 사용할 수 있어 보관)
  GeneratedWorkbook,
  shouldGenerateWorkbook,
} from "@/shared/utils/packUtils";
import { buildWorkbookForDayFromPack } from "@/shared/services/workbook.builder"; // 새 빌더

type PackDataWithGenerated = PackData & {
  generatedWorkbooks?: GeneratedWorkbook[];
};

interface PackRegistry {
  availablePacks: Array<{ id: string; enabled: boolean; priority: number }>;
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

  async loadPackRegistry(): Promise<PackRegistry> {
    if (this.registryCache) return this.registryCache;
    if (this.loadingPromises.has("registry"))
      return this.loadingPromises.get("registry")!;

    const promise = fetch("/data/packs/registry.json")
      .then((response) => {
        if (!response.ok) throw new Error("Pack registry not found");
        return response.json();
      })
      .then((registry: PackRegistry) => {
        this.registryCache = registry;
        this.loadingPromises.delete("registry");
        return registry;
      })
      .catch((error) => {
        console.error("Failed to load pack registry:", error);
        this.loadingPromises.delete("registry");
        const fallback: PackRegistry = {
          availablePacks: [
            { id: "real-voca-basic", enabled: true, priority: 1 },
            { id: "everyday-convo-3days", enabled: true, priority: 2 },
          ],
          version: "1.0.0",
          lastUpdated: new Date().toISOString(),
        };
        this.registryCache = fallback;
        return fallback;
      });

    this.loadingPromises.set("registry", promise);
    return promise;
  }

  async getAvailablePacks(): Promise<PackMetadata[]> {
    try {
      const registry = await this.loadPackRegistry();
      const enabled = registry.availablePacks
        .filter((p) => p.enabled)
        .sort((a, b) => a.priority - b.priority);

      const metas = await Promise.allSettled(
        enabled.map(async (p) => {
          if (this.metadataCache.has(p.id))
            return this.metadataCache.get(p.id)!;
          try {
            const data = await this.loadPackData(p.id);
            const meta: PackMetadata = {
              id: data.id,
              title: data.title,
              subtitle: data.subtitle,
              description: data.description,
              level: data.level,
              tags: data.tags,
              totalDays: data.learningPlan.totalDays,
              enabled: p.enabled,
              priority: p.priority,
            };
            this.metadataCache.set(p.id, meta);
            return meta;
          } catch {
            return null as any;
          }
        })
      );

      return metas
        .filter(
          (r): r is PromiseFulfilledResult<PackMetadata> =>
            r.status === "fulfilled" && !!r.value
        )
        .map((r) => r.value);
    } catch {
      return [];
    }
  }

  // 새 빌더 기반: 조건부 워크북 생성
  private ensureConditionalWorkbooks(data: PackDataWithGenerated) {
    if (!data.learningPlan?.days) return;

    const generated: GeneratedWorkbook[] = [];

    for (const dayPlan of data.learningPlan.days) {
      if (!shouldGenerateWorkbook(dayPlan, dayPlan.day)) continue;

      // 빌더가 PackData와 day를 받아 안전 옵션이 포함된 워크북 아이템을 생성
      const items = buildWorkbookForDayFromPack(data, dayPlan.day, 4);

      if (items.length === 0) continue;

      // contents에 유형화된 workbook 컨텐츠로 주입 + generatedWorkbooks 유지
      // packDataService.ts에서
      for (const it of items) {
        const gen: GeneratedWorkbook = {
          id: `wb-${it.id}`, // ← 여기도 동일하게 수정
          question: it.question ?? (it as any).sentence ?? "",
          options: it.options ?? [],
          correctAnswer: (it as any).correctAnswer ?? it.answer ?? "",
          explanation: it.explanation ?? "",
          relatedSentenceId: (it as any).relatedSentenceId,
        };
        generated.push(gen);

        const content: any = {
          id: gen.id, // ← wb- 프리픽스가 적용된 ID 사용
          type: "workbook",
          category: "auto-generated",
          question: gen.question,
          options: gen.options,
          correctAnswer: gen.correctAnswer,
          answer: gen.correctAnswer,
          explanation: gen.explanation,
          relatedSentenceId: gen.relatedSentenceId,
        };
        data.contents.push(content);
      }

      // dayPlan의 workbook 모드 contentIds 갱신
      const wbMode = dayPlan.modes?.find((m: any) => m.type === "workbook");
      if (wbMode?.contentIds) wbMode.contentIds.push(...items.map((w) => w.id));
    }

    data.generatedWorkbooks = generated;
  }

  async loadPackData(packId: string): Promise<PackData> {
    if (this.cache.has(packId)) return this.cache.get(packId)!;
    if (this.loadingPromises.has(packId))
      return this.loadingPromises.get(packId)!;

    const candidates = [`/data/packs/${packId}.min.json`];

    const tryFetchSequential = async () => {
      let lastErr: any = null;
      for (const url of candidates) {
        try {
          const resp = await fetch(url);
          if (!resp.ok) {
            lastErr = new Error(`Fetch ${url} failed (${resp.status})`);
            continue;
          }
          const raw: PackDataWithGenerated = await resp.json();

          if (!raw.id || !raw.title || !raw.contents || !raw.learningPlan) {
            throw new Error(
              `Invalid pack data structure for ${packId} at ${url}`
            );
          }

          const normalizedContents =
            raw.contents?.map((item: any) => {
              if (item.type === "workbook") {
                return { ...item, answer: item.answer || item.correctAnswer };
              }
              return item;
            }) || [];

          const enhanced: PackDataWithGenerated = {
            ...raw,
            contents: normalizedContents,
          };
          return { data: enhanced, url };
        } catch (e) {
          lastErr = e;
        }
      }
      throw lastErr;
    };

    const promise = tryFetchSequential()
      .then(({ data }) => {
        try {
          this.ensureConditionalWorkbooks(data); // 빌더 호출 지점
          this.ensureLearningPlanIntegrity(data); // 후처리
        } catch (e) {
          console.warn("post processing failed:", e);
        }
        this.cache.set(packId, data);
        this.loadingPromises.delete(packId);
        return data;
      })
      .catch((error) => {
        this.loadingPromises.delete(packId);
        throw error;
      });

    this.loadingPromises.set(packId, promise);
    return promise;
  }

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

      for (const mode of day.modes) {
        if (mode.type !== "workbook" || !Array.isArray(mode.contentIds))
          continue;

        const newIds: string[] = [];
        let changed = false;

        for (const id of mode.contentIds) {
          if (
            contentIdSet.has(id) ||
            (data.generatedWorkbooks || []).some((g) => g.id === id)
          ) {
            newIds.push(id);
            continue;
          }

          if (typeof id === "string" && id.startsWith("w-")) {
            const candidate = id.replace(/^w-/, "s-");
            if (sentenceIdSet.has(candidate)) {
              const gList = genBySentence.get(candidate) || [];
              if (gList.length > 0) {
                for (const g of gList) newIds.push(g.id);
                changed = true;
                continue;
              } else {
                changed = true;
                continue;
              }
            }
          }

          changed = true; // 누락된 id는 skip
        }

        if (changed) {
          mode.contentIds = newIds;
          mutated = true;
        }
      }
    }

    if (mutated) {
      // 로그만
    }
  }

  async isPackAvailable(packId: string): Promise<boolean> {
    try {
      const registry = await this.loadPackRegistry();
      return registry.availablePacks.some((p) => p.id === packId && p.enabled);
    } catch {
      return false;
    }
  }

  async inferRecentPackId(): Promise<string | null> {
    try {
      const available = await this.getAvailablePacks();
      if (available.length === 0) return null;

      const raw = localStorage.getItem("study-progress-v6");
      if (!raw) return available[0].id;

      const progress = JSON.parse(raw);
      const recent = Object.keys(progress.state?.progress || {})
        .filter((id) => available.some((p) => p.id === id))
        .sort((a, b) => {
          const aTime = progress.state.progress[a]?.lastStudiedAt || "0";
          const bTime = progress.state.progress[b]?.lastStudiedAt || "0";
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        })[0];

      return recent || available[0].id;
    } catch {
      return null;
    }
  }

  hasWorkbookModeForDay(packData: PackData, day: number): boolean {
    const dayPlan = this.getDayPlan(packData, day);
    if (!dayPlan) return false;
    const wb = dayPlan.modes?.find((m: any) => m.type === "workbook");
    return !!(wb && Array.isArray(wb.contentIds) && wb.contentIds.length > 0);
  }

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
      .map((id, index) => {
        // 원본 컨텐츠 우선 검색
        const originalContent = contentMap.get(id);
        if (originalContent) {
          return originalContent;
        }

        // 원본이 없을 경우만 생성된 워크북에서 검색
        const generatedContent = genMap.get(id);
        if (!generatedContent) {
          console.log(`❌ Missing content for ID: ${id} at index ${index}`);
        }
        return generatedContent;
      })
      .filter(Boolean) as ContentItem[];
  }

  getAllWorkbooks(packData: PackDataWithGenerated) {
    const orig = packData.contents.filter(
      (c) => c.type === "workbook"
    ) as any[];
    const gen = packData.generatedWorkbooks || [];
    return [...orig, ...gen];
  }

  clearCache(): void {
    this.cache.clear();
    this.metadataCache.clear();
    this.registryCache = null;
    this.loadingPromises.clear();
  }

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

if (process.env.NODE_ENV !== "production") {
  // @ts-ignore
  (window as any).packDataService = packDataService;
}
