// src/shared/ui/Navigation.tsx
import React from "react";
import { NavLink } from "react-router-dom";
import { BookOpen, Play, RotateCcw, Library, Settings } from "lucide-react";
import { useAppSelector } from "@/providers/appHooks";

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
    const today = new Date().toISOString().split("T");
    return state.sentences.filter((s) => s.nextDue <= today).length;
  });

  // 탭바 아이템
  return (
    <nav className="flex justify-between">
      {navigationItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              [
                "flex-1 flex flex-col items-center gap-1 py-2 text-xs rounded-md relative",
                isActive
                  ? "text-blue-700"
                  : "text-gray-600 hover:text-gray-900",
              ].join(" ")
            }
          >
            <Icon className="size-5" />
            <span>{item.shortLabel}</span>
            {item.path === "/app/review" && dailyQueueLength > 0 && (
              <span className="absolute -top-1 right-3 text-[10px] rounded-full bg-red-600 text-white px-1.5 py-0.5">
                {dailyQueueLength}
              </span>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
