import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { useAppDispatch, useAppSelector } from "@/providers/appHooks";
import { saveToStorage } from "@/providers/storage";
import { loadPackById } from "@/services/contentPackLoader";

type Pack = { id: string; title: string; level: "basic" | "advanced" };

const PACKS: Pack[] = [
  { id: "real-voca-basic", title: "리얼 보카 Basic", level: "basic" },
  { id: "real-voca-advanced", title: "리얼 보카 Advanced", level: "advanced" },
];

function PackCard({
  pack,
  onSelect,
}: {
  pack: Pack;
  onSelect: (p: Pack) => void;
}) {
  return (
    <button
      onClick={() => onSelect(pack)}
      className="w-full text-left p-4 rounded border hover:bg-gray-50"
    >
      <div className="text-lg font-semibold">{pack.title}</div>
      <div className="text-xs text-gray-500 mt-1 uppercase">{pack.level}</div>
    </button>
  );
}

export default function PacksPage() {
  const navigate = useNavigate();
  const { updateUser } = useAuthStore();
  const dispatch = useAppDispatch();
  const appState = useAppSelector((s) => s);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleSelect = async (pack: Pack) => {
    try {
      setLoadingId(pack.id);
      // 1) Pack 로드 & Sentence로 정규화
      const sentences = await loadPackById(pack.id);
      // 2) App 상태 갱신
      dispatch({ type: "UPDATE_SENTENCES", payload: sentences as any });
      // 3) 사용자 업데이트(선택 팩 기록)
      updateUser({
        selectedPackId: pack.id,
        selectedPackTitle: pack.title,
        startDate: new Date().toISOString(),
      } as any);
      // 4) 로컬 스토리지 저장(현 상태 + 신규 문장 반영)
      saveToStorage({
        ...appState,
        sentences: sentences as any,
      } as any);
      // 5) 학습 1일차로 이동
      navigate("/app/learn/day/1", { replace: true });
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">학습팩 선택</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PACKS.map((p) => (
          <div key={p.id} className="relative">
            <PackCard pack={p} onSelect={handleSelect} />
            {loadingId === p.id && (
              <div className="absolute inset-0 bg-white/70 flex items-center justify-center text-sm">
                불러오는 중...
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
