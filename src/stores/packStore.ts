// src/stores/packStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Pack } from "@/entities";
import { packLoader } from "@/services/packLoader";
import { logger } from "@/shared/utils/logger";

interface PackState {
  availablePacks: Pack[];
  selectedPack: Pack | null;
  isLoading: boolean;
  error: string | null;
}

interface PackActions {
  loadAvailablePacks: () => Promise<void>;
  selectPack: (packId: string) => Promise<void>;
  clearError: () => void;
  resetPacks: () => void;
}

export const usePackStore = create<PackState & PackActions>()(
  persist(
    (set, get) => ({
      // State
      availablePacks: [],
      selectedPack: null,
      isLoading: false,
      error: null,

      // Actions
      loadAvailablePacks: async () => {
        set({ isLoading: true, error: null });

        try {
          const packs = await packLoader.loadAllPacks();
          set({
            availablePacks: packs,
            isLoading: false,
          });

          logger.log(`✅ Loaded ${packs.length} packs`);
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Unknown error",
            isLoading: false,
          });
        }
      },

      selectPack: async (packId: string) => {
        set({ isLoading: true, error: null });

        try {
          const pack = await packLoader.loadPack(packId);
          set({
            selectedPack: pack,
            isLoading: false,
          });

          logger.log(`✅ Pack selected: ${pack.title}`);
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Unknown error",
            isLoading: false,
          });
        }
      },

      clearError: () => set({ error: null }),

      resetPacks: () =>
        set({
          availablePacks: [],
          selectedPack: null,
          isLoading: false,
          error: null,
        }),
    }),
    {
      name: "pack-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedPack: state.selectedPack, // 선택된 팩만 persist
      }),
    }
  )
);
