// src/features/learn/hooks/usePatternGenerator.ts
import { useState, useEffect, useMemo } from "react";
import { PatternGeneratorService } from "../../../services/patternGenerator";
import { VocabularyPack } from "../types/patternCore.types";

export const usePatternGenerator = (
  packs: VocabularyPack[],
  userLexemes: string[]
) => {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const generator = useMemo(() => new PatternGeneratorService(packs), [packs]);

  const generateCandidates = async () => {
    setLoading(true);
    try {
      const newCandidates = generator.generateCandidates(userLexemes, 10);
      setCandidates(newCandidates);
    } catch (error) {
      console.error("Pattern generation failed:", error);
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userLexemes.length > 0) {
      generateCandidates();
    }
  }, [userLexemes]);

  return {
    candidates,
    loading,
    regenerate: generateCandidates,
  };
};
