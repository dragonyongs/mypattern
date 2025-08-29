// src/shared/services/dataPackLoader.ts
import type {
  Lexeme,
  POS,
  LangTag,
} from "@/features/learn/types/patternCore.types";

interface DataPack {
  packId: string;
  version: string;
  domains: string[];
  category: string;
  size: number;
  lexemes: Lexeme[];
  patterns?: PatternSchema[];
}

interface PatternSchema {
  id: string;
  category: LangTag;
  level: "beginner" | "intermediate" | "advanced";
  surface: string;
  slots: Array<{
    name: string;
    accept: POS;
    required: boolean;
  }>;
}

class DataPackLoader {
  private loadedPacks: Map<string, DataPack> = new Map();
  private allLexemes: Lexeme[] = [];
  private allPatterns: PatternSchema[] = [];

  async loadCorePacks(): Promise<void> {
    const packIndex = await this.loadPackIndex();

    // 병렬로 모든 팩 로드
    const loadPromises = packIndex.packs.map(async (packInfo) => {
      try {
        const pack = await this.loadDataPack(packInfo.file);
        this.loadedPacks.set(pack.packId, pack);

        // 전체 lexemes와 patterns 업데이트
        this.allLexemes.push(...pack.lexemes);
        if (pack.patterns) {
          this.allPatterns.push(...pack.patterns);
        }

        console.log(`✅ 데이터팩 로드됨: ${pack.packId} (${pack.size}개 단어)`);
      } catch (error) {
        console.error(`❌ 데이터팩 로드 실패: ${packInfo.file}`, error);
      }
    });

    await Promise.all(loadPromises);
    console.log(
      `🎯 총 ${this.allLexemes.length}개 단어, ${this.allPatterns.length}개 패턴 로드 완료`
    );
  }

  private async loadPackIndex() {
    const response = await fetch("/data/pack-index.json");
    return response.json();
  }

  private async loadDataPack(file: string): Promise<DataPack> {
    const response = await fetch(`/data/${file}`);
    return response.json();
  }

  // 카테고리별 lexemes 반환
  getLexemesByCategory(categories: LangTag[]): Lexeme[] {
    return this.allLexemes.filter((lexeme) =>
      lexeme.tags.some((tag) => categories.includes(tag))
    );
  }

  // POS별 lexemes 반환
  getLexemesByPos(pos: POS[], categories?: LangTag[]): Lexeme[] {
    let filtered = this.allLexemes.filter((lexeme) => pos.includes(lexeme.pos));

    if (categories?.length) {
      filtered = filtered.filter((lexeme) =>
        lexeme.tags.some((tag) => categories.includes(tag))
      );
    }

    return filtered;
  }

  // 패턴 검색
  getPatternsByCategory(categories: LangTag[]): PatternSchema[] {
    return this.allPatterns.filter((pattern) =>
      categories.includes(pattern.category)
    );
  }

  // 모든 데이터 반환
  getAllLexemes(): Lexeme[] {
    return [...this.allLexemes];
  }

  getAllPatterns(): PatternSchema[] {
    return [...this.allPatterns];
  }

  // 특정 팩 데이터 반환
  getPackData(packId: string): DataPack | null {
    return this.loadedPacks.get(packId) || null;
  }
}

export const dataPackLoader = new DataPackLoader();
