// src/services/patternGenerator.ts
import {
  PatternInstantiator,
  PatternInstance,
} from "../utils/patternInstantiator";
import {
  VocabularyPack,
  Lexeme,
} from "../features/learn/types/patternCore.types";
import semanticConstraintsData from "../data/semanticConstraints.json";

export class PatternGeneratorService {
  private allLexemes: Lexeme[] = [];
  private allPatterns: any[] = [];
  private instantiator: PatternInstantiator;

  constructor(packs: VocabularyPack[]) {
    this.loadFromPacks(packs);
    this.instantiator = new PatternInstantiator(
      this.allLexemes,
      semanticConstraintsData
    );
  }

  private loadFromPacks(packs: VocabularyPack[]) {
    this.allLexemes = [];
    this.allPatterns = [];

    packs.forEach((pack) => {
      this.allLexemes.push(...pack.lexemes);
      if (pack.patterns) {
        this.allPatterns.push(...pack.patterns);
      }
    });
  }

  /**
   * 사용자 어휘에 기반한 문장 후보 생성
   */
  generateCandidates(userLexemes: string[], maxCount = 10): PatternInstance[] {
    const candidates: PatternInstance[] = [];

    // 모든 패턴에 대해 인스턴스 생성
    for (const pattern of this.allPatterns) {
      const instances = this.instantiator.instantiatePattern(
        pattern,
        userLexemes
      );
      candidates.push(...instances);
    }

    // 신뢰도 순으로 정렬 후 반환
    return candidates
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxCount)
      .map((candidate, index) => ({
        ...candidate,
        id: `candidate-${Date.now()}-${index}`,
        isAdded: false,
      }));
  }

  /**
   * 특정 패턴으로 문장 생성
   */
  generateFromPattern(
    patternId: string,
    userLexemes?: string[]
  ): PatternInstance[] {
    const pattern = this.allPatterns.find((p) => p.id === patternId);
    if (!pattern) return [];

    return this.instantiator.instantiatePattern(pattern, userLexemes);
  }
}
