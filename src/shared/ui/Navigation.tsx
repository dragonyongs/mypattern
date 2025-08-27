import React from "react";
import { NavLink } from "react-router-dom";
import { BookOpen, Play, RotateCcw, Library, Settings } from "lucide-react";
import { useAppSelector } from "@/providers/AppProvider";

const navigationItems = [
  { path: "/app/learn", icon: BookOpen, label: "Learn", shortLabel: "학습" },
  { path: "/app/build", icon: Play, label: "Build", shortLabel: "빌드" },
  { path: "/app/review", icon: RotateCcw, label: "Review", shortLabel: "복습" },
  {
    path: "/app/library",
    icon: Library,
    label: "Library",
    shortLabel: "보관함",
  },
  {
    path: "/app/settings",
    icon: Settings,
    label: "Settings",
    shortLabel: "설정",
  },
];

export function Navigation() {
  const dailyQueueLength = useAppSelector((state) => {
    const today = new Date().toISOString().split("T")[0];
    return state.sentences.filter((s) => s.nextDue <= today).length;
  });

  return (
    <nav className="w-full">
      {/* 데스크톱 네비게이션 */}
      <div className="hidden sm:flex space-x-1 bg-white rounded-lg p-1 shadow-sm border">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
              {item.path === "/app/review" && dailyQueueLength > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 ml-1">
                  {dailyQueueLength}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* 모바일 네비게이션 */}
      <div className="sm:hidden bg-white rounded-lg shadow-sm border">
        <div className="grid grid-cols-5 gap-1 p-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center p-2 rounded-md text-xs font-medium transition-colors relative ${
                    isActive
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`
                }
              >
                <Icon className="h-4 w-4 mb-1" />
                <span className="text-xs">{item.shortLabel}</span>
                {item.path === "/app/review" && dailyQueueLength > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center">
                    {dailyQueueLength}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
