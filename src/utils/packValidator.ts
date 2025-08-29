// src/utils/packValidator.ts
import {
  VocabularyPack,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from "../features/learn/types/patternCore.types";

export class PackValidator {
  static validatePack(pack: VocabularyPack): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // 기본 필드 검증
    this.validateBasicFields(pack, errors);

    // 패턴 검증
    if (pack.patterns) {
      this.validatePatterns(pack.patterns, errors, warnings);
    }

    // 어휘 검증
    this.validateLexemes(pack.lexemes, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private static validateBasicFields(
    pack: VocabularyPack,
    errors: ValidationError[]
  ) {
    if (!pack.packId) {
      errors.push({
        field: "packId",
        message: "packId is required",
        severity: "error",
      });
    }

    if (!pack.version || !this.isValidSemVer(pack.version)) {
      errors.push({
        field: "version",
        message: "Valid SemVer version required",
        severity: "error",
      });
    }
  }

  private static validatePatterns(
    patterns: any[],
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ) {
    patterns.forEach((pattern, index) => {
      const prefix = `patterns[${index}]`;

      if (!pattern.koSurface || pattern.koSurface.trim() === "") {
        errors.push({
          field: `${prefix}.koSurface`,
          message: "koSurface is required for all patterns",
          severity: "error",
        });
      }

      if (!pattern.surface) {
        errors.push({
          field: `${prefix}.surface`,
          message: "surface is required",
          severity: "error",
        });
      }

      // 플레이스홀더 일관성 검사
      const enPlaceholders = this.extractPlaceholders(pattern.surface);
      const koPlaceholders = this.extractPlaceholders(pattern.koSurface);

      if (enPlaceholders.length !== koPlaceholders.length) {
        warnings.push({
          field: `${prefix}.placeholders`,
          message: "Placeholder count mismatch between surface and koSurface",
          suggestion: "Ensure both versions have same placeholders",
        });
      }
    });
  }

  private static validateLexemes(
    lexemes: any[],
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ) {
    lexemes.forEach((lexeme, index) => {
      const prefix = `lexemes[${index}]`;

      if (!lexeme.en || !lexeme.ko) {
        errors.push({
          field: `${prefix}.translation`,
          message: "Both en and ko fields are required",
          severity: "error",
        });
      }

      if (!lexeme.pos) {
        errors.push({
          field: `${prefix}.pos`,
          message: "pos (part of speech) is required",
          severity: "error",
        });
      }
    });
  }

  private static extractPlaceholders(text: string): string[] {
    const matches = text.match(/\{\{(\w+)\}\}/g);
    return matches ? matches.map((m) => m.slice(2, -2)) : [];
  }

  private static isValidSemVer(version: string): boolean {
    const semverRegex =
      /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*)?(?:\+[0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*)?$/;
    return semverRegex.test(version);
  }
}
