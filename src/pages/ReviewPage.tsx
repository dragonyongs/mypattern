import React from "react";
import { useAppSelector } from "@/providers/appHooks";

export default function ReviewPage() {
  const dailyQueue = useAppSelector((s) => s.dailyQueue ?? []);
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">오늘의 복습</h2>
      <p className="text-gray-600 mb-2">대기 문장: {dailyQueue.length}개</p>
      <div className="text-sm text-gray-500">
        카드 뷰/정답 판단 UI는 이후 단계에서 연결합니다.
      </div>
    </div>
  );
}
