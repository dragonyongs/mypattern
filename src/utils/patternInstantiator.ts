// src/utils/patternInstantiator.ts
import {
  PatternSchema,
  Lexeme,
  SemanticConstraint,
} from "../features/learn/types/patternCore.types";

export interface PatternInstance {
  text: string;
  korean: string;
  used: string[];
  schemaId: string;
  confidence: number;
  canWrite: boolean;
}

export class PatternInstantiator {
  private semanticConstraintMap: Record<SemanticConstraint, string[]>;
  private lexemesByPos: Record<string, Lexeme[]>;

  constructor(
    lexemes: Lexeme[],
    semanticConstraints: Record<SemanticConstraint, string[]>
  ) {
    this.semanticConstraintMap = semanticConstraints;
    this.lexemesByPos = this.groupLexemesByPos(lexemes);
  }

  private groupLexemesByPos(lexemes: Lexeme[]): Record<string, Lexeme[]> {
    return lexemes.reduce((acc, lexeme) => {
      if (!acc[lexeme.pos]) acc[lexeme.pos] = [];
      acc[lexeme.pos].push(lexeme);
      return acc;
    }, {} as Record<string, Lexeme[]>);
  }

  /**
   * 패턴을 실제 어휘로 채워진 인스턴스로 변환
   */
  instantiatePattern(
    pattern: PatternSchema,
    targetLexemes?: string[]
  ): PatternInstance[] {
    const instances: PatternInstance[] = [];

    // 슬롯이 없으면 그대로 반환 (고정 패턴)
    if (!pattern.slots || pattern.slots.length === 0) {
      return [
        {
          text: pattern.surface,
          korean: pattern.koSurface,
          used: [],
          schemaId: pattern.id,
          confidence: 1,
          canWrite: false,
        },
      ];
    }

    // 각 슬롯에 대해 적절한 어휘 조합 생성
    const slotCombinations = this.generateSlotCombinations(
      pattern,
      targetLexemes
    );

    slotCombinations.forEach((combination, index) => {
      const instance = this.fillPattern(pattern, combination);
      instances.push({
        ...instance,
        canWrite: false,
        confidence: this.calculateConfidence(combination, targetLexemes),
      });
    });

    return instances.slice(0, 5); // 최대 5개 인스턴스만 반환
  }

  private generateSlotCombinations(
    pattern: PatternSchema,
    targetLexemes?: string[]
  ): Record<string, Lexeme>[] {
    const combinations: Record<string, Lexeme>[] = [];

    // 각 슬롯별 후보 어휘 생성
    const slotCandidates: Record<string, Lexeme[]> = {};

    for (const slot of pattern.slots) {
      slotCandidates[slot.name] = this.getCandidatesForSlot(
        slot,
        targetLexemes
      );
    }

    // 조합 생성 (간단한 버전: 각 슬롯의 첫 번째 후보만 선택)
    const combination: Record<string, Lexeme> = {};
    let hasValidCombination = true;

    for (const slot of pattern.slots) {
      const candidates = slotCandidates[slot.name];
      if (candidates.length === 0 && slot.required) {
        hasValidCombination = false;
        break;
      }
      if (candidates.length > 0) {
        combination[slot.name] = candidates[0]; // 첫 번째 후보 선택
      }
    }

    if (hasValidCombination) {
      combinations.push(combination);

      // 추가 조합 생성 (다른 후보들로)
      for (const slot of pattern.slots) {
        const candidates = slotCandidates[slot.name];
        if (candidates.length > 1) {
          const altCombination = { ...combination };
          altCombination[slot.name] = candidates[1]; // 두 번째 후보
          combinations.push(altCombination);
        }
      }
    }

    return combinations;
  }

  private getCandidatesForSlot(slot: any, targetLexemes?: string[]): Lexeme[] {
    let candidates: Lexeme[] = [];

    // POS로 필터링
    const acceptTypes = Array.isArray(slot.accept)
      ? slot.accept
      : [slot.accept];
    for (const pos of acceptTypes) {
      if (this.lexemesByPos[pos]) {
        candidates.push(...this.lexemesByPos[pos]);
      }
    }

    // 시맨틱 제약 필터링
    if (
      slot.semanticConstraint &&
      this.semanticConstraintMap[slot.semanticConstraint]
    ) {
      const allowedWords = this.semanticConstraintMap[slot.semanticConstraint];
      candidates = candidates.filter((lexeme) =>
        allowedWords.includes(lexeme.en.toLowerCase())
      );
    }

    // 타겟 어휘 우선순위
    if (targetLexemes) {
      const targetCandidates = candidates.filter((lexeme) =>
        targetLexemes.includes(lexeme.id || lexeme.en)
      );
      const otherCandidates = candidates.filter(
        (lexeme) => !targetLexemes.includes(lexeme.id || lexeme.en)
      );
      candidates = [...targetCandidates, ...otherCandidates];
    }

    return candidates.slice(0, 3); // 최대 3개 후보
  }

  private fillPattern(
    pattern: PatternSchema,
    combination: Record<string, Lexeme>
  ): {
    text: string;
    korean: string;
    used: string[];
    schemaId: string;
  } {
    let text = pattern.surface;
    let korean = pattern.koSurface;
    const used: string[] = [];

    // 플레이스홀더 치환
    for (const [slotName, lexeme] of Object.entries(combination)) {
      const placeholder = `{{${slotName}}}`;
      text = text.replace(new RegExp(placeholder, "g"), lexeme.en);
      korean = korean.replace(new RegExp(placeholder, "g"), lexeme.ko);
      used.push(lexeme.id || `${lexeme.en}_${lexeme.pos}`);
    }

    return {
      text,
      korean,
      used,
      schemaId: pattern.id,
    };
  }

  private calculateConfidence(
    combination: Record<string, Lexeme>,
    targetLexemes?: string[]
  ): number {
    if (!targetLexemes) return 1;

    const usedTargets = Object.values(combination).filter((lexeme) =>
      targetLexemes.includes(lexeme.id || lexeme.en)
    ).length;

    return usedTargets / Object.keys(combination).length;
  }
}
