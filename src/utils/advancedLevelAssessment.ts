import { LevelTestAnswer } from "@/stores/onboardingStore";
import {
  levelTestQuestions,
  type LevelQuestion,
} from "@/data/levelTestQuestions";

// IRT (Item Response Theory) 기반 평가
export interface IRTAssessment {
  estimatedAbility: number; // -3 ~ +3 범위의 능력치
  level: "beginner" | "intermediate" | "advanced";
  confidence: number; // 0-1 신뢰도
  standardError: number; // 측정 오차
  detailedAnalysis: {
    grammar: { score: number; total: number };
    vocabulary: { score: number; total: number };
    comprehension: { score: number; total: number };
  };
}

export function calculateIRTLevel(answers: LevelTestAnswer[]): IRTAssessment {
  let abilityEstimate = 0; // 초기 능력치 추정값
  let standardError = 2; // 초기 오차

  // 각 문제별로 능력치 업데이트 (베이지안 추론)
  answers.forEach((answer) => {
    const question = levelTestQuestions.find((q) => q.id === answer.questionId);
    if (!question) return;

    // 문제 난이도 매핑
    const difficulty = getDifficultyScore(question.difficulty);
    const discrimination = 1.5; // 문항 변별도

    // IRT 모델 적용
    const expectedScore = irtModel(abilityEstimate, difficulty, discrimination);
    const actualScore = answer.isCorrect ? 1 : 0;

    // 능력치 업데이트 (Newton-Raphson 방법)
    const derivative = irtDerivative(
      abilityEstimate,
      difficulty,
      discrimination
    );
    const adjustment = (actualScore - expectedScore) / derivative;

    abilityEstimate += adjustment * 0.5; // 학습률 적용
    standardError = updateStandardError(standardError, discrimination);
  });

  // 최종 레벨 결정
  const level = mapAbilityToLevel(abilityEstimate);
  const confidence = calculateConfidence(standardError);

  return {
    estimatedAbility: abilityEstimate,
    level,
    confidence,
    standardError,
    detailedAnalysis: analyzeByCategory(answers),
  };
}

// IRT 3-Parameter 모델
function irtModel(
  ability: number,
  difficulty: number,
  discrimination: number
): number {
  const guessing = 0.2; // 추측 확률
  return (
    guessing +
    (1 - guessing) / (1 + Math.exp(-discrimination * (ability - difficulty)))
  );
}

function getDifficultyScore(difficulty: string): number {
  const difficultyMap = {
    beginner: -1.5,
    intermediate: 0,
    advanced: 1.5,
  };
  return difficultyMap[difficulty] || 0;
}

function mapAbilityToLevel(
  ability: number
): "beginner" | "intermediate" | "advanced" {
  if (ability >= 1.0) return "advanced";
  if (ability >= -0.5) return "intermediate";
  return "beginner";
}
