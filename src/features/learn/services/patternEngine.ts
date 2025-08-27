// src/features/learn/services/patternEngine.ts
import { PATTERN_SCHEMAS } from "./patternSchemas";
import type {
  PatternSchema,
  Lexeme,
  POS,
  LangTag,
} from "../types/patternCore.types";
import { useLexiconStore } from "@/stores/lexiconStore";
import { inflectVerb } from "./inflector";
import { realizeNoun } from "./nounInflector";

export type GenerateParams = {
  schemaIds?: string[]; // 선택 스키마
  tags?: LangTag[]; // 상황/장소 태그 필터
  limit?: number; // 최대 생성 수
  chosenLexemeIds?: string[]; // 사용자가 지정한 단어 id들(선택 슬롯 고정)
};

export type Generated = {
  text: string;
  korean: string;
  used: string[];
  schemaId: string;
  canWrite: boolean;
};

function realize(
  surface: string,
  slots: PatternSchema["slots"],
  pick: (pos: POS, name: string) => Lexeme | null
) {
  let en = surface;
  let ko = surface;
  for (const s of slots) {
    const lx = pick(s.accept, s.name);
    if (lx?.pos === "NOUN" || s.accept.includes("NOUN" as any)) {
      const num = s.nounNumber ?? "singular";
      const word = lx
        ? realizeNoun(
            {
              en: lx.en,
              irregularPlural: lx.irregularPlural,
              countability: lx.countability,
            },
            num
          )
        : "";
      en = en.replace(`[${s.name}]`, word);
      ko = ko.replace(`[${s.name}]`, lx?.ko ?? "");
    } else {
      // 기존 동사/기타 슬롯 처리(동사는 inflector 사용)
      en = en.replace(`[${s.name}]`, lx?.en ?? "");
      ko = ko.replace(`[${s.name}]`, lx?.ko ?? "");
    }
  }
  en = en.replace(/\ba ([aeiou])/gi, "an $1");
  en = en.charAt(0).toUpperCase() + en.slice(1);
  return { en, ko };
}

export function generatePatterns(params: GenerateParams): Generated[] {
  const { schemaIds, tags = [], limit = 20, chosenLexemeIds = [] } = params;
  const words = useLexiconStore.getState().words;
  const chosen = new Map(
    chosenLexemeIds.map(
      (id) => [id, words.find((w) => w.id === id)].filter(Boolean) as any
    )
  );

  const pool = words;
  const lexByPos = (pos: POS, prefer?: LangTag[]) => {
    let cands = pool.filter((w) => w.pos === pos);
    if (prefer?.length) {
      cands = cands
        .map((w) => ({
          w,
          score: w.tags.some((t) => prefer.includes(t)) ? 1 : 0,
        }))
        .sort((a, b) => b.score - a.score)
        .map((x) => x.w);
    }
    return cands;
  };

  const templates = (
    schemaIds?.length
      ? PATTERN_SCHEMAS.filter((s) => schemaIds.includes(s.id))
      : PATTERN_SCHEMAS.filter((s) =>
          tags.length ? tags.includes(s.category) : true
        )
  ).slice(0, 12);

  const out: Generated[] = [];
  for (const t of templates) {
    const used: string[] = [];
    const pick = (pos: POS, name: string) => {
      // chosen에 슬롯명이 매칭되는 id가 있다면 우선 사용(간단화를 위해 생략 가능)
      const list = lexByPos(
        pos,
        t.category ? [t.category as LangTag] : undefined
      );
      const chosenFirst = list.find((w) => chosen.has(w.id)) ?? list ?? null;
      if (chosenFirst) used.push(chosenFirst.id);
      return chosenFirst;
    };
    const { en, ko } = realize(t.surface, t.slots, pick);
    out.push({ text: en, korean: ko, used, schemaId: t.id, canWrite: false });
    if (out.length >= limit) break;
  }
  // 중복 제거
  const seen = new Set<string>();
  return out.filter((g) =>
    seen.has(g.text.toLowerCase())
      ? false
      : (seen.add(g.text.toLowerCase()), true)
  );
}
