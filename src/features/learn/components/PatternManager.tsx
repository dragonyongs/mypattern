import React, { useState } from "react";
import { Plus, Edit, Trash2, Save, X } from "lucide-react";
import { translationEngine } from "../services/translationEngine";
import type { TranslationPattern } from "../services/translationEngine";

export const PatternManager: React.FC = () => {
  const [patterns, setPatterns] = useState<TranslationPattern[]>([]);
  const [editingPattern, setEditingPattern] =
    useState<TranslationPattern | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newPattern, setNewPattern] = useState<Partial<TranslationPattern>>({
    korean: "",
    english: "",
    level: "beginner",
    category: "",
    variations: [],
    usage: "",
  });

  const handleAddPattern = () => {
    if (newPattern.korean && newPattern.english) {
      const validation = translationEngine.validatePattern(
        newPattern.korean,
        newPattern.english
      );

      if (validation.isValid) {
        const added = translationEngine.addPattern({
          korean: newPattern.korean,
          english: newPattern.english,
          structure: "CUSTOM",
          level: newPattern.level || "beginner",
          category: newPattern.category || "custom",
          variations: newPattern.variations || [],
          usage: newPattern.usage || "",
        });

        setPatterns([...patterns, added]);
        setNewPattern({
          korean: "",
          english: "",
          level: "beginner",
          category: "",
          variations: [],
          usage: "",
        });
        setIsAddingNew(false);
      } else {
        alert("패턴 검증 실패: " + validation.issues.join(", "));
      }
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">패턴 관리</h2>
        <button
          onClick={() => setIsAddingNew(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>새 패턴 추가</span>
        </button>
      </div>

      {/* 새 패턴 추가 폼 */}
      {isAddingNew && (
        <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h3 className="font-medium text-gray-900 mb-3">새 패턴 추가</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                한국어
              </label>
              <input
                type="text"
                value={newPattern.korean || ""}
                onChange={(e) =>
                  setNewPattern({ ...newPattern, korean: e.target.value })
                }
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="안녕하세요"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                영어
              </label>
              <input
                type="text"
                value={newPattern.english || ""}
                onChange={(e) =>
                  setNewPattern({ ...newPattern, english: e.target.value })
                }
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Hello"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                레벨
              </label>
              <select
                value={newPattern.level || "beginner"}
                onChange={(e) =>
                  setNewPattern({ ...newPattern, level: e.target.value as any })
                }
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="beginner">초급</option>
                <option value="intermediate">중급</option>
                <option value="advanced">고급</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                카테고리
              </label>
              <input
                type="text"
                value={newPattern.category || ""}
                onChange={(e) =>
                  setNewPattern({ ...newPattern, category: e.target.value })
                }
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="greeting, request, etc."
              />
            </div>
          </div>

          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              사용법 설명
            </label>
            <textarea
              value={newPattern.usage || ""}
              onChange={(e) =>
                setNewPattern({ ...newPattern, usage: e.target.value })
              }
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="이 패턴이 언제 사용되는지 설명..."
            />
          </div>

          <div className="flex space-x-2 mt-4">
            <button
              onClick={handleAddPattern}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>저장</span>
            </button>
            <button
              onClick={() => setIsAddingNew(false)}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors flex items-center space-x-2"
            >
              <X className="h-4 w-4" />
              <span>취소</span>
            </button>
          </div>
        </div>
      )}

      {/* 패턴 목록 */}
      <div className="space-y-3">
        {patterns.map((pattern) => (
          <div
            key={pattern.id}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <span className="font-medium text-gray-900">
                    {pattern.korean}
                  </span>
                  <span className="text-gray-400">→</span>
                  <span className="font-medium text-blue-600">
                    {pattern.english}
                  </span>
                </div>

                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span className="bg-gray-100 px-2 py-1 rounded">
                    {pattern.level}
                  </span>
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {pattern.category}
                  </span>
                  {pattern.usage && (
                    <span className="italic">"{pattern.usage}"</span>
                  )}
                </div>

                {pattern.variations.length > 0 && (
                  <div className="mt-2 text-sm text-gray-600">
                    <strong>변형:</strong> {pattern.variations.join(", ")}
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setEditingPattern(pattern)}
                  className="text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setPatterns(patterns.filter((p) => p.id !== pattern.id));
                  }}
                  className="text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
