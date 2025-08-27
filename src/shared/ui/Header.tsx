import React from "react";
import { LogOut } from "lucide-react";
import { useAppSelector } from "@/providers/AppProvider";
import { useAuthStore } from "@/stores/authStore";
import { useNavigate } from "react-router-dom";

export function Header() {
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();

  const dailyQueue = useAppSelector((state) => {
    const today = new Date().toISOString().split("T")[0];
    return state.sentences.filter((s) => s.nextDue <= today);
  });

  const settings = useAppSelector((state) => state.settings);

  const handleLogout = () => {
    logout();
    navigate("/landing");
  };

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">MyPattern</h1>
            {user && <p className="text-xs text-gray-500">{user.name}</p>}
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              오늘 복습: {dailyQueue.length}개
            </div>
            <div className="text-sm text-gray-600">
              목표: {settings.dailyGoal}개
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="로그아웃"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
