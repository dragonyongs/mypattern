// src/shared/services/unifiedGrammarEngine.ts (완전한 구현)

import {
  getWordCategory,
  canPerformAction,
} from "@/features/learn/services/wordCategories";

interface GrammarRule {
  id: string;
  pattern: string;
  constraints: ConstraintRule[];
  examples: string[];
  forbidden: ForbiddenCombination[];
}

interface ConstraintRule {
  slot: string;
  pos: string[];
  semanticTypes?: string[];
  required: boolean;
  morphology?: any;
}

interface ForbiddenCombination {
  verb: string[];
  object: string[];
  reason: string;
}

interface GeneratedSentence {
  id: string;
  english: string;
  korean: string;
  ruleId: string;
  confidence: number;
  usedWords: string[];
  structure: string;
}

interface SlotFillResult {
  slotName: string;
  word: any;
  morphology?: any;
}

export class UnifiedGrammarEngine {
  private grammarRules: GrammarRule[] = [
    {
      id: "BASIC_SVO",
      pattern: "SUBJECT + VERB + OBJECT",
      constraints: [
        { slot: "SUBJECT", pos: ["PERSON", "ITEM"], required: true },
        { slot: "VERB", pos: ["VERB"], required: true },
        { slot: "OBJECT", pos: ["ITEM", "PLACE"], required: true },
      ],
      examples: ["I drink coffee", "She visits the hospital"],
      forbidden: [
        // ✅ 의미적으로 이상한 조합 추가
        {
          verb: ["schedule", "reschedule"],
          object: ["meeting room", "conference room"],
          reason: "장소는 예약하는 것이지 일정을 잡는 것이 아님",
        },
        {
          verb: ["confirm"],
          object: ["head office", "meeting room"],
          reason: "장소를 확인한다는 표현은 부자연스러움",
        },
        {
          verb: ["drink", "drank"],
          object: ["book", "phone"],
          reason: "액체가 아닌 것은 마실 수 없음",
        },
        {
          verb: ["eat", "ate"],
          object: ["water", "coffee"],
          reason: "액체는 먹을 수 없음",
        },
      ],
    },
    // ✅ 더 자연스러운 비즈니스 패턴 추가
    {
      id: "BUSINESS_BOOKING",
      pattern: "I need to book + PLACE",
      constraints: [
        {
          slot: "PLACE",
          pos: ["PLACE"],
          semanticTypes: ["BUSINESS_VENUE"],
          required: true,
        },
      ],
      examples: [
        "I need to book the meeting room",
        "I need to book the conference room",
      ],
      forbidden: [],
    },

    {
      id: "BUSINESS_ACTION",
      pattern: "I need to + VERB + OBJECT",
      constraints: [
        {
          slot: "VERB",
          pos: ["VERB"],
          semanticTypes: ["BUSINESS_ACTION"],
          required: true,
        },
        {
          slot: "OBJECT",
          pos: ["ITEM"],
          semanticTypes: ["BUSINESS_ITEM"],
          required: true,
        },
      ],
      examples: [
        "I need to review the report",
        "I need to prepare the proposal",
      ],
      forbidden: [],
    },
    {
      id: "WH_QUESTION",
      pattern: "WH-WORD + VERB + SUBJECT + OBJECT?",
      constraints: [
        { slot: "WH-WORD", pos: ["PRON"], required: true },
        { slot: "VERB", pos: ["VERB"], required: true },
        { slot: "SUBJECT", pos: ["PERSON"], required: true },
        { slot: "OBJECT", pos: ["ITEM", "PLACE"], required: false },
      ],
      examples: ["Where do you go?", "What do you want?"],
      forbidden: [],
    },
    {
      id: "POLITE_REQUEST",
      pattern: "Can I have + OBJECT + please?",
      constraints: [
        {
          slot: "OBJECT",
          pos: ["ITEM"],
          semanticTypes: ["BEVERAGE", "FOOD"],
          required: true,
        },
      ],
      examples: ["Can I have coffee please?", "Can I have water please?"],
      forbidden: [
        {
          verb: ["have"],
          object: ["meeting room", "conference room"],
          reason: "장소는 가질 수 있는 대상이 아님",
        },
      ],
    },
  ];

  // ✅ 핵심: 동적 문장 생성 (Learn과 Build에서 공통 사용)
  generateValidSentences(
    userWords: any[],
    intentType?: string,
    limit: number = 10
  ): GeneratedSentence[] {
    console.log("🏗️ 문장 생성 시작:", {
      wordsCount: userWords?.length || 0,
      intentType,
      limit,
    });

    if (!userWords || userWords.length === 0) {
      console.warn("⚠️ 사용 가능한 단어가 없습니다");
      return this.generateFallbackSentences(intentType, limit);
    }

    const validSentences: GeneratedSentence[] = [];

    // 적용 가능한 문법 규칙 필터링
    const applicableRules = this.getApplicableRules(userWords, intentType);
    console.log("📋 적용 가능한 규칙:", applicableRules.length + "개");

    for (const rule of applicableRules) {
      const combinations = this.generateCombinations(rule, userWords);
      console.log(`🔄 규칙 ${rule.id}: ${combinations.length}개 조합`);

      for (const combo of combinations) {
        // 문법적 유효성 검사
        if (!this.validateGrammar(rule, combo)) continue;

        // 의미적 유효성 검사
        if (!this.validateSemantics(combo)) continue;

        // 금지된 조합 검사
        if (this.isForbidden(rule, combo)) continue;

        const sentence = this.assembleSentence(rule, combo);
        validSentences.push({
          id: `generated_${Date.now()}_${validSentences.length}`,
          english: sentence.english,
          korean: sentence.korean,
          ruleId: rule.id,
          confidence: this.calculateConfidence(rule, combo),
          usedWords: combo.map((c) => c.word.id || c.word.en),
          structure: rule.pattern,
        });

        if (validSentences.length >= limit) break;
      }

      if (validSentences.length >= limit) break;
    }

    console.log("✅ 생성 완료:", validSentences.length + "개 문장");
    return validSentences.sort((a, b) => b.confidence - a.confidence);
  }

  // ✅ 적용 가능한 규칙 필터링
  private getApplicableRules(
    userWords: any[],
    intentType?: string
  ): GrammarRule[] {
    console.log("🎯 규칙 필터링:", { intentType });

    let applicableRules = [...this.grammarRules];

    // 의도별 필터링
    if (intentType) {
      applicableRules = applicableRules.filter((rule) => {
        switch (intentType) {
          case "request":
            return rule.id.includes("REQUEST") || rule.id.includes("POLITE");
          case "location":
          case "directions":
            return rule.id.includes("WH") || rule.id.includes("QUESTION");
          case "general":
          default:
            return rule.id.includes("SVO") || rule.id.includes("BASIC");
        }
      });
    }

    // 사용 가능한 단어로 규칙 검증
    applicableRules = applicableRules.filter((rule) => {
      return this.canFulfillRule(rule, userWords);
    });

    console.log(
      "📋 필터링 결과:",
      applicableRules.map((r) => r.id)
    );
    return applicableRules;
  }

  // ✅ 규칙을 충족할 수 있는지 확인
  private canFulfillRule(rule: GrammarRule, userWords: any[]): boolean {
    const requiredSlots = rule.constraints.filter((c) => c.required);

    for (const constraint of requiredSlots) {
      const hasMatchingWord = userWords.some((word) => {
        // POS 매칭
        const posMatch = constraint.pos.includes(word.pos);

        // 의미적 타입 매칭
        let semanticMatch = true;
        if (constraint.semanticTypes) {
          const categories = getWordCategory(word.en || word.ko);
          semanticMatch = constraint.semanticTypes.some((type) =>
            categories.includes(type)
          );
        }

        return posMatch && semanticMatch;
      });

      if (!hasMatchingWord) {
        console.log(
          `❌ 규칙 ${rule.id}: ${constraint.slot} 슬롯을 채울 단어 없음`
        );
        return false;
      }
    }

    return true;
  }

  // ✅ 단어 조합 생성
  private generateCombinations(
    rule: GrammarRule,
    userWords: any[]
  ): SlotFillResult[][] {
    const combinations: SlotFillResult[][] = [];

    // 각 슬롯별로 가능한 단어들 추출
    const slotOptions: { [slotName: string]: any[] } = {};

    for (const constraint of rule.constraints) {
      const matchingWords = userWords.filter((word) => {
        const posMatch = constraint.pos.includes(word.pos);
        let semanticMatch = true;

        if (constraint.semanticTypes) {
          const categories = getWordCategory(word.en || word.ko);
          semanticMatch = constraint.semanticTypes.some((type) =>
            categories.includes(type)
          );
        }

        return posMatch && semanticMatch;
      });

      slotOptions[constraint.slot] = matchingWords.slice(0, 3); // 최대 3개씩
    }

    // 조합 생성 (간단한 버전 - 각 슬롯에서 하나씩)
    const generateCombination = (
      slotIndex: number,
      currentCombo: SlotFillResult[]
    ): void => {
      if (slotIndex >= rule.constraints.length) {
        combinations.push([...currentCombo]);
        return;
      }

      const constraint = rule.constraints[slotIndex];
      const options = slotOptions[constraint.slot] || [];

      if (options.length === 0 && constraint.required) {
        return; // 필수 슬롯에 옵션이 없으면 스킵
      }

      if (options.length === 0 && !constraint.required) {
        generateCombination(slotIndex + 1, currentCombo); // 선택적 슬롯 스킵
        return;
      }

      for (const word of options) {
        currentCombo.push({
          slotName: constraint.slot,
          word,
          morphology: constraint.morphology,
        });

        generateCombination(slotIndex + 1, currentCombo);
        currentCombo.pop();
      }
    };

    generateCombination(0, []);
    return combinations.slice(0, 10); // 최대 10개 조합
  }

  // ✅ 문법적 유효성 검사
  private validateGrammar(
    rule: GrammarRule,
    combination: SlotFillResult[]
  ): boolean {
    // 필수 슬롯 확인
    for (const constraint of rule.constraints) {
      if (constraint.required) {
        const hasSlot = combination.some(
          (slot) => slot.slotName === constraint.slot
        );
        if (!hasSlot) {
          return false;
        }
      }
    }
    return true;
  }

  // ✅ 의미적 유효성 검사
  private validateSemantics(combination: SlotFillResult[]): boolean {
    const verbSlot = combination.find((c) => c.slotName === "VERB");
    const objectSlot = combination.find((c) => c.slotName === "OBJECT");

    if (verbSlot && objectSlot) {
      const verb = verbSlot.word.en.toLowerCase();
      const object = objectSlot.word.en.toLowerCase();

      // ✅ 비즈니스 관련 특별 규칙
      if (
        ["schedule", "reschedule"].includes(verb) &&
        ["meeting room", "conference room", "head office"].includes(object)
      ) {
        console.log(`🚫 의미적으로 부적절: ${verb} + ${object}`);
        return false;
      }

      if (
        verb === "confirm" &&
        ["meeting room", "conference room", "head office"].includes(object)
      ) {
        console.log(`🚫 의미적으로 부적절: ${verb} + ${object}`);
        return false;
      }

      // 기존 호환성 검사
      if (!canPerformAction(verbSlot.word.en, objectSlot.word.en)) {
        return false;
      }
    }

    return true;
  }

  // ✅ 금지된 조합 검사
  private isForbidden(
    rule: GrammarRule,
    combination: SlotFillResult[]
  ): boolean {
    const verbSlot = combination.find((c) => c.slotName === "VERB");
    const objectSlot = combination.find((c) => c.slotName === "OBJECT");

    if (!verbSlot || !objectSlot) return false;

    for (const forbidden of rule.forbidden) {
      if (
        forbidden.verb.includes(verbSlot.word.en?.toLowerCase()) &&
        forbidden.object.includes(objectSlot.word.en?.toLowerCase())
      ) {
        console.log(
          `⛔ 금지된 조합: ${verbSlot.word.en} + ${objectSlot.word.en}`
        );
        return true;
      }
    }

    return false;
  }

  // ✅ 문장 조립
  private assembleSentence(
    rule: GrammarRule,
    combination: SlotFillResult[]
  ): { english: string; korean: string } {
    let english = this.getEnglishTemplate(rule.id);
    let korean = this.getKoreanTemplate(rule.id);

    for (const slot of combination) {
      const word = slot.word;

      // 형태소 변화 적용
      let englishForm = word.en || word.text || "";
      let koreanForm = word.ko || word.korean || "";

      if (slot.morphology) {
        englishForm = this.applyMorphology(englishForm, slot.morphology);
        koreanForm = this.applyKoreanMorphology(koreanForm, slot.morphology);
      }

      english = english.replace(slot.slotName, englishForm);
      korean = korean.replace(`[${slot.slotName}]`, koreanForm);
    }

    // 자연스러운 영어로 후처리
    english = this.naturalizeEnglish(english);

    return { english, korean };
  }

  // ✅ 영어 템플릿 가져오기
  private getEnglishTemplate(ruleId: string): string {
    const templates: Record<string, string> = {
      BASIC_SVO: "I VERB OBJECT",
      WH_QUESTION: "WH-WORD do you VERB?",
      POLITE_REQUEST: "Can I have OBJECT please?",
      BUSINESS_BOOKING: "I need to book the PLACE", // ✅ 추가
      BUSINESS_ACTION: "I need to VERB the OBJECT", // ✅ 추가
    };
    return templates[ruleId] || "I VERB OBJECT";
  }

  // ✅ 한국어 템플릿 가져오기
  private getKoreanTemplate(ruleId: string): string {
    const templates: Record<string, string> = {
      BASIC_SVO: "저는 [OBJECT]를 [VERB]어요", // ✅ 개선
      WH_QUESTION: "[WH-WORD] [VERB]하나요?",
      POLITE_REQUEST: "[OBJECT] 주세요",
      BUSINESS_BOOKING: "[PLACE]을 예약해야 해요", // ✅ 추가
      BUSINESS_ACTION: "[OBJECT]를 [VERB]해야 해요", // ✅ 추가
    };
    return templates[ruleId] || "[OBJECT]를 주세요";
  }

  // ✅ 자연스러운 영어 규칙 확장
  private naturalizeEnglish(sentence: string): string {
    let result = sentence
      .replace(/\ba ([aeiou])/gi, "an $1")
      .replace(/\s+/g, " ")
      .trim();

    // ✅ 비즈니스 관련 자연스러운 표현으로 변경
    result = result
      .replace(/I schedule meeting room/gi, "I need to book a meeting room")
      .replace(
        /I schedule conference room/gi,
        "I need to book the conference room"
      )
      .replace(
        /I reschedule meeting room/gi,
        "I need to reschedule the meeting room booking"
      )
      .replace(/I confirm head office/gi, "I need to check with head office")
      .replace(
        /I confirm meeting room/gi,
        "I need to confirm the meeting room booking"
      );

    // 첫 글자 대문자, 마침표 추가
    result = result.charAt(0).toUpperCase() + result.slice(1);
    if (!/[.!?]$/.test(result)) result += ".";

    return result;
  }

  // ✅ 형태소 변화 적용 (간단한 버전)
  private applyMorphology(word: string, morphology: any): string {
    if (!morphology) return word;

    // 간단한 동사 변화
    if (morphology.tense === "present" && morphology.person === "third") {
      if (word.endsWith("y")) return word.slice(0, -1) + "ies";
      if (word.endsWith("s") || word.endsWith("sh") || word.endsWith("ch"))
        return word + "es";
      return word + "s";
    }

    return word;
  }

  private applyKoreanMorphology(word: string, morphology: any): string {
    // 한국어 형태소 변화는 복잡하므로 기본값 반환
    return word;
  }

  // ✅ 신뢰도 계산
  private calculateConfidence(
    rule: GrammarRule,
    combination: SlotFillResult[]
  ): number {
    let confidence = 0.7; // 기본 신뢰도

    // 슬롯이 모두 채워졌으면 보너스
    const filledSlots = combination.length;
    const totalSlots = rule.constraints.length;
    confidence += (filledSlots / totalSlots) * 0.2;

    // 의미적으로 올바른 조합이면 보너스
    if (this.validateSemantics(combination)) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  // ✅ 폴백 문장 생성 (단어가 부족할 때)
  private generateFallbackSentences(
    intentType?: string,
    limit: number = 3
  ): GeneratedSentence[] {
    const fallbackSentences: GeneratedSentence[] = [
      {
        id: "fallback_1",
        english: "I want water please.",
        korean: "물 주세요.",
        ruleId: "FALLBACK_REQUEST",
        confidence: 0.5,
        usedWords: [],
        structure: "POLITE_REQUEST",
      },
      {
        id: "fallback_2",
        english: "Where is the hospital?",
        korean: "병원이 어디에 있나요?",
        ruleId: "FALLBACK_LOCATION",
        confidence: 0.5,
        usedWords: [],
        structure: "WH_QUESTION",
      },
      {
        id: "fallback_3",
        english: "I like coffee.",
        korean: "저는 커피를 좋아합니다.",
        ruleId: "FALLBACK_BASIC",
        confidence: 0.5,
        usedWords: [],
        structure: "BASIC_SVO",
      },
    ];

    return fallbackSentences.slice(0, limit);
  }
}

export const unifiedGrammarEngine = new UnifiedGrammarEngine();
