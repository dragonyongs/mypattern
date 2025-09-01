import React from "react";
import { useParams, Link } from "react-router-dom";
import { useAppSelector } from "@/providers/appHooks";

export default function LearnPage() {
  const { day } = useParams();
  const dailyQueue = useAppSelector((s) => s.dailyQueue ?? []);
  const dueCount = dailyQueue.length;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">학습 {day ? `${day}일차` : "시작"}</h2>
      <p className="text-gray-600">오늘 복습 대기: {dueCount}개</p>
      <div className="flex gap-3">
        <Link
          to="/app/review"
          className="px-4 py-2 rounded bg-blue-600 text-white"
        >
          오늘 복습 시작
        </Link>
        <Link to="/app/packs" className="px-4 py-2 rounded border">
          학습팩 변경
        </Link>
      </div>
    </div>
  );
}
