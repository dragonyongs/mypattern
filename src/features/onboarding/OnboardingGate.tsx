// src/features/onboarding/OnboardingGate.tsx
import React, { useEffect, useState } from "react";
import { useLearningStore } from "@/stores/learningStore";
import { ScenarioPickerModal } from "./ScenarioPickerModal";

export const OnboardingGate: React.FC = () => {
  const {
    firstRunDone,
    selectedScenario,
    initializeLearning,
    dailyPatterns,
    buildDailyFromScenario,
  } = useLearningStore();
  const [show, setShow] = useState(false);

  useEffect(() => {
    initializeLearning();
  }, [initializeLearning]);

  useEffect(() => {
    if (!firstRunDone || !selectedScenario) {
      setShow(true);
    } else {
      setShow(false);
      if (selectedScenario && dailyPatterns.length === 0) {
        buildDailyFromScenario();
      }
    }
  }, [
    firstRunDone,
    selectedScenario,
    dailyPatterns.length,
    buildDailyFromScenario,
  ]);

  if (!show) return null;
  return <ScenarioPickerModal onClose={() => setShow(false)} />;
};
