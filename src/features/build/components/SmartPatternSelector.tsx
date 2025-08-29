// src/features/build/components/SmartPatternSelector.tsx

export const SmartPatternSelector: React.FC<PatternSelectorProps> = ({
  patterns,
  userInput,
  onPatternSelect,
}) => {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 p-3 rounded-lg">
        <h3 className="font-medium text-blue-900">
          "{userInput}"와 비슷한 상황들
        </h3>
        <p className="text-sm text-blue-700 mt-1">
          매칭된 키워드: {/* 매칭된 키워드들 표시 */}
        </p>
      </div>

      {patterns.map((pattern, index) => (
        <div
          key={pattern.id}
          className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
          onClick={() => onPatternSelect(pattern)}
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
              {Math.round(pattern.matchScore * 100)}% 일치
            </span>
            <span className="text-xs text-gray-500">{pattern.scenario}</span>
          </div>

          <div className="space-y-2">
            <p className="font-medium">{pattern.userSide.korean}</p>
            <p className="text-gray-600">{pattern.userSide.english}</p>
          </div>

          {/* 매칭 이유 표시 */}
          <div className="mt-2 text-xs text-gray-500">
            💡 이런 이유로 추천했어요: {pattern.matchReason}
          </div>
        </div>
      ))}
    </div>
  );
};
