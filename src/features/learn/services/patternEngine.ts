// src/features/learn/services/patternEngine.ts
import { getSchemas } from "./patternSchemaRegistry";

import type {
  PatternSchema,
  Lexeme,
  POS,
  LangTag,
  VerbFeatures,
  UserInput,
  GramNumber,
} from "../types/patternCore.types";
import { useLexiconStore } from "@/stores/lexiconStore";
import { inflectVerb } from "./inflector";
import { inflectKoreanVerb } from "./koreanInflector";
import { applyContextualKorean } from "./contextualKoreanizer";
import { validateSemanticFit, getSuggestedVerb } from "./semanticValidator";
import { getNaturalVerb } from "./naturalVerbMapper";
import { getWordCategory, canPerformAction } from "./wordCategories";
export type GenerateParams = {
  schemaIds?: string[];
  tags?: LangTag[];
  limit?: number;
  chosenLexemeIds?: string[];
  userInput?: UserInput;
};

export type Generated = {
  text: string;
  korean: string;
  used: string[];
  schemaId: string;
  canWrite: boolean;
  confidence?: number;
};

// 명사 복수형 함수
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

function realize(
  surface: string,
  koSurface: string | undefined,
  slots: PatternSchema["slots"],
  pick: (pos: POS | POS[], name: string, constraint?: string) => Lexeme | null,
  schemaId: string
) {
  let en = surface;
  let ko = koSurface || surface;
  const slotValues: Record<
    string,
    { word: string; pos: string; lexeme: Lexeme }
  > = {};

  for (const slot of slots) {
    let lx: Lexeme | null = null;

    // ✅ 의미적 제약 조건이 있는 경우 - 우선적으로 처리
    if (slot.semanticConstraint) {
      const words = useLexiconStore.getState().words;
      const candidateWords = words.filter((w) => {
        if (!slot.accept.includes(w.pos)) return false;

        const categories = getWordCategory(w.en);
        const hasConstraint = categories.includes(slot.semanticConstraint!);

        console.log(
          `🔍 단어 "${w.en}" 카테고리: [${categories.join(", ")}], 제약조건 "${
            slot.semanticConstraint
          }" 만족: ${hasConstraint}`
        );

        return hasConstraint;
      });

      lx = candidateWords[0] || null;
      console.log(
        `🎯 ${slot.name} 제약조건(${slot.semanticConstraint}): ${candidateWords.length}개 후보 중 "${lx?.en}" 선택`
      );

      if (!lx) {
        console.warn(
          `❌ ${slot.name} 제약조건 "${slot.semanticConstraint}"을 만족하는 단어가 없음`
        );
        return null; // 제약 조건을 만족하지 않으면 패턴 생성 실패
      }
    }
    // 일반적인 경우
    else {
      lx = pick(slot.accept, slot.name);
    }

    if (!lx || !lx.en || !lx.ko) {
      console.warn(`⚠️ ${slot.name} 적절한 단어 없음`);
      return null;
    }

    let enWord = lx.en;
    let koWord = lx.ko;

    // 동사 활용
    if (lx.pos === "VERB" && slot.morph) {
      enWord = inflectVerb(lx.en, slot.morph);
      koWord = inflectKoreanVerb(lx.ko, slot.morph);
    }

    en = en.replace(`[${slot.name}]`, enWord);
    ko = ko.replace(`[${slot.name}]`, koWord);

    slotValues[slot.name] = { word: koWord, pos: lx.pos, lexeme: lx };
  }

  // 영어 문법 보정
  en = en.replace(/\ba ([aeiou])/gi, "an $1");
  en = en.charAt(0).toUpperCase() + en.slice(1);
  return { en, ko };
}

// 사용자 입력 분석
function analyzeUserInput(userInput: UserInput): LangTag[] {
  const { content } = userInput;
  const keywords = content.toLowerCase();

  const tagMappings = {
    where: ["directions"],
    go: ["directions", "daily"],
    place: ["directions"],
    hospital: ["daily"],
    school: ["school", "daily"],
    when: ["daily"],
    time: ["daily", "school"],
    today: ["daily"],
    tomorrow: ["daily"],
    meet: ["daily"],
    friend: ["daily"],
    teacher: ["school"],
    어디: ["directions"],
    만나: ["daily"],
    학교: ["school"],
    병원: ["daily"],
    시간: ["daily"],
  };

  const suggestedTags: LangTag[] = [];
  Object.entries(tagMappings).forEach(([keyword, tags]) => {
    if (keywords.includes(keyword)) {
      suggestedTags.push(...tags);
    }
  });

  return suggestedTags.length > 0 ? [...new Set(suggestedTags)] : ["daily"];
}

// 신뢰도 계산
function calculateConfidence(
  userInput: UserInput,
  result: { en: string; ko: string },
  schema: PatternSchema
): number {
  let confidence = 0.5;
  const content = userInput.content.toLowerCase();
  const text = result.en.toLowerCase();
  const korean = result.ko.toLowerCase();

  const keywords = content.split(/\s+/);
  for (const keyword of keywords) {
    if (text.includes(keyword) || korean.includes(keyword)) {
      confidence += 0.2;
    }
  }

  if (userInput.targetLanguage === "en" && schema.category === "daily") {
    confidence += 0.1;
  }

  return Math.min(confidence, 1.0);
}

// 메인 생성 함수
export function generatePatterns(params: GenerateParams): Generated[] {
  const {
    schemaIds,
    tags = [],
    limit = 20,
    chosenLexemeIds = [],
    userInput,
  } = params;

  const words = useLexiconStore.getState().words;

  // 사용자 입력 기반 태그 추천
  let finalTags = tags;
  if (userInput && tags.length === 0) {
    finalTags = analyzeUserInput(userInput);
    console.log(`🤖 사용자 입력에서 추천된 태그:`, finalTags);
  }

  const validWords = words.filter(
    (w) =>
      w.en && w.en.trim().length > 0 && w.ko && w.ko.trim().length > 0 && w.pos
  );

  console.log(
    `📊 전체 ${words.length}개 중 유효한 단어: ${validWords.length}개`
  );

  const getWordsForPos = (
    acceptedPos: POS | POS[],
    usedIds: string[] = []
  ): Lexeme[] => {
    const posArray = Array.isArray(acceptedPos) ? acceptedPos : [acceptedPos];
    return validWords.filter(
      (w) => posArray.includes(w.pos) && !usedIds.includes(w.id)
    );
  };

  // 템플릿 소스 전환
  const all = getSchemas();
  const templates = schemaIds?.length
    ? all.filter((s) => schemaIds.includes(s.id))
    : all.filter((s) =>
        finalTags.length ? finalTags.includes(s.category) : true
      );

  console.log(`📋 사용할 패턴 템플릿: ${templates.length}개`);

  const out: Generated[] = [];

  for (const t of templates) {
    console.log(`🎯 패턴 "${t.id}" 시도 중...`);

    const usedInThisPattern: string[] = [];
    let canCreatePattern = true;

    // 각 슬롯별로 사용 가능한 단어 체크
    for (const slot of t.slots) {
      const availableForSlot = getWordsForPos(slot.accept, usedInThisPattern);
      if (availableForSlot.length === 0) {
        console.log(
          `⏭️ ${t.id} 건너뛰기 - ${slot.name} 슬롯에 사용할 단어 없음`
        );
        canCreatePattern = false;
        break;
      }
    }

    if (!canCreatePattern) continue;

    const pick = (
      pos: POS | POS[],
      name: string,
      constraint?: string
    ): Lexeme | null => {
      let available = getWordsForPos(pos, usedInThisPattern);

      // ✅ 제약 조건이 있으면 필터링
      if (constraint) {
        available = available.filter((w) => {
          const categories = getWordCategory(w.en);
          return categories.includes(constraint);
        });

        console.log(
          `🔍 ${name}(${constraint}) 제약 후 후보: ${available.length}개`
        );
      }

      if (available.length === 0) {
        console.warn(`❌ ${name} - 사용 가능한 단어 없음`);
        return null;
      }

      const selected = available[0];
      usedInThisPattern.push(selected.id);
      console.log(`✅ ${name} -> "${selected.en}"(${selected.ko}) 선택`);
      return selected;
    };

    const result = realize(t.surface, t.koSurface, t.slots, pick, t.id);
    if (result) {
      const confidence = userInput
        ? calculateConfidence(userInput, result, t)
        : 1.0;

      console.log(`🎉 패턴 생성 성공: "${result.en}" / "${result.ko}"`);
      out.push({
        text: result.en,
        korean: result.ko,
        used: usedInThisPattern,
        schemaId: t.id,
        canWrite: false,
        confidence,
      });
    }

    if (out.length >= limit) break;
  }

  // 신뢰도 순으로 정렬
  out.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));

  console.log(`🏁 최종 생성된 패턴: ${out.length}개`);
  return out;
}
