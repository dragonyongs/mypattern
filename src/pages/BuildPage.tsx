import React, { useState, useCallback, useEffect } from "react";
import { Volume2 } from "lucide-react";
import { useAppSelector } from "@/providers/AppProvider";
import type { Pattern } from "@/entities";

export function BuildPage() {
  const patterns = useAppSelector((state) => state.patterns);
  const [buildInput, setBuildInput] = useState("");
  const [generatedVariations, setGeneratedVariations] = useState<
    Array<{
      id: string;
      text: string;
      korean: string;
      isGenerated: boolean;
    }>
  >([]);

  const generateVariations = useCallback(
    (input: string, patternId: string) => {
      if (!input.trim()) {
        setGeneratedVariations([]);
        return;
      }

      const pattern = patterns.find((p) => p.id === patternId);
      if (!pattern) return;

      // 슬롯 변형 생성 시뮬레이션
      const variations = pattern.examples.map((example, idx) => ({
        id: `gen_${idx}`,
        text: pattern.template.replace(/X/g, example),
        korean: `생성된 문장 ${idx + 1}`,
        isGenerated: true,
      }));

      setGeneratedVariations(variations);
    },
    [patterns]
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (patterns.length > 0) {
        generateVariations(buildInput, patterns[0].id);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [buildInput, generateVariations, patterns]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">패턴 빌더</h2>
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            슬롯 입력 (장소명)
          </label>
          <input
            type="text"
            value={buildInput}
            onChange={(e) => setBuildInput(e.target.value)}
            placeholder="예: hospital, post office, library"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {generatedVariations.length > 0 && (
          <div className="border-t pt-4">
            <h3 className="font-medium text-gray-800 mb-3">생성된 변형들</h3>
            <div className="space-y-2">
              {generatedVariations.map((variation) => (
                <div
                  key={variation.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                >
                  <div>
                    <div className="font-medium">{variation.text}</div>
                    <div className="text-sm text-gray-500">
                      {variation.korean}
                    </div>
                  </div>
                  <Volume2 className="h-4 w-4 text-gray-400 cursor-pointer hover:text-blue-500" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
