import { LevelTestAnswer } from "@/stores/onboardingStore";
import { levelTestQuestions } from "@/data/levelTestQuestions";

export interface LevelAssessment {
  level: "beginner" | "intermediate" | "advanced";
  confidence: number; // 0-1
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export function assessLevel(answers: LevelTestAnswer[]): LevelAssessment {
  // 난이도별 정답률 계산
  const difficultyScores = {
    beginner: { correct: 0, total: 0 },
    intermediate: { correct: 0, total: 0 },
    advanced: { correct: 0, total: 0 },
  };

  const topicScores: Record<string, { correct: number; total: number }> = {};

  answers.forEach((answer) => {
    const question = levelTestQuestions.find((q) => q.id === answer.questionId);
    if (!question) return;

    // 난이도별 점수
    difficultyScores[question.difficulty].total++;
    if (answer.isCorrect) {
      difficultyScores[question.difficulty].correct++;
    }

    // 주제별 점수
    question.tags.forEach((tag) => {
      if (!topicScores[tag]) {
        topicScores[tag] = { correct: 0, total: 0 };
      }
      topicScores[tag].total++;
      if (answer.isCorrect) {
        topicScores[tag].correct++;
      }
    });
  });

  // 레벨 결정 로직
  const beginnerRate =
    difficultyScores.beginner.total > 0
      ? difficultyScores.beginner.correct / difficultyScores.beginner.total
      : 0;
  const intermediateRate =
    difficultyScores.intermediate.total > 0
      ? difficultyScores.intermediate.correct /
        difficultyScores.intermediate.total
      : 0;
  const advancedRate =
    difficultyScores.advanced.total > 0
      ? difficultyScores.advanced.correct / difficultyScores.advanced.total
      : 0;

  let level: "beginner" | "intermediate" | "advanced";
  let confidence: number;

  if (advancedRate >= 0.7 && intermediateRate >= 0.8) {
    level = "advanced";
    confidence = Math.min(advancedRate + intermediateRate) / 2;
  } else if (intermediateRate >= 0.6 && beginnerRate >= 0.8) {
    level = "intermediate";
    confidence = Math.min(intermediateRate + beginnerRate) / 2;
  } else {
    level = "beginner";
    confidence = Math.max(beginnerRate, 0.5);
  }

  // 강점/약점 분석
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  Object.entries(topicScores).forEach(([topic, score]) => {
    const rate = score.correct / score.total;
    if (rate >= 0.8) {
      strengths.push(topic);
    } else if (rate <= 0.4) {
      weaknesses.push(topic);
    }
  });

  // 추천사항
  const recommendations: string[] = [];
  if (weaknesses.includes("grammar")) {
    recommendations.push("문법 기초 학습을 추천합니다");
  }
  if (weaknesses.includes("phrasal-verb")) {
    recommendations.push("구동사 학습에 집중해보세요");
  }
  if (level === "beginner") {
    recommendations.push("기본 패턴 학습부터 시작하세요");
  }

  return {
    level,
    confidence,
    strengths,
    weaknesses,
    recommendations,
  };
}

// 다음 학습 추천
export function getRecommendedContent(assessment: LevelAssessment) {
  const { level, weaknesses } = assessment;

  const recommendations = {
    beginner: ["기본 인사말 패턴", "간단한 질문하기", "일상 대화 표현"],
    intermediate: ["비즈니스 기본 표현", "의견 표현하기", "복잡한 상황 설명"],
    advanced: ["고급 비즈니스 영어", "프레젠테이션 기술", "토론 및 협상"],
  };

  return recommendations[level];
}
