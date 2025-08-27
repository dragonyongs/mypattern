import React from "react";
import { Outlet } from "react-router-dom";
import { Header } from "@/shared/ui/Header";
import { Navigation } from "@/shared/ui/Navigation";

export function MainLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Navigation />
        <main className="mt-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
