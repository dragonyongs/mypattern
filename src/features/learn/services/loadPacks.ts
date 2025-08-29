// src/features/learn/services/loadPacks.ts
import packIndex from "@/data/packs/pack-index.json";
import { useLexiconStore } from "@/stores/lexiconStore";
import { registerSchemas } from "./patternSchemaRegistry";
import { PATTERN_SCHEMAS_SEED } from "./patternSchemas";

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
  registerSchemas(PATTERN_SCHEMAS_SEED);
  const api = useLexiconStore.getState();

  for (const p of packIndex.packs) {
    const key = `/src/data/packs/${p.file}`;
    const mod = (modules as any)[key] as Pack | undefined;
    if (!mod) {
      console.warn(`[packs] not found in bundle: ${p.file}`);
      continue;
    }
    const pack: Pack = mod;
    const size = Array.isArray(pack.lexemes) ? pack.lexemes.length : 0;

    if (size > 0) api.upsertGlobalWords(pack.lexemes as any);

    if (Array.isArray(pack.patterns) && pack.patterns.length) {
      registerSchemas(pack.patterns as any);
    }
    console.log(
      `[packs] loaded ${p.packId} v${p.version} - words: ${size}, patterns: ${
        pack.patterns?.length ?? 0
      }`
    );
  }
}
