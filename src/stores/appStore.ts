// src/stores/appStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { packDataService } from "@/shared/services/packDataService";
import { supabase } from "@/lib/supabaseClient";
import type { PackData } from "@/types";
import type { User } from "@supabase/supabase-js";

/**
 * Helper: Supabase user -> profiles 테이블에 upsert (id 기준)
 * - user가 null이면 아무 동작 안함
 * - user.user_metadata 내부 필드 (name, picture 등)에서 가능한 값을 추출해서 저장
 */
async function ensureUserProfile(user: User | null) {
  if (!user) return null;

  try {
    const email = user.email ?? (user.user_metadata as any)?.email ?? null;

    const display_name =
      (user.user_metadata as any)?.full_name ||
      (user.user_metadata as any)?.name ||
      null;

    const avatar_url =
      (user.user_metadata as any)?.avatar_url ||
      (user.user_metadata as any)?.picture ||
      null;

    const profileRow = {
      id: user.id, // profiles PK로 user.id 사용
      email,
      display_name,
      avatar_url,
    };

    const { data, error } = await supabase
      .from("profiles")
      .upsert(profileRow, { onConflict: "id", returning: "representation" })
      .select("id,email,display_name,avatar_url")
      .single();

    if (error) {
      console.warn("profiles upsert warning/error:", error);
      return null;
    }

    console.log("✅ User profile ensured:", data);
    return data;
  } catch (err) {
    console.error("ensureUserProfile failed:", err);
    return null;
  }
}

interface AppState {
  isAuthenticated: boolean;
  loading: boolean;
  user: any | null;
  selectedPackData: PackData | null;
  currentDay: number;
  _hasHydrated: boolean;
  contentVersion: string;
  selectedPackId: string | null;
}

interface AppActions {
  // email/password 인자 둘 다 있으면 Supabase 로그인, 없으면 데모 로그인
  login: (email?: string, password?: string) => Promise<void>;
  loginWithProvider: (provider: string) => Promise<void>;
  logout: () => Promise<void>;
  setSelectedPackData: (packData: PackData) => void;
  setCurrentDay: (day: number) => void;
  initialize: () => Promise<void>;
  setHasHydrated: (state: boolean) => void;
  loadPackById: (packId: string) => Promise<PackData | null>;
  refreshContentData: () => Promise<void>;
  autoRestoreRecentPack: () => Promise<void>;
  validateContentCompatibility: () => boolean;

  // packs
  fetchUserPacks: () => Promise<any[]>;
  enrollUserPack: (
    packId: string,
    opts?: { last_day?: number; status?: string }
  ) => Promise<any>;
  unenrollUserPack: (packId: string) => Promise<boolean | null>;
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

      fetchUserPacks: async () => {
        const user = get().user;
        if (!user?.id) {
          console.warn("fetchUserPacks: no authenticated user");
          return [];
        }
        try {
          const { data, error } = await supabase
            .from("user_packs")
            .select("*")
            .eq("user_id", user.id);

          if (error) {
            console.warn("fetchUserPacks error:", error);
            return [];
          }
          // data: array of user_packs rows
          return data || [];
        } catch (err) {
          console.error("fetchUserPacks failed:", err);
          return [];
        }
      },

      enrollUserPack: async (
        packId: string,
        opts?: { last_day?: number; status?: string }
      ) => {
        const user = get().user;
        if (!user?.id) {
          console.warn(
            "enrollUserPack: no authenticated user, skipping remote enroll"
          );
          return null;
        }

        try {
          const payload = {
            user_id: user.id,
            pack_id: packId,
            status: opts?.status ?? "active", // DB 기본값 'enrolled'와 다르면 필요에 맞게 조정
            last_day: opts?.last_day ?? 0,
            started_at: new Date().toISOString(),
            settings: {},
          };

          const { data, error } = await supabase
            .from("user_packs")
            .upsert(payload, {
              onConflict: ["user_id", "pack_id"],
              returning: "representation",
            });

          if (error) {
            console.warn("user_packs upsert warning/error:", error);
            return null;
          }
          console.log("✅ enrolled pack in user_packs:", data);
          return data;
        } catch (err) {
          console.error("enrollUserPack failed:", err);
          return null;
        }
      },

      // optionally: unenroll
      unenrollUserPack: async (packId: string) => {
        const user = get().user;
        if (!user?.id) return null;
        try {
          const { error } = await supabase
            .from("user_packs")
            .delete()
            .match({ user_id: user.id, pack_id: packId });
          if (error) {
            console.warn("user_packs delete error:", error);
            return false;
          }
          return true;
        } catch (e) {
          console.error("unenrollUserPack failed:", e);
          return false;
        }
      },

      setHasHydrated: (state) => set({ _hasHydrated: state }),

      loadPackById: async (packId: string) => {
        try {
          console.log(`🔍 Loading pack by ID: ${packId}`);
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

      refreshContentData: async () => {
        console.log("🔄 Refreshing content data...");
        const state = get();
        const savedPackId = state.selectedPackId;
        if (savedPackId) {
          const packData = await get().loadPackById(savedPackId);
          if (packData) {
            console.log(`✅ Restored pack data: ${packData.title}`);
            return;
          }
        }
        await get().autoRestoreRecentPack();
      },

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

      // --- 로그인 (옵셔널 인자) ---
      // 인자 제공 시: Supabase 이메일/비밀번호 로그인
      // 인자 미제공 시: 데모 로그인(fallback)
      login: async (email?: string, password?: string) => {
        console.log("🔥 Login invoked", { emailProvided: !!email });
        set({ loading: true });

        try {
          if (email && password) {
            // Supabase 이메일/비밀번호 로그인
            const { error: signInError } =
              await supabase.auth.signInWithPassword({
                email,
                password,
              });

            if (signInError) {
              console.error("❌ signInWithPassword error:", signInError);
              set({ loading: false });
              throw signInError;
            }

            // 현재 유저 정보 가져오기
            const {
              data: { user },
              error: getUserError,
            } = await supabase.auth.getUser();

            if (getUserError) {
              console.warn("⚠️ getUser after sign-in failed:", getUserError);
            }

            set({
              isAuthenticated: !!user,
              user: user ?? null,
              loading: false,
            });

            // 프로필 보장
            if (user) {
              await ensureUserProfile(user);
            }

            // 로그인 후 콘텐츠 복원 시도
            await get().refreshContentData();
            console.log("✅ Supabase login successful");
            return;
          } else {
            // 데모 로그인 (fallback)
            console.log(
              "⚠️ No credentials provided — using demo fallback login"
            );
            await new Promise((r) => setTimeout(r, 600)); // 시뮬레이션 딜레이

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

            // 데모 로그인 후 콘텐츠 복원
            await get().refreshContentData();
            console.log("✅ Demo login successful");
            return;
          }
        } catch (error) {
          console.error("❌ Login failed:", error);
          set({ loading: false });
          throw error;
        }
      },

      // OAuth (예: "google")
      loginWithProvider: async (provider: string) => {
        console.log("🔥 Supabase OAuth login started:", provider);
        set({ loading: true });
        try {
          const { error } = await supabase.auth.signInWithOAuth({
            provider: provider as any,
          });
          if (error) {
            console.error("❌ signInWithOAuth error:", error);
            set({ loading: false });
            throw error;
          }
          // OAuth는 리다이렉트 방식이 일반적이므로 여기서는 리턴.
          // 리다이렉트 후 페이지에선 initialize()/onAuthStateChange 로 상태 복원됨.
          set({ loading: false });
          console.log("ℹ️ Redirecting to provider for OAuth login");
        } catch (error) {
          console.error("❌ OAuth login failed:", error);
          set({ loading: false });
          throw error;
        }
      },

      logout: async () => {
        console.log("🔥 Logging out via Supabase");
        try {
          const { error } = await supabase.auth.signOut();
          if (error) {
            console.warn("⚠️ Supabase signOut error:", error);
          }
        } catch (err) {
          console.error("❌ signOut failed:", err);
        } finally {
          set({
            isAuthenticated: false,
            user: null,
            selectedPackData: null,
            selectedPackId: null,
            currentDay: 1,
          });
          packDataService.clearCache();
        }
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

      // 앱 초기화: 세션 확인 + auth 상태 구독 + 프로필 보장
      initialize: async () => {
        console.log(
          "🔥 App initialization started (checking Supabase session)"
        );

        try {
          // 1) 현재 세션 확인
          const {
            data: { session },
            error: sessionError,
          } = await supabase.auth.getSession();

          if (sessionError) {
            console.warn("⚠️ getSession error:", sessionError);
          }

          const currentUser = session?.user ?? null;

          set({
            isAuthenticated: !!currentUser,
            user: currentUser,
          });

          // 2) 세션이 있으면 profiles 테이블에 보장
          if (currentUser) {
            await ensureUserProfile(currentUser).catch((e) =>
              console.error("ensureUserProfile during init failed:", e)
            );
          }

          // 3) auth 상태 변경 리스너
          const { data: sub } = supabase.auth.onAuthStateChange(
            async (event, session) => {
              console.log("🔔 Supabase auth event:", event);
              const u = session?.user ?? null;
              set({
                isAuthenticated: !!u,
                user: u,
              });

              if (event === "SIGNED_IN" && u) {
                // 로그인 직후 프로필 upsert 및 콘텐츠 복원
                await ensureUserProfile(u).catch((e) =>
                  console.error("ensureUserProfile after SIGNED_IN failed:", e)
                );
                get()
                  .refreshContentData()
                  .catch((e) =>
                    console.error(
                      "❌ refreshContentData after SIGNED_IN failed:",
                      e
                    )
                  );
              }

              if (event === "SIGNED_OUT") {
                packDataService.clearCache();
                set({
                  selectedPackData: null,
                  selectedPackId: null,
                });
              }
            }
          );

          // 4) 초기화 후 콘텐츠 복원 (로그인 상태라면)
          if (currentUser) {
            await get().refreshContentData();
          }

          console.log("✅ App initialization completed");
          console.log("📊 Cache stats:", packDataService.getCacheStats());
        } catch (error) {
          console.error("❌ App initialization error:", error);
        }
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
        selectedPackId: state.selectedPackId,
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
