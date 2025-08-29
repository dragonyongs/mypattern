// src/features/learn/services/patternEngine.ts

import { getSchemas } from "./patternSchemaRegistry";
import type {
  PatternSchema,
  Lexeme,
  POS,
  LangTag,
  GramNumber,
} from "../types/patternCore.types";
import { useLexiconStore } from "@/stores/lexiconStore";
import { inflectVerb } from "./inflector";
import { inflectKoreanVerb } from "./koreanInflector";
import { getWordCategory } from "./wordCategories";

// ===== Types =====
export type GenerateParams = {
  schemaIds?: string[];
  tags?: LangTag[];
  limit?: number;
  chosenLexemeIds?: string[];
};

export type Generated = {
  text: string;
  korean: string;
  used: string[];
  schemaId: string;
  canWrite: boolean;
  confidence?: number;
};

// ===== Optional: noun inflection (kept only if needed later) =====
function inflectNoun(
  lemma: string,
  number: GramNumber,
  irregularPlural?: string
): string {
  if (number === "singular") return lemma;
  if (irregularPlural) return irregularPlural;
  if (/(s|sh|ch|x|z)$/i.test(lemma)) return lemma + "es";
  if (/[aeiou]y$/i.test(lemma)) return lemma + "s";
  if (/y$/i.test(lemma)) return lemma.slice(0, -1) + "ies";
  if (/fe$/i.test(lemma)) return lemma.slice(0, -2) + "ves";
  if (/f$/i.test(lemma)) return lemma.slice(0, -1) + "ves";
  return lemma + "s";
}

// ===== Core: realize =====
// - Supports both [SLOT] and {{SLOT}} by normalizing to [SLOT].
// - Honors slot.required (optional slot removal with cleanup).
// - Applies semanticConstraint using getWordCategory.
// - Handles basic verb inflection placeholders.
function realize(
  surface: string,
  koSurface: string | undefined,
  slots: PatternSchema["slots"],
  pick: (pos: POS | POS[], name: string, constraint?: string) => Lexeme | null,
  schemaId: string
): { en: string; ko: string; usedIds: string[] } | null {
  let en = normalizeSlotFormat(surface);
  let ko = normalizeSlotFormat(koSurface || surface);

  const used: Lexeme[] = [];
  const usedIds: string[] = [];

  for (const slot of slots) {
    const accept = Array.isArray(slot.accept) ? slot.accept : [slot.accept];

    // 1) semanticConstraint 우선 적용
    let lex: Lexeme | null = null;
    if (slot.semanticConstraint) {
      const words = useLexiconStore.getState().words;
      const filtered = words
        .filter((w) => accept.includes(w.pos))
        .filter((w) =>
          getWordCategory(w.en).includes(slot.semanticConstraint as string)
        );
      lex = filtered ?? null;
    }

    // 2) 일반 pick
    if (!lex) {
      lex = pick(accept, slot.name, slot.semanticConstraint);
    }

    // 3) 검증 및 optional 처리
    if (!lex || !lex.en || !lex.ko) {
      // required가 true 또는 undefined이면 실패
      if (slot.required !== false) return null;
      // optional 이면 안전 제거
      en = removeOptionalSlot(en, slot.name);
      ko = removeOptionalSlot(ko, slot.name);
      continue;
    }

    used.push(lex);
    usedIds.push(lex.id || `${lex.en}_${lex.pos}`);

    // 4) 치환 값 준비
    let enWord = lex.en;
    let koWord = lex.ko;
    if (lex.pos === "VERB" && slot.morph) {
      enWord = inflectVerb(lex.en, slot.morph);
      koWord = inflectKoreanVerb(lex.ko, slot.morph);
    }

    // 5) [SLOT] 일괄 치환
    const re = new RegExp(`\\[${escapeRegExp(slot.name)}\\]`, "g");
    en = en.replace(re, enWord);
    ko = ko.replace(re, koWord);
  }

  // 6) 미완성 슬롯 방지
  if (hasUnfilledSlots(en) || hasUnfilledSlots(ko)) return null;

  // 7) 의미/문법 1차 체크
  if (!validateSemanticCompatibility(used, schemaId)) return null;
  if (!basicGrammarCheck(en)) return null;

  // 8) 자연스러운 영어 보정
  en = applyNaturalEnglishRules(en);
  en = applyBasicGrammarRules(en);

  return { en, ko, usedIds };
}

// ===== Public: generatePatterns =====
export function generatePatterns(params: GenerateParams): Generated[] {
  const { schemaIds, tags = [], limit = 20, chosenLexemeIds = [] } = params;

  const allSchemas = getSchemas();
  const templates = schemaIds?.length
    ? allSchemas.filter((s) => schemaIds.includes(s.id))
    : allSchemas.filter((s) =>
        tags.length ? tags.includes(s.category) : true
      );

  const words = useLexiconStore.getState().words;
  const chosenMap = new Map(
    chosenLexemeIds
      .map((id) => words.find((w) => w.id === id))
      .filter(Boolean)
      .map((w) => [w!.id, w!])
  );

  const lexByPos = (pos: POS | POS[], prefer?: LangTag): Lexeme[] => {
    const accepts = Array.isArray(pos) ? pos : [pos];
    let list = words.filter((w) => accepts.includes(w.pos));
    if (prefer) {
      list = list
        .map((w) => ({ w, score: w.tags?.includes(prefer) ? 1 : 0 }))
        .sort((a, b) => b.score - a.score)
        .map((x) => x.w);
    }
    return list;
  };

  const out: Generated[] = [];

  for (const t of templates) {
    const usedIdsLocal: string[] = [];

    const pick = (
      pos: POS | POS[],
      name: string,
      constraint?: string
    ): Lexeme | null => {
      const accepts = Array.isArray(pos) ? pos : [pos];
      let list: Lexeme[] = [];

      accepts.forEach((p) => {
        list.push(...lexByPos(p, t.category));
      });

      // 시맨틱 제약
      if (constraint) {
        list = list.filter((w) => getWordCategory(w.en).includes(constraint));
      }

      // 이미 선택된 단어는 후순위
      const seen = new Set(usedIdsLocal);
      list = list.filter((w) => !seen.has(w.id));

      // chosen 우선
      const firstChosen = list.find((w) => chosenMap.has(w.id));
      const selected = firstChosen ?? list ?? null;
      if (selected) usedIdsLocal.push(selected.id);
      return selected ?? null;
    };

    const result = realize(t.surface, t.koSurface, t.slots, pick, t.id);
    if (result) {
      out.push({
        text: result.en,
        korean: result.ko,
        used: result.usedIds,
        schemaId: t.id,
        canWrite: false,
        confidence: 1,
      });
      if (out.length >= limit) break;
    }
  }

  // 중복 제거
  const seen = new Set<string>();
  return out
    .filter((g) =>
      seen.has(g.text.toLowerCase()) ? false : seen.add(g.text.toLowerCase())
    )
    .map((g, i) => ({ ...g, text: g.text, korean: g.korean }));
}

// ===== Helpers =====
function normalizeSlotFormat(text: string): string {
  // unify {{SLOT}} -> [SLOT]
  return text.replace(/\{\{(\w+)\}\}/g, "[$1]");
}

function removeOptionalSlot(text: string, slotName: string): string {
  const slotRe = new RegExp(`\\s*\\[${escapeRegExp(slotName)}\\]\\s*`, "g");
  return text
    .replace(slotRe, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function hasUnfilledSlots(text: string): boolean {
  // still contains [SLOT]-like tokens
  return /\[[A-Za-z_]+\]/.test(text);
}

function validateSemanticCompatibility(
  words: Lexeme[],
  schemaId: string
): boolean {
  // 간단 명시적 금지 조합
  const invalidCombos = [
    {
      v: ["eat", "eats", "ate"],
      o: ["water", "coffee", "tea", "milk", "juice"],
    },
    {
      v: ["drink", "drinks", "drank"],
      o: ["bread", "sandwich", "rice", "meat", "apple"],
    },
    { v: ["go", "goes", "went"], o: ["teeth", "hair", "eyes"] },
  ];
  const verbs = words
    .filter((w) => w.pos === "VERB")
    .map((w) => w.en.toLowerCase());
  const objs = words
    .filter((w) => w.pos === "ITEM" || w.pos === "PLACE" || w.pos === "PERSON")
    .map((w) => w.en.toLowerCase());

  for (const rule of invalidCombos) {
    if (
      verbs.some((v) => rule.v.includes(v)) &&
      objs.some((o) => rule.o.includes(o))
    ) {
      return false;
    }
  }
  return true;
}

function basicGrammarCheck(text: string): boolean {
  const fails = [/\b(a|an)\s+(a|an)\b/i, /\s{2,}/];
  return !fails.some((re) => re.test(text));
}

function applyNaturalEnglishRules(text: string): string {
  let t = text;
  t = t
    .replace(/\bat the home\b/gi, "at home")
    .replace(/\bto the home\b/gi, "home")
    .replace(/\bgo to home\b/gi, "go home")
    .replace(/\bwent to home\b/gi, "went home")
    .replace(/\bgoing to home\b/gi, "going home");
  t = t
    .replace(/\bgo to the school\b/gi, "go to school")
    .replace(/\bat the school\b/gi, "at school");
  t = t
    .replace(/\bgo to the work\b/gi, "go to work")
    .replace(/\bat the work\b/gi, "at work");
  t = t
    .replace(/\bgo to the church\b/gi, "go to church")
    .replace(/\bgo to the bed\b/gi, "go to bed");
  return t;
}

function applyBasicGrammarRules(text: string): string {
  let t = text.replace(/\ba ([aeiou])/gi, "an $1");
  t = t.charAt(0).toUpperCase() + t.slice(1);
  if (!/[.!?]$/.test(t)) t += ".";
  return t;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export { realize };
