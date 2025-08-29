// src/features/learn/services/loadPacks.ts (수정)
import packIndex from "@/data/packs/pack-index.json";
import { useLexiconStore } from "@/stores/lexiconStore";
import { registerSchemas } from "./patternSchemaRegistry";
import { PATTERN_SCHEMAS } from "./patternSchemas";

type Pack = {
  packId: string;
  version?: string;
  domains?: string[];
  category: string;
  size?: number;
  lexemes: Array<{ en: string; ko: string; pos: string; tags?: string[] }>;
  patterns?: any[];
};

const modules = import.meta.glob("@/data/packs/**/*.json", {
  eager: true,
  import: "default",
});

export async function loadPacksOnce() {
  registerSchemas(PATTERN_SCHEMAS);
  const api = useLexiconStore.getState();

  // **upsertGlobalWords 메서드 존재 확인**
  if (!api.upsertGlobalWords) {
    console.error(
      "❌ upsertGlobalWords 메서드가 없습니다. lexiconStore를 확인하세요."
    );
    return;
  }

  let totalLoaded = 0;

  for (const p of packIndex.packs) {
    const key = `/src/data/packs/${p.file}`;
    const mod = (modules as any)[key] as Pack | undefined;

    if (!mod) {
      console.warn(`[packs] 번들에서 찾을 수 없음: ${p.file} - 건너뜀`);
      continue;
    }

    try {
      const pack: Pack = mod;
      const size = Array.isArray(pack.lexemes) ? pack.lexemes.length : 0;

      if (size > 0) {
        api.upsertGlobalWords(pack.lexemes as any);
        totalLoaded += size;
      }

      if (Array.isArray(pack.patterns) && pack.patterns.length) {
        registerSchemas(pack.patterns as any);
      }

      console.log(
        `[packs] ✅ 로드 완료: ${p.packId} v${
          p.version
        } - words: ${size}, patterns: ${pack.patterns?.length ?? 0}`
      );
    } catch (error) {
      console.error(`[packs] ❌ 로드 실패: ${p.file}`, error);
    }
  }

  console.log(`🎯 총 ${totalLoaded}개 단어 로드 완료`);
}
