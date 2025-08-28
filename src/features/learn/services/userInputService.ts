// src/features/learn/services/userInputService.ts
import type {
  GrammarFeedback,
  PatternMatch,
  ImprovementSuggestion,
  GrammarError,
} from "../types/userInput.types";
import type { Generated } from "./patternEngine";
import { PATTERN_SCHEMAS } from "./patternSchemas";
import { useLexiconStore } from "@/stores/lexiconStore";

// 간단한 문법 검사 함수
export async function checkGrammar(text: string): Promise<GrammarFeedback> {
  const errors: GrammarError[] = [];
  const suggestions: string[] = [];
  let score = 1.0;

  // 기본적인 문법 규칙 체크
  const rules = [
    {
      pattern: /\ba\s+[aeiouAEIOU]/g,
      type: "article" as const,
      message: "모음 앞에는 'a' 대신 'an'을 사용해야 합니다",
      fix: (match: string) => match.replace("a ", "an "),
    },
    {
      pattern: /\b[a-z]/,
      type: "grammar" as const,
      message: "문장은 대문자로 시작해야 합니다",
      fix: (match: string) => match.charAt(0).toUpperCase() + match.slice(1),
    },
    {
      pattern: /[^.!?]$/,
      type: "grammar" as const,
      message: "문장은 마침표로 끝나야 합니다",
      fix: (match: string) => match + ".",
    },
  ];

  rules.forEach((rule) => {
    const matches = text.match(rule.pattern);
    if (matches) {
      errors.push({
        type: rule.type,
        message: rule.message,
        suggestion: rule.fix(matches[0]),
        position: [0, text.length],
      });
      score -= 0.2;
    }
  });

  // 추가 제안 생성
  if (text.length < 5) {
    suggestions.push("문장이 너무 짧습니다. 더 자세히 표현해보세요.");
  }

  if (!/\b(I|you|he|she|it|we|they)\b/i.test(text)) {
    suggestions.push("주어를 명확히 표현해보세요.");
  }

  return {
    isCorrect: errors.length === 0,
    errors,
    suggestions,
    score: Math.max(0, score),
  };
}

// 유사한 패턴 찾기
export function findSimilarPatterns(userText: string): PatternMatch[] {
  const normalizedUserText = userText.toLowerCase().trim();
  const matches: PatternMatch[] = [];

  PATTERN_SCHEMAS.forEach((schema) => {
    // 패턴의 구조와 사용자 텍스트 비교
    const patternWords = schema.surface
      .toLowerCase()
      .replace(/\[.*?\]/g, "SLOT")
      .split(/\s+/)
      .filter((word) => word !== "SLOT");

    const userWords = normalizedUserText.split(/\s+/);

    // 단어 매칭 기반 유사도 계산
    const commonWords = patternWords.filter((word) =>
      userWords.some(
        (userWord) => userWord.includes(word) || word.includes(userWord)
      )
    );

    const similarity = commonWords.length / Math.max(patternWords.length, 1);

    if (similarity > 0.3) {
      matches.push({
        schemaId: schema.id,
        similarity,
        original: userText,
        matched: schema.surface,
      });
    }
  });

  return matches.sort((a, b) => b.similarity - a.similarity).slice(0, 3);
}

// 개선 제안 생성
export function generateImprovements(
  userText: string,
  matchedPatterns: PatternMatch[]
): ImprovementSuggestion[] {
  const suggestions: ImprovementSuggestion[] = [];

  // 문법 개선
  if (/\ba\s+[aeiouAEIOU]/g.test(userText)) {
    suggestions.push({
      type: "grammar",
      original: userText,
      improved: userText.replace(/\ba\s+([aeiouAEIOU])/g, "an $1"),
      reason: "모음 앞에는 'an'을 사용합니다",
    });
  }

  // 어휘 개선
  const basicWords = ["good", "bad", "big", "small"];
  basicWords.forEach((word) => {
    if (userText.toLowerCase().includes(word)) {
      const betterWords = {
        good: "excellent, wonderful, fantastic",
        bad: "terrible, awful, disappointing",
        big: "huge, enormous, massive",
        small: "tiny, little, compact",
      };

      suggestions.push({
        type: "vocabulary",
        original: userText,
        improved: userText.replace(
          new RegExp(`\\b${word}\\b`, "gi"),
          betterWords[word as keyof typeof betterWords].split(", ")[0]
        ),
        reason: `'${word}' 대신 더 구체적인 표현을 사용해보세요`,
      });
    }
  });

  // 패턴 기반 개선
  if (matchedPatterns.length > 0) {
    const bestMatch = matchedPatterns[0];
    suggestions.push({
      type: "style",
      original: userText,
      improved: `${bestMatch.matched} (패턴 적용)`,
      reason: `${bestMatch.schemaId} 패턴을 사용하면 더 자연스럽습니다`,
    });
  }

  return suggestions;
}
