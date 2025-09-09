// src/stores/appStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { packDataService } from "@/shared/services/packDataService";
import type { PackData } from "@/types";

interface AppState {
  isAuthenticated: boolean;
  loading: boolean;
  user: any | null;
  selectedPackData: PackData | null;
  currentDay: number;
  _hasHydrated: boolean;
  contentVersion: string;
  selectedPackId: string | null; // 🔥 선택된 팩 ID
}

interface AppActions {
  login: () => Promise<void>;
  logout: () => void;
  setSelectedPackData: (packData: PackData) => void;
  setCurrentDay: (day: number) => void;
  initialize: () => void;
  setHasHydrated: (state: boolean) => void;

  // 🔥 새로운 팩 관리 메서드들
  loadPackById: (packId: string) => Promise<PackData | null>;
  refreshContentData: () => Promise<void>;
  autoRestoreRecentPack: () => Promise<void>;
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
      contentVersion: "1.0.0",
      selectedPackId: null,

      // --- 액션 ---
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      // 🔥 팩 ID로 데이터 로드
      loadPackById: async (packId: string) => {
        try {
          console.log(`🔍 Loading pack by ID: ${packId}`);

          // 사용 가능한 팩인지 확인
          const isAvailable = await packDataService.isPackAvailable(packId);
          if (!isAvailable) {
            console.warn(`⚠️ Pack not available: ${packId}`);
            return null;
          }

          const packData = await packDataService.loadPackData(packId);

          set({
            selectedPackData: packData,
            selectedPackId: packId,
            contentVersion: packData.version || "1.0.0",
          });

          console.log(`✅ Pack loaded successfully: ${packData.title}`);
          return packData;
        } catch (error) {
          console.error(`❌ Failed to load pack ${packId}:`, error);
          return null;
        }
      },

      // 🔥 콘텐츠 데이터 새로 고침 (동적)
      refreshContentData: async () => {
        console.log("🔄 Refreshing content data...");

        const state = get();
        const savedPackId = state.selectedPackId;

        if (savedPackId) {
          // 저장된 팩 ID로 데이터 로드
          const packData = await get().loadPackById(savedPackId);
          if (packData) {
            console.log(`✅ Restored pack data: ${packData.title}`);
            return;
          }
        }

        // 저장된 팩이 없으면 최근 팩 추론
        await get().autoRestoreRecentPack();
      },

      // 🔥 최근 팩 자동 복원
      autoRestoreRecentPack: async () => {
        try {
          console.log("🔍 Auto-restoring recent pack...");

          const recentPackId = await packDataService.inferRecentPackId();
          if (recentPackId) {
            await get().loadPackById(recentPackId);
            console.log(`✅ Auto-restored recent pack: ${recentPackId}`);
          } else {
            console.log("ℹ️ No recent pack found");
          }
        } catch (error) {
          console.error("❌ Failed to auto-restore recent pack:", error);
        }
      },

      validateContentCompatibility: () => {
        const state = get();
        if (!state.selectedPackData) return false;

        const currentData = state.selectedPackData;
        const hasNewIdStructure = currentData.contents?.some(
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

          // 🔥 로그인 후 콘텐츠 데이터 복원
          await get().refreshContentData();
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
          selectedPackId: null,
          currentDay: 1,
        });

        // 캐시도 정리
        packDataService.clearCache();
      },

      setSelectedPackData: (packData) => {
        if (!packData) return;

        set({
          selectedPackData: packData,
          selectedPackId: packData.id,
        });
        console.log(`📦 Selected pack: ${packData.id} (${packData.title})`);
      },

      setCurrentDay: (day) => set({ currentDay: day }),

      initialize: async () => {
        console.log("🔥 App initialization started");

        const state = get();
        if (state.isAuthenticated) {
          await get().refreshContentData();
        }

        console.log("✅ App initialization completed");
        console.log("📊 Cache stats:", packDataService.getCacheStats());
      },
    }),
    {
      name: "app-store-v4",
      storage: createJSONStorage(() => localStorage),

      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        currentDay: state.currentDay,
        contentVersion: state.contentVersion,
        selectedPackId: state.selectedPackId, // 🔥 중요: 팩 ID 저장
      }),

      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error("💥 App store hydration failed:", error);
        } else {
          console.log("✅ App store hydration completed");
          if (state) {
            state.setHasHydrated(true);
            state.initialize();
          }
        }
      },
    }
  )
);
