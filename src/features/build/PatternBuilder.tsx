import React, { memo, useCallback, useState } from "react";

interface PatternBuilderProps {
  onSlotChange?: (value: string) => void;
}

export const PatternBuilder = memo(function PatternBuilder({
  onSlotChange,
}: PatternBuilderProps) {
  const [value, setValue] = useState("");

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setValue(v);
      onSlotChange?.(v);
    },
    [onSlotChange]
  );

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Build</h1>
      <div className="space-y-3">
        <input
          value={value}
          onChange={onChange}
          className="border border-gray-300 rounded px-3 py-2 w-full"
          placeholder="패턴의 슬롯을 채워보세요..."
        />
        <p className="text-sm text-gray-500">패턴 기반 문장 생성 도구</p>
      </div>
    </div>
  );
});

// 기본 내보내기도 추가 (라우터에서 사용)
export default function PatternBuilderPage() {
  return <PatternBuilder />;
}
