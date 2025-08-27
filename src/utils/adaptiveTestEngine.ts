export class AdaptiveTestEngine {
  private itemBank: LevelQuestion[];
  private usedItems: Set<string> = new Set();
  private abilityEstimate = 0;
  private standardError = 2;

  constructor(itemBank: LevelQuestion[]) {
    this.itemBank = itemBank;
  }

  // 다음 최적 문제 선택
  selectNextItem(): LevelQuestion | null {
    const availableItems = this.itemBank.filter(
      (item) => !this.usedItems.has(item.id)
    );

    if (availableItems.length === 0) return null;

    // Fisher Information을 최대화하는 문제 선택
    let bestItem: LevelQuestion | null = null;
    let maxInformation = 0;

    availableItems.forEach((item) => {
      const difficulty = getDifficultyScore(item.difficulty);
      const information = calculateItemInformation(
        this.abilityEstimate,
        difficulty,
        1.5 // discrimination
      );

      if (information > maxInformation) {
        maxInformation = information;
        bestItem = item;
      }
    });

    return bestItem;
  }

  // 답변 처리 및 능력치 업데이트
  processAnswer(questionId: string, isCorrect: boolean): void {
    this.usedItems.add(questionId);

    const question = this.itemBank.find((q) => q.id === questionId);
    if (!question) return;

    const difficulty = getDifficultyScore(question.difficulty);

    // 베이지안 업데이트
    const expectedScore = irtModel(this.abilityEstimate, difficulty, 1.5);
    const actualScore = isCorrect ? 1 : 0;

    const derivative = irtDerivative(this.abilityEstimate, difficulty, 1.5);
    const adjustment = (actualScore - expectedScore) / derivative;

    this.abilityEstimate += adjustment * 0.3;
    this.standardError = updateStandardError(this.standardError, 1.5);
  }

  // 테스트 종료 조건 확인
  shouldTerminate(): boolean {
    return this.standardError < 0.5 || this.usedItems.size >= 10;
  }

  getCurrentEstimate(): { ability: number; level: string; confidence: number } {
    return {
      ability: this.abilityEstimate,
      level: mapAbilityToLevel(this.abilityEstimate),
      confidence: calculateConfidence(this.standardError),
    };
  }
}

function calculateItemInformation(
  ability: number,
  difficulty: number,
  discrimination: number
): number {
  const p = irtModel(ability, difficulty, discrimination);
  const q = 1 - p;
  return discrimination * discrimination * p * q;
}
