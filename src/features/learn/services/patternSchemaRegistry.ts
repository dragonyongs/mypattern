// src/features/learn/services/patternSchemaRegistry.ts
import type { PatternSchema } from "../types/patternCore.types";

const registry: PatternSchema[] = [];
const byId = new Set<string>();

export function registerSchemas(schemas: PatternSchema[] = []) {
  for (const s of schemas) {
    if (!s?.id || byId.has(s.id)) continue;
    registry.push(s);
    byId.add(s.id);
  }
}

export function getSchemas(): PatternSchema[] {
  return registry;
}

export function clearSchemas() {
  registry.length = 0;
  byId.clear();
}
