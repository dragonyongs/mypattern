// src/features/learn/services/grammarChecker.ts

export interface GrammarRule {
  id: string;
  name: string;
  pattern: RegExp;
  errorType:
    | "subject-verb"
    | "article"
    | "preposition"
    | "word-order"
    | "tense";
  suggestion: string;
  examples: { wrong: string; correct: string }[];
}

export interface GrammarError {
  position: number;
  length: number;
  type: string;
  message: string;
  suggestions: string[];
}

export interface GrammarCheckResult {
  isValid: boolean;
  errors: GrammarError[];
  suggestions: string[];
  confidence: number; // 0~1
}

// 단일 단어 허용(감탄사 등)
const SINGLE_WORD_WHITELIST = new Set([
  "hi",
  "hello",
  "thanks",
  "thankyou",
  "sorry",
  "yes",
  "no",
  "okay",
  "ok",
  "sure",
  "bye",
  "goodbye",
]);

function tokenize(text: string) {
  return text.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

class BasicGrammarChecker {
  private rules: GrammarRule[] = [
    // 1) 3인칭 단수 주어 + 동사원형 오류
    {
      id: "sv_agreement_1",
      name: "Subject-Verb Agreement (3rd person singular)",
      pattern: /\b(he|she|it)\s+(go|have|do|say|get|make|come|take)\b/gi,
      errorType: "subject-verb",
      suggestion: "3인칭 단수 주어(he/she/it)에는 동사에 -s가 붙어야 합니다",
      examples: [
        { wrong: "He go to school", correct: "He goes to school" },
        { wrong: "She have a car", correct: "She has a car" },
      ],
    },

    // 2) 모음 앞의 관사 a/an
    {
      id: "article_1",
      name: "Article usage before vowel",
      pattern: /\ba\s+[aeiouAEIOU]/g,
      errorType: "article",
      suggestion: "모음 소리 앞에서는 'a' 대신 'an'을 사용하세요",
      examples: [
        { wrong: "a apple", correct: "an apple" },
        { wrong: "a umbrella", correct: "an umbrella" },
      ],
    },

    // 3) 어순 오류(부사 very/really/quite + Be)
    {
      id: "word_order_1",
      name: "Adverb before adjective, not verb",
      pattern: /\b(very|really|quite)\s+(is|are|was|were)\b/gi,
      errorType: "word-order",
      suggestion: "부사는 형용사 앞에 오며 동사(Be) 앞에 직접 오지 않습니다",
      examples: [{ wrong: "It very is good", correct: "It is very good" }],
    },
  ];

  // ===== 기본 구조 검사 =====
  private hasSubject(text: string): boolean {
    return /\b(I|you|he|she|it|we|they|[A-Z][a-z]+)\b/.test(text);
  }

  private hasVerb(text: string): boolean {
    return /\b(am|is|are|was|were|have|has|had|do|does|did|go|goes|went|come|comes|came|make|makes|made|say|says|said|get|gets|got)\b/i.test(
      text
    );
  }

  private isAllowedSingleWord(text: string): boolean {
    const toks = tokenize(text);
    return toks.length === 1 && SINGLE_WORD_WHITELIST.has(toks);
  }

  private hasMinimumWordsOrAllowedSingle(text: string): boolean {
    const toks = tokenize(text);
    if (toks.length === 0) return false;
    if (toks.length === 1) return this.isAllowedSingleWord(text);
    return toks.length >= 2;
  }

  private hasProperCapitalization(text: string): boolean {
    const t = text.trim();
    if (!t) return false;
    // 단일 감탄사 예외는 소문자 허용
    if (this.isAllowedSingleWord(text)) return true;
    return /^[A-Z]/.test(t);
  }

  // ===== 제안/수정 생성 =====
  private generateSuggestions(errorText: string, rule: GrammarRule): string[] {
    switch (rule.errorType) {
      case "subject-verb":
        return this.fixSubjectVerbAgreement(errorText);
      case "article":
        return this.fixArticleUsage(errorText);
      default:
        return [rule.suggestion];
    }
  }

  private fixSubjectVerbAgreement(text: string): string[] {
    const verbMap: Record<string, string> = {
      go: "goes",
      have: "has",
      do: "does",
      say: "says",
      get: "gets",
      make: "makes",
      come: "comes",
      take: "takes",
    };
    const suggestions: string[] = [];
    Object.entries(verbMap).forEach(([base, conjugated]) => {
      const re = new RegExp(`\\b${base}\\b`, "i");
      if (re.test(text)) suggestions.push(text.replace(re, conjugated));
    });
    return suggestions.length ? suggestions : ["동사에 -s를 붙이세요"];
  }

  private fixArticleUsage(text: string): string[] {
    return [text.replace(/\ba\s+([aeiouAEIOU])/gi, "an $1")];
  }

  // ===== 일반 제안 생성 =====
  private getGeneralSuggestions(text: string): string[] {
    const sugs: string[] = [];
    if (!this.hasMinimumWordsOrAllowedSingle(text)) {
      sugs.push(
        "문장 길이가 너무 짧습니다. 최소 2개 이상의 단어로 작성하세요(예외: Hi/Thanks 등)."
      );
    }
    if (
      !(this.hasSubject(text) && this.hasVerb(text)) &&
      !this.isAllowedSingleWord(text)
    ) {
      sugs.push("문장에 주어와 동사가 필요합니다.");
    }
    if (!this.hasProperCapitalization(text)) {
      sugs.push("문장의 첫 글자는 대문자로 시작하세요.");
    }
    return sugs;
  }

  private calculateConfidence(
    text: string,
    errors: GrammarError[],
    generalSugs: string[]
  ): number {
    const words = Math.max(1, tokenize(text).length);
    const penalty = errors.length + generalSugs.length;
    return Math.max(0, 1 - penalty / (words + 2));
  }

  // ===== 메인 검사 =====
  checkGrammar(text: string): GrammarCheckResult {
    const trimmed = text.trim();
    const errors: GrammarError[] = [];

    // 1) 규칙 위반 감지
    this.rules.forEach((rule) => {
      const matches = trimmed.matchAll(rule.pattern);
      for (const match of matches) {
        const raw = match;
        if (match.index !== undefined) {
          errors.push({
            position: match.index,
            length: raw.length,
            type: rule.errorType,
            message: rule.suggestion,
            suggestions: this.generateSuggestions(raw, rule),
          });
        }
      }
    });

    // 2) 일반 요건 제안
    const generalSuggestions = this.getGeneralSuggestions(trimmed);

    // 3) 최종 유효성: 규칙위반 0 && (주어+동사 or 허용 단일어) && 최소 단어/예외
    const passesStructure =
      (this.hasSubject(trimmed) && this.hasVerb(trimmed)) ||
      this.isAllowedSingleWord(trimmed);
    const passesLength = this.hasMinimumWordsOrAllowedSingle(trimmed);
    const isValid = errors.length === 0 && passesStructure && passesLength;

    return {
      isValid,
      errors,
      suggestions: generalSuggestions,
      confidence: this.calculateConfidence(trimmed, errors, generalSuggestions),
    };
  }
}

export const grammarChecker = new BasicGrammarChecker();
