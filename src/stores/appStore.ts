// src/stores/appStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { PackData } from "@/types";

// 실제 팩 데이터 import (경로 수정)
import realVocaBasicData from "../../public/data/packs/real-voca-basic.json";

interface AppState {
  // 인증 상태
  isAuthenticated: boolean;
  loading: boolean;
  user: any | null;

  // 학습 상태
  selectedPackData: PackData | null;
  currentDay: number;

  // hydration 상태
  _hasHydrated: boolean;
}

interface AppActions {
  // 인증 액션
  login: () => Promise<void>;
  logout: () => void;

  // 학습 액션
  setSelectedPackData: (packData: PackData) => void;
  setCurrentDay: (day: number) => void;

  // 유틸리티
  initialize: () => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAppStore = create<AppState & AppActions>()(
  persist(
    (set, get) => ({
      // --- 상태 (State) ---
      isAuthenticated: false,
      loading: false,
      user: null,
      selectedPackData: null,
      currentDay: 1,
      _hasHydrated: false,

      // --- 액션 (Actions) ---
      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
      },

      login: async () => {
        console.log("🔥 Login process started");
        set({ loading: true });

        try {
          // 데모 로그인 시뮬레이션
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

          console.log("✅ Login successful");
        } catch (error) {
          console.error("❌ Login failed:", error);
          set({ loading: false });
          throw error;
        }
      },

      logout: () => {
        console.log("🔥 Logout process started");
        set({
          isAuthenticated: false,
          user: null,
          selectedPackData: null,
          currentDay: 1,
        });
        console.log("✅ Logout completed");
      },

      setSelectedPackData: (packData) => {
        console.log("🔥 Setting selected pack data:", packData?.title);
        if (!packData) {
          console.error("❌ Invalid packData provided to setSelectedPackData");
          return;
        }
        set({ selectedPackData: packData });
      },

      setCurrentDay: (day) => {
        console.log("🔥 Setting current day:", day);
        set({ currentDay: day });
      },

      initialize: () => {
        console.log("🔥 App initialization started");
        const state = get();

        // 이미 팩이 선택되어 있지 않고 인증되어 있다면 기본 팩 설정
        if (state.isAuthenticated && !state.selectedPackData) {
          try {
            set({ selectedPackData: realVocaBasicData as PackData });
            console.log("✅ Default pack data set");
          } catch (error) {
            console.error("❌ Failed to set default pack data:", error);
          }
        }

        console.log("✅ App initialization completed");
      },
    }),
    {
      name: "app-store-v2",
      storage: createJSONStorage(() => localStorage),
      // [중요] 함수 제외하고 상태만 저장
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        selectedPackData: state.selectedPackData,
        currentDay: state.currentDay,
      }),
      // [중요] hydration 완료 후 함수 복원 및 초기화
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error("💥 App store hydration failed:", error);
        } else {
          console.log("✅ App store hydration completed");
          if (state) {
            // hydration 완료 표시
            state.setHasHydrated(true);
            // 초기화 실행
            state.initialize();
          }
        }
      },
    }
  )
);
