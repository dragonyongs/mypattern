// src/features/onboarding/ScenarioPickerModal.tsx
import React, { useMemo, useState } from "react";
import { MapPin, Check, X, ArrowRight } from "lucide-react";
import { useLearningStore } from "@/stores/learningStore";

const PLACES = ["street", "station", "cafe", "office"] as const;
const INTENTS = [
  { id: "bus_stop", label: "버스 정류장 위치 묻기" },
  { id: "ask_direction", label: "길 안내/방향 묻기" },
  { id: "order", label: "주문/요청하기" },
  { id: "small_talk", label: "짧은 대화" },
] as const;

export const ScenarioPickerModal: React.FC<{ onClose: () => void }> = ({
  onClose,
}) => {
  const {
    setScenario,
    buildDailyFromScenario,
    skipScenarioWithSamples,
    finishFirstRun,
  } = useLearningStore();
  const [place, setPlace] = useState<(typeof PLACES)[number]>("street");
  const [intent, setIntent] =
    useState<(typeof INTENTS)[number]["id"]>("bus_stop");
  const [kw, setKw] = useState<string>("bus stop, crosswalk, median");
  const preview = useMemo(
    () =>
      kw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    [kw]
  );

  const handleConfirm = () => {
    const scenario = {
      id: `sc_${Date.now()}`,
      place,
      intent: intent as any,
      keywords: preview,
      createdAt: new Date().toISOString(),
    };
    setScenario(scenario);
    buildDailyFromScenario();
    finishFirstRun();
    onClose();
  };

  const handleSkip = () => {
    skipScenarioWithSamples();
    finishFirstRun();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-xl">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="font-semibold">
            상황을 선택하면 바로 패턴을 만들어드려요
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <div className="text-sm text-gray-600 mb-1">장소</div>
            <div className="grid grid-cols-4 gap-2">
              {PLACES.map((p) => (
                <button
                  key={p}
                  onClick={() => setPlace(p)}
                  className={`px-3 py-2 rounded border text-sm capitalize ${
                    place === p
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-600 mb-1">의도</div>
            <div className="grid grid-cols-2 gap-2">
              {INTENTS.map((it) => (
                <button
                  key={it.id}
                  onClick={() => setIntent(it.id)}
                  className={`px-3 py-2 rounded border text-sm ${
                    intent === it.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {it.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-600 mb-1">
              핵심 키워드(쉼표로 구분)
            </div>
            <input
              value={kw}
              onChange={(e) => setKw(e.target.value)}
              className="w-full border rounded p-2"
              placeholder="bus stop, crosswalk, median"
            />
            {preview.length > 0 && (
              <div className="text-xs text-gray-500 mt-2">
                키워드: {preview.join(" · ")}
              </div>
            )}
          </div>

          <div className="p-3 bg-gray-50 rounded">
            <div className="text-sm font-medium mb-1">예상 패턴 미리보기</div>
            <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
              <li>Excuse me, where is [PLACE]?</li>
              <li>Which bus should I take to [PLACE]?</li>
              <li>Is it near the [LANDMARK]?</li>
            </ul>
            <div className="text-xs text-gray-500 mt-1">
              확정 후 [PLACE]/[LANDMARK] 자리에 키워드가 자동으로 들어갑니다
            </div>
          </div>
        </div>

        <div className="p-4 border-t flex justify-between">
          <button
            onClick={handleSkip}
            className="px-4 py-2 rounded border text-gray-700 hover:bg-gray-50"
          >
            건너뛰기
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
          >
            <span>패턴 만들기</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
