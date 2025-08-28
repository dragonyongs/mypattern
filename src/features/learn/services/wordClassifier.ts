// src/features/learn/services/wordClassifier.ts
export interface WordClassificationRequest {
  word: string;
  suggestions?: string[];
}

export function requestWordClassification(
  word: string
): WordClassificationRequest {
  // 사용자에게 단어 분류 요청
  return {
    word,
    suggestions: guessCategory(word),
  };
}

function guessCategory(word: string): string[] {
  const guesses = [];

  // 간단한 휴리스틱
  if (word.includes("drink") || word.includes("juice")) {
    guesses.push("BEVERAGE");
  }
  if (word.includes("food") || word.includes("eat")) {
    guesses.push("FOOD");
  }

  return guesses;
}
