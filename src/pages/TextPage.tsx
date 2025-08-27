import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

export function TestPage() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-red-100 p-8">
      <h1 className="text-2xl font-bold mb-4">테스트 페이지</h1>
      <p>현재 경로: {location.pathname}</p>
      <div className="mt-4 space-x-4">
        <button
          onClick={() => navigate("/")}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          홈으로
        </button>
        <button
          onClick={() => navigate("/onboarding/level-test")}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          레벨 테스트로
        </button>
      </div>
    </div>
  );
}
