// src/features/learn/components/UserInputHub.tsx
import React, { useState } from "react";
import { Edit3, Hash, MessageSquare } from "lucide-react";
import { FreeWritingMode } from "./FreeWritingMode";
import { KeywordMode } from "./KeywordMode";
import { IntentMode } from "./IntentMode";

type InputMode = "freeform" | "keyword" | "intent";

export const UserInputHub: React.FC = () => {
  const [activeMode, setActiveMode] = useState<InputMode>("freeform");

  const modes = [
    {
      id: "freeform",
      label: "자유 영작",
      icon: Edit3,
      component: FreeWritingMode,
    },
    { id: "keyword", label: "키워드 생성", icon: Hash, component: KeywordMode },
    {
      id: "intent",
      label: "의도 기반",
      icon: MessageSquare,
      component: IntentMode,
    },
  ] as const;

  const ActiveComponent = modes.find(
    (mode) => mode.id === activeMode
  )?.component;

  return (
    <div className="space-y-4">
      {/* 모드 선택 탭 */}
      <div className="flex border-b">
        {modes.map((mode) => {
          const Icon = mode.icon;
          return (
            <button
              key={mode.id}
              onClick={() => setActiveMode(mode.id)}
              className={`flex items-center gap-2 px-4 py-2 font-medium text-sm transition-colors ${
                activeMode === mode.id
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              <Icon size={16} />
              {mode.label}
            </button>
          );
        })}
      </div>

      {/* 선택된 모드 컴포넌트 */}
      {ActiveComponent && <ActiveComponent />}
    </div>
  );
};
