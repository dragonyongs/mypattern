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
import { getWordCategory } from "./wordCategories";
import coreVocabulary from "@/data/core-vocabulary.json";

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
  const usedWords: Lexeme[] = [];

  // 1단계: 슬롯 채우기
  for (const slot of slots) {
    console.log(
      `🎯 슬롯 "${slot.name}" 처리 시작 (required: ${slot.required})`
    );
    let lx: Lexeme | null = null;

    if (slot.semanticConstraint) {
      const words = useLexiconStore.getState().words;
      const candidateWords = words.filter((w) => {
        if (!slot.accept.includes(w.pos)) return false;
        const categories = getWordCategory(w.en);
        const hasConstraint = categories.includes(slot.semanticConstraint!);
        return hasConstraint;
      });

      lx = candidateWords[0] || null;
      if (!lx) {
        console.warn(
          `❌ ${slot.name} 제약조건 "${slot.semanticConstraint}"을 만족하는 단어가 없음`
        );
        return null;
      }
    } else {
      lx = pick(slot.accept, slot.name);
    }

    // ✅ 강화된 슬롯 검증
    if (!lx || !lx.en || !lx.ko) {
      // 필수 슬롯인 경우 패턴 생성 실패
      if (slot.required !== false) {
        // required가 true이거나 undefined인 경우
        console.error(
          `❌ 필수 슬롯 "${slot.name}"에 적절한 단어가 없음 - 패턴 생성 실패`
        );
        return null;
      }

      // 선택적 슬롯인 경우 해당 슬롯 부분을 제거
      console.warn(`⚠️ 선택적 슬롯 "${slot.name}" 생략`);
      en = en.replace(new RegExp(`\\s*\\[?${slot.name}\\]?\\s*`, "g"), "");
      ko = ko.replace(new RegExp(`\\s*\\[?${slot.name}\\]?\\s*`, "g"), "");
      continue;
    }

    usedWords.push(lx);

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
    console.log(`🔄 슬롯 치환: [${slot.name}] → "${enWord}" (${koWord})`);
  }

  // ✅ 2단계: 생성 후 검증 - 여기가 핵심!

  // 2-1. 슬롯 미완성 검증
  if (hasUnfilledSlots(en)) {
    console.warn(`❌ 슬롯 미완성: ${en}`);
    return null;
  }

  // 2-2. 의미적 호환성 검증
  if (!validateSemanticCompatibility(usedWords, schemaId)) {
    console.warn(`❌ 의미적 호환성 실패: ${en}`);
    return null;
  }

  // 2-3. 문법적 기본 검증
  if (!basicGrammarCheck(en)) {
    console.warn(`❌ 기본 문법 오류: ${en}`);
    return null;
  }

  // 영어 문법 보정
  en = en.replace(/\ba ([aeiou])/gi, "an $1");
  en = en.charAt(0).toUpperCase() + en.slice(1);

  // ✅ 자연스러운 영어 표현 후처리 추가
  en = applyNaturalEnglishRules(en);

  console.log(`✅ 검증 통과: "${en}" / "${ko}"`);
  return { en, ko };

  // 새로운 함수 추가
  function applyNaturalEnglishRules(text: string): string {
    let result = text;

    // "home" 관련 자연스러운 표현
    result = result.replace(/\bat the home\b/gi, "at home");
    result = result.replace(/\bto the home\b/gi, "home");
    result = result.replace(/\bgo to home\b/gi, "go home");
    result = result.replace(/\bwent to home\b/gi, "went home");
    result = result.replace(/\bgoing to home\b/gi, "going home");

    // "school" 관련 (일부는 "the"가 필요하지 않음)
    result = result.replace(/\bgo to the school\b/gi, "go to school");
    result = result.replace(/\bat the school\b/gi, "at school");

    // "work/office" 관련
    result = result.replace(/\bgo to the work\b/gi, "go to work");
    result = result.replace(/\bat the work\b/gi, "at work");

    return result;
  }
}

// ✅ 새로운 검증 함수들 추가 (realize 함수 아래에)

function hasUnfilledSlots(text: string): boolean {
  // 대괄호로 둘러싸인 대문자 슬롯 감지
  const slotPattern = /\[[A-Z_]+\]/g;
  const matches = text.match(slotPattern);

  if (matches) {
    console.error(`🚫 발견된 빈 슬롯들: ${matches.join(", ")} in "${text}"`);
    return true;
  }

  // 추가 검사: 대문자로만 이루어진 단어들 (TIME, PLACE 등)
  const upperCaseWords = text.match(/\b[A-Z]{2,}\b/g);
  if (upperCaseWords) {
    const suspiciousWords = upperCaseWords.filter((word) =>
      ["TIME", "PLACE", "PERSON", "ITEM", "VERB", "OBJECT"].includes(word)
    );

    if (suspiciousWords.length > 0) {
      console.error(
        `🚫 의심스러운 대문자 단어들: ${suspiciousWords.join(
          ", "
        )} in "${text}"`
      );
      return true;
    }
  }

  return false;
}

function validateSemanticCompatibility(
  usedWords: Lexeme[],
  schemaId: string
): boolean {
  const verbs = usedWords.filter((w) => w.pos === "VERB");
  const objects = usedWords.filter(
    (w) => w.pos === "ITEM" || w.pos === "PLACE" || w.pos === "PERSON"
  );

  for (const verb of verbs) {
    for (const obj of objects) {
      if (!isValidVerbObjectCombination(verb.en, obj.en)) {
        console.log(`🚫 부적절한 조합: ${verb.en} + ${obj.en}`);
        return false;
      }
    }
  }

  // ✅ 패턴별 특별 검증
  if (schemaId === "MEET-PERSON-PLACE") {
    const place = usedWords.find((w) => w.pos === "PLACE");
    if (place && !isValidMeetingPlace(place.en)) {
      console.log(`🚫 부적절한 만남 장소: ${place.en}`);
      return false;
    }
  }

  return true;
}

function isValidMeetingPlace(place: string): boolean {
  const invalidMeetingPlaces = ["hospital", "bathroom", "toilet"];
  return !invalidMeetingPlaces.includes(place.toLowerCase());
}

function isValidVerbObjectCombination(verb: string, object: string): boolean {
  // 명확히 부적절한 조합들
  const invalidCombinations = [
    // 신체 부위는 이동 동사와 결합 불가
    {
      verbs: ["go", "goes", "went"],
      objects: ["teeth", "hair", "eyes", "nose", "mouth"],
    },
    // 액체는 eat과 결합 불가
    {
      verbs: ["eat", "eats", "ate"],
      objects: ["water", "coffee", "tea", "juice", "milk"],
    },
    // 고체 음식은 drink와 결합 불가
    {
      verbs: ["drink", "drinks", "drank"],
      objects: ["bread", "sandwich", "rice", "meat", "apple"],
    },
    // 사람은 eat과 결합 불가
    {
      verbs: ["eat", "eats", "ate"],
      objects: ["friend", "teacher", "student", "person"],
    },
    // 장소는 eat/drink와 결합 불가
    {
      verbs: ["eat", "eats", "ate", "drink", "drinks", "drank"],
      objects: ["home", "school", "hospital", "office"],
    },
  ];

  return !invalidCombinations.some(
    (combo) =>
      combo.verbs.includes(verb.toLowerCase()) &&
      combo.objects.includes(object.toLowerCase())
  );
}

function basicGrammarCheck(text: string): boolean {
  // 기본적인 문법 오류 체크
  if (
    text.includes("goes teeth") ||
    text.includes("eat water") ||
    text.includes("drink bread")
  ) {
    return false;
  }
  return true;
}

// 새로운 헬퍼 함수들 추가
function findWordInCoreVocabulary(word: string) {
  const allWords = [
    ...coreVocabulary.places,
    ...coreVocabulary.items,
    ...coreVocabulary.people,
    ...coreVocabulary.time,
  ];
  return allWords.find((w) => w.en.toLowerCase() === word.toLowerCase());
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
    : all.filter((s) => {
        const isProblematic = [
          "WHAT-ARE-YOU-DOING-TIME",
          "CAN-WE-MEET-TIME",
          "GO-PLACE-TIME",
        ].includes(s.id);

        if (isProblematic) {
          console.warn(`⏭️ 문제 패턴 제외: ${s.id}`);
          return false;
        }

        // ✅ 한국어 번역 누락 패턴 제외
        const hasValidKorean = s.koSurface && s.koSurface !== s.surface;
        const hasDefaultTranslation =
          getDefaultKoreanTranslation(s.surface, s.id) !== s.surface;

        if (!hasValidKorean && !hasDefaultTranslation) {
          console.warn(`⏭️ 한국어 번역 누락으로 패턴 제외: ${s.id}`);
          return false;
        }

        return finalTags.length ? finalTags.includes(s.category) : true;
      });

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

// 기본 한국어 번역 제공 함수
function getDefaultKoreanTranslation(
  surface: string,
  schemaId: string
): string {
  const translations: Record<string, string> = {
    "For here or to go?": "매장에서 드실 건가요, 포장하실 건가요?",
    "What size would you like?": "사이즈는 어떻게 하시겠어요?",
    "Could you make it OPTION?": "OPTION으로 만들어 주세요.",
    "I'd like it with MILK.": "MILK를 넣어서 주세요.",
    "Can I have a receipt?": "영수증 주세요.",
  };

  return translations[surface] || surface;
}
