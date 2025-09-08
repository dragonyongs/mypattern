// src/hooks/useHydration.ts
import { useState, useEffect } from "react";
import { useStudyProgressStore } from "@/stores/studyProgressStore";

export const useHydration = () => {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const unsubHydrate = useStudyProgressStore.persist.onHydrate(() =>
      setHydrated(false)
    );
    const unsubFinishHydration =
      useStudyProgressStore.persist.onFinishHydration(() => setHydrated(true));

    setHydrated(useStudyProgressStore.persist.hasHydrated());

    return () => {
      unsubHydrate();
      unsubFinishHydration();
    };
  }, []);

  return hydrated;
};
