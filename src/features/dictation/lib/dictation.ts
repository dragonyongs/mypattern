// src/features/dictation/lib/dictation.ts

export interface BlankSentence {
  original: string;
  blanked: string;
  blanks: {
    index: number;
    word: string;
    position: number; // 문장에서의 위치
  }[];
}

export interface AnswerResult {
  isCorrect: boolean;
  correctAnswers: string[];
  userAnswers: string[];
  score: number; // 0-100
}

/**
 * 문장에서 랜덤하게 단어를 빈칸으로 만드는 함수
 */
export function createBlankSentence(
  sentence: string,
  blankCount: number = 2,
  excludeWords: string[] = ["a", "an", "the", "is", "are", "was", "were"]
): BlankSentence {
  const words = sentence.split(" ");
  const availableWords = words
    .map((word, index) => ({
      word: word.toLowerCase().replace(/[.,!?]/g, ""),
      index,
    }))
    .filter(
      ({ word }) =>
        word.length > 2 &&
        !excludeWords.includes(word) &&
        /^[a-zA-Z]+$/.test(word) // 영문자만
    );

  // 빈칸으로 만들 단어들 랜덤 선택
  const selectedBlanks = availableWords
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.min(blankCount, availableWords.length));

  // 빈칸 문장 생성
  let blankedSentence = sentence;
  const blanks = selectedBlanks.map(({ word, index }) => {
    const originalWord = words[index];
    const blankLength = Math.max(originalWord.length, 5);
    const blank = "_".repeat(blankLength);

    blankedSentence = blankedSentence.replace(originalWord, blank);

    return {
      index,
      word: originalWord,
      position: blankedSentence.indexOf(blank),
    };
  });

  return {
    original: sentence,
    blanked: blankedSentence,
    blanks,
  };
}

/**
 * 사용자 답안을 검증하는 함수
 */
export function checkAnswer(
  userAnswers: string[],
  correctAnswers: string[],
  strictMode: boolean = false
): AnswerResult {
  if (userAnswers.length !== correctAnswers.length) {
    return {
      isCorrect: false,
      correctAnswers,
      userAnswers,
      score: 0,
    };
  }

  let correctCount = 0;
  const normalizedUserAnswers = userAnswers.map((answer) =>
    answer
      .toLowerCase()
      .trim()
      .replace(/[.,!?]/g, "")
  );

  const normalizedCorrectAnswers = correctAnswers.map((answer) =>
    answer
      .toLowerCase()
      .trim()
      .replace(/[.,!?]/g, "")
  );

  for (let i = 0; i < normalizedCorrectAnswers.length; i++) {
    const userAnswer = normalizedUserAnswers[i];
    const correctAnswer = normalizedCorrectAnswers[i];

    if (strictMode) {
      // 정확히 일치해야 함
      if (userAnswer === correctAnswer) {
        correctCount++;
      }
    } else {
      // 유사도 검사 포함
      if (
        userAnswer === correctAnswer ||
        isTypoTolerant(userAnswer, correctAnswer)
      ) {
        correctCount++;
      }
    }
  }

  const score = Math.round((correctCount / correctAnswers.length) * 100);
  const isCorrect = strictMode
    ? correctCount === correctAnswers.length
    : score >= 80; // 80% 이상이면 통과

  return {
    isCorrect,
    correctAnswers,
    userAnswers,
    score,
  };
}

/**
 * 간단한 타이포 허용 함수 (레벤슈타인 거리 1 이하)
 */
function isTypoTolerant(userWord: string, correctWord: string): boolean {
  if (Math.abs(userWord.length - correctWord.length) > 1) {
    return false;
  }

  return levenshteinDistance(userWord, correctWord) <= 1;
}

/**
 * 레벤슈타인 거리 계산
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) {
    matrix[0][i] = i;
  }

  for (let j = 0; j <= str2.length; j++) {
    matrix[j][0] = j;
  }

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + substitutionCost // substitution
      );
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * 난이도별 빈칸 생성 설정
 */
export const DIFFICULTY_SETTINGS = {
  easy: {
    blankCount: 1,
    excludeWords: [
      "a",
      "an",
      "the",
      "is",
      "are",
      "was",
      "were",
      "in",
      "on",
      "at",
    ],
  },
  medium: { blankCount: 2, excludeWords: ["a", "an", "the"] },
  hard: { blankCount: 3, excludeWords: [] },
} as const;

export type DifficultyLevel = keyof typeof DIFFICULTY_SETTINGS;
