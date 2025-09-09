// src/stores/appStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { PackData } from "@/types";

// 🔥 콘텐츠 데이터는 항상 최신 JSON에서 로드
import realVocaBasicData from "../data/packs/real-voca-basic.json";

interface AppState {
  isAuthenticated: boolean;
  loading: boolean;
  user: any | null;
  selectedPackData: PackData | null;
  currentDay: number;
  _hasHydrated: boolean;

  // 🔥 콘텐츠 버전 관리 (단순화)
  contentVersion: string;
}

interface AppActions {
  login: () => Promise<void>;
  logout: () => void;
  setSelectedPackData: (packData: PackData) => void;
  setCurrentDay: (day: number) => void;
  initialize: () => void;
  setHasHydrated: (state: boolean) => void;

  // 🔥 콘텐츠 데이터 관리
  refreshContentData: () => void;
  validateContentCompatibility: () => boolean;
}

export const useAppStore = create<AppState & AppActions>()(
  persist(
    (set, get) => ({
      // --- 상태 ---
      isAuthenticated: false,
      loading: false,
      user: null,
      selectedPackData: null,
      currentDay: 1,
      _hasHydrated: false,
      contentVersion: "1.0.0", // 🔥 단순한 버전 관리

      // --- 액션 ---
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      // 🔥 콘텐츠 데이터 새로 고침 (JSON에서 다시 로드)
      refreshContentData: () => {
        console.log("🔄 Refreshing content data from JSON...");
        try {
          const latestData = realVocaBasicData as PackData;
          set({
            selectedPackData: latestData,
            contentVersion: latestData.version || "1.0.0",
          });
          console.log("✅ Content data refreshed");
        } catch (error) {
          console.error("❌ Failed to refresh content data:", error);
        }
      },

      // 🔥 콘텐츠 호환성 검증 (ID 구조 변경 감지)
      validateContentCompatibility: () => {
        const state = get();
        const currentData = realVocaBasicData as PackData;

        // 간단한 호환성 체크 (콘텐츠 ID 패턴 확인)
        if (!currentData.contents || currentData.contents.length === 0) {
          return false;
        }

        // 새로운 카테고리 기반 ID 구조인지 확인
        const hasNewIdStructure = currentData.contents.some(
          (item) => item.id && item.id.includes("-") && item.category
        );

        return hasNewIdStructure;
      },

      login: async () => {
        console.log("🔥 Login process started");
        set({ loading: true });

        try {
          await new Promise((resolve) => setTimeout(resolve, 1000));

          const demoUser = {
            id: "demo-user",
            name: "Demo User",
            email: "demo@example.com",
          };

          set({
            isAuthenticated: true,
            user: demoUser,
            loading: false,
          });

          // 🔥 로그인 후 최신 콘텐츠 데이터 로드
          get().refreshContentData();

          console.log("✅ Login successful");
        } catch (error) {
          console.error("❌ Login failed:", error);
          set({ loading: false });
          throw error;
        }
      },

      logout: () => {
        set({
          isAuthenticated: false,
          user: null,
          selectedPackData: null,
          currentDay: 1,
        });
      },

      setSelectedPackData: (packData) => {
        if (!packData) return;
        set({ selectedPackData: packData });
      },

      setCurrentDay: (day) => set({ currentDay: day }),

      initialize: () => {
        console.log("🔥 App initialization started");
        const state = get();

        // 🔥 항상 최신 콘텐츠 데이터 로드
        if (state.isAuthenticated) {
          get().refreshContentData();
        }

        console.log("✅ App initialization completed");
      },
    }),
    {
      name: "app-store-v3",
      storage: createJSONStorage(() => localStorage),

      // 🔥 콘텐츠 데이터는 제외하고 앱 상태만 저장
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        currentDay: state.currentDay,
        contentVersion: state.contentVersion, // 버전 정보만 저장
        // selectedPackData는 제외 - 항상 JSON에서 로드
      }),

      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error("💥 App store hydration failed:", error);
        } else {
          console.log("✅ App store hydration completed");
          if (state) {
            state.setHasHydrated(true);
            state.initialize(); // 최신 콘텐츠 데이터 로드
          }
        }
      },
    }
  )
);
