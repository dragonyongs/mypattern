// src/stores/drawingStore.ts - 수정된 버전
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/lib/supabaseClient";
import { useAppStore } from "@/stores/appStore";

interface DrawingData {
  id: string;
  user_id: string;
  pack_id: string;
  item_id: string;
  item_type: "vocab" | "sentence";
  svg_data: string;
  created_at: string;
  updated_at: string;
}

interface DrawingStore {
  drawings: Record<string, DrawingData>; // key: `${pack_id}-${item_id}`
  isLoading: boolean;
  error: string | null;

  // Actions
  setDrawing: (drawing: DrawingData) => void;
  getDrawing: (packId: string, itemId: string) => DrawingData | null;
  removeDrawing: (packId: string, itemId: string) => void;
  saveDrawing: (
    packId: string,
    itemId: string,
    itemType: "vocab" | "sentence",
    svgData: string
  ) => Promise<void>;
  loadUserDrawings: (userId: string, packId: string) => Promise<void>;
  clearDrawings: () => void;
}

const useDrawingStore = create<DrawingStore>()(
  persist(
    (set, get) => ({
      drawings: {},
      isLoading: false,
      error: null,

      setDrawing: (drawing) => {
        const key = `${drawing.pack_id}-${drawing.item_id}`;
        set((state) => ({
          drawings: { ...state.drawings, [key]: drawing },
        }));
      },

      getDrawing: (packId, itemId) => {
        const key = `${packId}-${itemId}`;
        return get().drawings[key] || null;
      },

      removeDrawing: (packId, itemId) => {
        const key = `${packId}-${itemId}`;
        set((state) => {
          const { [key]: removed, ...rest } = state.drawings;
          return { drawings: rest };
        });
      },

      saveDrawing: async (packId, itemId, itemType, svgData) => {
        set({ isLoading: true, error: null });

        try {
          const { user } = useAppStore.getState();

          if (!user?.id) {
            throw new Error("User not authenticated");
          }

          // 데이터 검증 및 정리 - 더 관대한 조건으로 수정
          const cleanSvgData =
            typeof svgData === "string" ? svgData.trim() : "";

          // 빈 배열 '[]'이나 빈 데이터도 허용 (레거시 데이터 삭제 용도)
          if (cleanSvgData === null || cleanSvgData === undefined) {
            throw new Error("SVG data cannot be null or undefined");
          }

          console.log("💾 Saving drawing:", {
            packId,
            itemId,
            dataLength: cleanSvgData.length,
            preview: cleanSvgData.substring(0, 100) + "...",
            isEmpty: cleanSvgData === "" || cleanSvgData === "[]",
          });

          const isDemoUser = user.id === "demo-user";

          if (isDemoUser) {
            console.log("🎭 Demo user detected - saving to localStorage only");

            const drawingData: DrawingData = {
              id: `drawing-${Date.now()}`,
              user_id: user.id,
              pack_id: packId,
              item_id: itemId,
              item_type: itemType,
              svg_data: cleanSvgData,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            get().setDrawing(drawingData);
          } else {
            console.log("🔗 Real user detected - saving to Supabase");

            // 먼저 기존 레코드가 있는지 확인
            const { data: existingData, error: selectError } = await supabase
              .from("user_drawings")
              .select("*")
              .eq("user_id", user.id)
              .eq("pack_id", packId)
              .eq("item_id", itemId)
              .maybeSingle();

            if (selectError && selectError.code !== "PGRST116") {
              // PGRST116은 "no rows found" 에러이므로 무시
              throw selectError;
            }

            let result;
            const drawingPayload = {
              user_id: user.id,
              pack_id: packId,
              item_id: itemId,
              item_type: itemType,
              svg_data: cleanSvgData,
              updated_at: new Date().toISOString(),
            };

            if (existingData) {
              // 기존 레코드가 있으면 업데이트
              console.log("📝 Updating existing drawing record");
              const { data, error } = await supabase
                .from("user_drawings")
                .update({
                  svg_data: cleanSvgData,
                  updated_at: new Date().toISOString(),
                })
                .eq("user_id", user.id)
                .eq("pack_id", packId)
                .eq("item_id", itemId)
                .select()
                .single();

              if (error) throw error;
              result = data;
            } else {
              // 기존 레코드가 없으면 새로 삽입
              console.log("➕ Creating new drawing record");
              const { data, error } = await supabase
                .from("user_drawings")
                .insert({
                  ...drawingPayload,
                  created_at: new Date().toISOString(),
                })
                .select()
                .single();

              if (error) throw error;
              result = data;
            }

            get().setDrawing(result);
          }

          console.log(`✅ Drawing saved successfully for ${packId}-${itemId}`);
        } catch (error: any) {
          console.error("❌ Failed to save drawing:", error);
          set({ error: error.message || "Drawing save failed" });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      loadUserDrawings: async (userId, packId) => {
        set({ isLoading: true, error: null });

        try {
          const isDemoUser = userId === "demo-user";

          if (isDemoUser) {
            console.log("🎭 Demo user - drawings loaded from localStorage");

            // pack_id에 해당하는 그림만 필터링
            const allDrawings = get().drawings;
            const packDrawings: Record<string, DrawingData> = {};

            Object.entries(allDrawings).forEach(([key, drawing]) => {
              if (drawing.pack_id === packId && drawing.user_id === userId) {
                packDrawings[key] = drawing;
              }
            });

            set((state) => ({
              drawings: { ...state.drawings, ...packDrawings },
            }));
          } else {
            console.log("🔗 Real user - loading from Supabase");

            const { data, error } = await supabase
              .from("user_drawings")
              .select("*")
              .eq("user_id", userId)
              .eq("pack_id", packId);

            if (error) throw error;

            const drawingsMap: Record<string, DrawingData> = {};
            (data || []).forEach((drawing) => {
              const key = `${drawing.pack_id}-${drawing.item_id}`;
              drawingsMap[key] = drawing;
            });

            set((state) => ({
              drawings: { ...state.drawings, ...drawingsMap },
            }));

            console.log(
              `📥 Loaded ${data?.length || 0} drawings for pack ${packId}`
            );
          }
        } catch (error: any) {
          console.error("❌ Failed to load drawings:", error);
          set({ error: error.message || "Drawing load failed" });
        } finally {
          set({ isLoading: false });
        }
      },

      clearDrawings: () => set({ drawings: {}, error: null }),
    }),
    {
      name: "drawing-storage",
      partialize: (state) => ({ drawings: state.drawings }),
    }
  )
);

export { useDrawingStore, type DrawingData };
