import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "@/providers/AppProvider";
import { LandingPage } from "@/pages/LandingPage";
import { LevelTestPage } from "@/pages/onboarding/LevelTestPage";
import { LevelResultPage } from "@/pages/onboarding/LevelResultPage";
import { InterestsPage } from "@/pages/onboarding/InterestsPage";
import { LearnPage } from "@/pages/LearnPage";
import { BuildPage } from "@/pages/BuildPage";
import { ReviewPage } from "@/pages/ReviewPage";
import { LibraryPage } from "@/pages/LibraryPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { MainLayout } from "./layouts/MainLayout";
import "../index.css";

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/onboarding/level-test" element={<LevelTestPage />} />
          <Route
            path="/onboarding/level-result"
            element={<LevelResultPage />}
          />{" "}
          {/* 추가 */}
          <Route path="/onboarding/interests" element={<InterestsPage />} />
          <Route path="/app/*" element={<MainLayout />}>
            <Route path="learn" element={<LearnPage />} />
            <Route path="build" element={<BuildPage />} />
            <Route path="review" element={<ReviewPage />} />
            <Route path="library" element={<LibraryPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
