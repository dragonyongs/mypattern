// src/stores/studyProgressStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  PackProgress,
  DayProgress,
  PackData,
  StudySettings,
} from "@/types";
import { supabase } from "@/lib/supabaseClient";
import { useAppStore } from "@/stores/appStore";

const STORAGE_KEY = "study-progress-v1";

// Core 모드 타입만 사용 (store 내부 표준 키)
type CoreMode = "vocab" | "sentence" | "workbook";

type ItemProgress = { isCompleted: boolean; lastStudied: string | null };

type ProgressState = Record<
  string,
  {
    packId: string;
    settings: StudySettings;
    progressByDay: Record<
      number,
      DayProgress & {
        items?: Record<string, ItemProgress>;
        studySeconds?: number;
      }
    >;
  }
>;

interface StudyProgressState {
  progress: ProgressState;
  _hasHydrated: boolean;
}

interface StudyProgressActions {
  setModeCompleted: (
    packId: string,
    day: number,
    modeType: string, // 들어오는 건 자유롭게 받고 내부에서 정규화
    packData: PackData
  ) => void;
  setItemCompleted: (
    packId: string,
    day: number,
    itemId: string,
    completed: boolean
  ) => void;
  clearItemProgress: (packId: string, day: number, itemId: string) => void;
  getItemProgress: (
    packId: string,
    day: number,
    itemId: string
  ) => ItemProgress | null;
  getPackProgress: (packId: string) => PackProgress | null;
  getDayProgress: (
    packId: string,
    day: number
  ) =>
    | (DayProgress & {
        items?: Record<string, ItemProgress>;
        studySeconds?: number;
      })
    | null;

  updateSettings: (packId: string, newSettings: Partial<StudySettings>) => void;
  getSettings: (packId: string) => StudySettings;

  getCurrentItemIndex: (packId: string, day: number, mode: string) => number;
  setCurrentItemIndex: (
    packId: string,
    day: number,
    mode: string,
    index: number
  ) => void;
  getNextUncompletedIndex: (
    packId: string,
    day: number,
    mode: string,
    contentIds: string[]
  ) => number;

  setHasHydrated: (state: boolean) => void;
  waitForHydration: () => Promise<void>;
  clearPackProgress: (packId: string) => void;

  addStudySeconds: (
    packId: string,
    day: number,
    seconds: number
  ) => Promise<void>;

  syncWithRemote: () => Promise<void>;
  syncLocalToRemote: (userId: string) => Promise<void>;
  syncRemoteToLocal: (userId: string) => Promise<void>;

  getRemotePackSummary: (
    userId: string,
    packId: string
  ) => Promise<{ completedCount: number; totalCount: number }>;

  validateProgressForContent: (packId: string, contentIds: string[]) => void;
}

const defaultSettings: StudySettings = {
  showMeaningEnabled: false,
  autoProgressEnabled: false,
  studyMode: "immersive",
  autoPlayOnSelect: false,
} as const;

const createDefaultStudySettings = (): StudySettings => ({
  ...defaultSettings,
});

// 들어오는 임의의 모드 문자열을 core 모드로 정규화
const normalizeMode = (mode: string): CoreMode | null => {
  const m = String(mode).toLowerCase();
  if (m === "vocab" || m.includes("vocab")) return "vocab";
  if (m === "sentence" || m.includes("sentence")) return "sentence";
  if (m === "workbook") return "workbook";
  return null; // introduction 등은 null 처리
};

const normalizeCompletedModes = (
  obj: Record<string, any> | null | undefined
) => {
  const out: Record<CoreMode, boolean> = {
    vocab: false,
    sentence: false,
    workbook: false,
  };
  if (!obj) return out;
  Object.keys(obj).forEach((k) => {
    const core = normalizeMode(k);
    if (core) out[core] = !!obj[k];
  });
  return out;
};

const createEmptyDayProgress = (
  day: number
): DayProgress & {
  items: Record<string, ItemProgress>;
  studySeconds: number;
} => ({
  day,
  completedModes: {},
  completedItems: {},
  isCompleted: false,
  lastStudiedAt: null as any,
  currentItemIndexByMode: {},
  items: {},
  studySeconds: 0,
});

const createEmptyPackProgress = (packId: string) => ({
  packId,
  lastStudiedDay: 1,
  completedDaysCount: 0,
  progressByDay: {} as Record<
    number,
    ReturnType<typeof createEmptyDayProgress>
  >,
  settings: createDefaultStudySettings(),
  lastStudiedAt: null,
});

function ensurePack(state: ProgressState, packId: string) {
  if (!state[packId]) state[packId] = createEmptyPackProgress(packId);
  return state[packId];
}

function ensureDay(
  byDay: Record<
    number,
    DayProgress & {
      items?: Record<string, ItemProgress>;
      studySeconds?: number;
    }
  >,
  day: number
) {
  if (!byDay[day]) byDay[day] = createEmptyDayProgress(day);
  const d = byDay[day] as any;
  d.day = day;
  d.completedModes = normalizeCompletedModes(d.completedModes || {});
  d.completedItems = d.completedItems || {};
  d.items = d.items || {};
  d.currentItemIndexByMode = d.currentItemIndexByMode || {};
  d.studySeconds = d.studySeconds ?? 0;
  return byDay[day];
}

export const useStudyProgressStore = create<
  StudyProgressState & StudyProgressActions
>()(
  persist(
    (set, get) => {
      let resolveHydration: (() => void) | null = null;
      const hydrationPromise = new Promise<void>((resolve) => {
        resolveHydration = resolve;
      });

      const chunkArray = <T>(arr: T[], size = 200) => {
        const chunks: T[][] = [];
        for (let i = 0; i < arr.length; i += size)
          chunks.push(arr.slice(i, i + size));
        return chunks;
      };

      const buildItemProgressRowsFromLocal = (userId: string) => {
        const rows: any[] = [];
        const progress = get().progress;
        Object.keys(progress).forEach((packId) => {
          if (!packId || packId === "undefined") return;
          const pack = progress[packId];
          const byDay = pack?.progressByDay || {};
          Object.keys(byDay).forEach((dayKey) => {
            const dayNum = Number(dayKey);
            if (!Number.isFinite(dayNum) || dayNum <= 0) return;
            const dayPg = ensureDay(byDay, dayNum) as any;
            const items = dayPg.items || dayPg.completedItems || {};
            Object.keys(items).forEach((itemId) => {
              const item = items[itemId];
              rows.push({
                user_id: userId,
                pack_id: packId,
                day: dayNum,
                item_id: itemId,
                is_completed: !!item?.isCompleted,
                attempts_count: 0,
                last_answer: null,
                last_studied: item?.lastStudied ?? dayPg.lastStudiedAt ?? null,
              });
            });
          });
        });
        return rows;
      };

      const buildDayProgressRowsFromLocal = (userId: string) => {
        const rows: any[] = [];
        const progress = get().progress;
        Object.keys(progress).forEach((packId) => {
          if (!packId || packId === "undefined") return;
          const pack = progress[packId];
          const byDay = pack?.progressByDay || {};
          Object.keys(byDay).forEach((dayKey) => {
            const dayNum = Number(dayKey);
            if (!Number.isFinite(dayNum) || dayNum <= 0) return;
            const dayPg = ensureDay(byDay, dayNum) as any;
            rows.push({
              user_id: userId,
              pack_id: packId,
              day: dayNum,
              completed_modes: normalizeCompletedModes(dayPg.completedModes),
              is_completed: !!dayPg.isCompleted,
              last_studied_at: dayPg.lastStudiedAt ?? null,
              study_seconds: dayPg.studySeconds ?? 0,
            });
          });
        });
        return rows;
      };

      const fetchRemoteItemTimestamps = async (userId: string) => {
        try {
          const { data, error } = await supabase
            .from("item_progress")
            .select("pack_id, day, item_id, last_studied")
            .eq("user_id", userId);
          if (error) {
            console.warn("fetchRemoteItemTimestamps error:", error);
            return new Map<string, string | null>();
          }
          const map = new Map<string, string | null>();
          (data || []).forEach((r: any) => {
            map.set(
              `${r.pack_id}::${r.day}::${r.item_id}`,
              r.last_studied ?? null
            );
          });
          return map;
        } catch (err) {
          console.error("fetchRemoteItemTimestamps failed:", err);
          return new Map<string, string | null>();
        }
      };

      const syncLocalToRemoteImpl = async (userId: string) => {
        try {
          const itemRows = buildItemProgressRowsFromLocal(userId).filter(
            (r) =>
              r.user_id &&
              typeof r.pack_id === "string" &&
              r.pack_id !== "undefined" &&
              Number.isFinite(r.day) &&
              r.day > 0 &&
              r.item_id
          );
          const dayRows = buildDayProgressRowsFromLocal(userId).filter(
            (r) =>
              r.user_id &&
              typeof r.pack_id === "string" &&
              r.pack_id !== "undefined" &&
              Number.isFinite(r.day) &&
              r.day > 0
          );

          const remoteMap = await fetchRemoteItemTimestamps(userId);
          const rowsToUpsert = itemRows.filter((r) => {
            const key = `${r.pack_id}::${r.day}::${r.item_id}`;
            const remoteLast = remoteMap.get(key);
            if (!remoteLast) return true;
            const remoteTime = new Date(remoteLast).getTime();
            const localTime = r.last_studied
              ? new Date(r.last_studied).getTime()
              : 0;
            return localTime > remoteTime;
          });

          if (rowsToUpsert.length > 0) {
            const chunks = chunkArray(rowsToUpsert, 200);
            for (const chunk of chunks) {
              const { error } = await supabase
                .from("item_progress")
                .upsert(chunk, {
                  onConflict: ["user_id", "pack_id", "day", "item_id"],
                });
              if (error)
                console.warn("item_progress upsert chunk error:", error);
            }
            console.log(
              `✅ Synced ${rowsToUpsert.length} item_progress rows to remote`
            );
          }

          if (dayRows.length > 0) {
            const { data: remoteDays = [] } = await supabase
              .from("day_progress")
              .select("pack_id, day, last_studied_at");

            const remoteDayMap = new Map<string, string | null>();
            (remoteDays || []).forEach((d: any) =>
              remoteDayMap.set(
                `${d.pack_id}::${d.day}`,
                d.last_studied_at ?? null
              )
            );

            const dayRowsToUpsert = dayRows.filter((r) => {
              const key = `${r.pack_id}::${r.day}`;
              const remoteLast = remoteDayMap.get(key);
              if (!remoteLast) return true;
              const remoteTime = new Date(remoteLast).getTime();
              const localTime = r.last_studied_at
                ? new Date(r.last_studied_at).getTime()
                : 0;
              return localTime > remoteTime;
            });

            if (dayRowsToUpsert.length > 0) {
              const chunks = chunkArray(dayRowsToUpsert, 100);
              for (const chunk of chunks) {
                const { error } = await supabase
                  .from("day_progress")
                  .upsert(chunk, { onConflict: "user_id,pack_id,day" });
                if (error)
                  console.warn("day_progress upsert chunk error:", error);
              }
              console.log(
                `✅ Synced ${dayRowsToUpsert.length} day_progress rows to remote`
              );
            }
          }
        } catch (err) {
          console.error("syncLocalToRemoteImpl failed:", err);
        }
      };

      const syncRemoteToLocalImpl = async (userId: string) => {
        try {
          const { data: remoteItems = [], error: itemErr } = await supabase
            .from("item_progress")
            .select("*")
            .eq("user_id", userId);
          if (itemErr)
            console.warn("fetch remote item_progress error:", itemErr);

          const { data: remoteDays = [], error: dayErr } = await supabase
            .from("day_progress")
            .select("*")
            .eq("user_id", userId);
          if (dayErr) console.warn("fetch remote day_progress error:", dayErr);

          set((state) => {
            const progress = { ...state.progress };

            (remoteDays || []).forEach((rd: any) => {
              if (!rd.pack_id || !Number.isFinite(rd.day) || rd.day <= 0)
                return;
              const pack = ensurePack(progress, rd.pack_id);
              const dayPg = ensureDay(pack.progressByDay, rd.day);
              const remoteLast = rd.last_studied_at
                ? new Date(rd.last_studied_at).getTime()
                : 0;
              const localLast = dayPg.lastStudiedAt
                ? new Date(dayPg.lastStudiedAt).getTime()
                : 0;

              if (remoteLast >= localLast) {
                // 원격 completed_modes를 정규화
                dayPg.completedModes = normalizeCompletedModes(
                  rd.completed_modes || {}
                );
                dayPg.isCompleted = !!rd.is_completed;
                (dayPg as any).studySeconds =
                  rd.study_seconds ?? (dayPg as any).studySeconds ?? 0;
                dayPg.lastStudiedAt =
                  rd.last_studied_at ?? dayPg.lastStudiedAt ?? null;
                pack.progressByDay[rd.day] = dayPg;
                pack.completedDaysCount = Object.values(
                  pack.progressByDay
                ).filter((d: any) => d.isCompleted).length;
                progress[rd.pack_id] = pack;
              }
            });

            (remoteItems || []).forEach((ri: any) => {
              if (
                !ri.pack_id ||
                !Number.isFinite(ri.day) ||
                ri.day <= 0 ||
                !ri.item_id
              )
                return;
              const pack = ensurePack(progress, ri.pack_id);
              const dayPg = ensureDay(pack.progressByDay, ri.day) as any;
              const remoteLast = ri.last_studied
                ? new Date(ri.last_studied).getTime()
                : 0;
              const localItem =
                dayPg.items?.[ri.item_id] || dayPg.completedItems?.[ri.item_id];
              const localLast = localItem?.lastStudied
                ? new Date(localItem.lastStudied).getTime()
                : 0;

              dayPg.items = dayPg.items || {};
              if (remoteLast >= localLast) {
                dayPg.items[ri.item_id] = {
                  isCompleted: !!ri.is_completed,
                  lastStudied: ri.last_studied ?? dayPg.lastStudiedAt ?? null,
                };
                dayPg.lastStudiedAt =
                  dayPg.lastStudiedAt ?? ri.last_studied ?? null;
                pack.progressByDay[ri.day] = dayPg;
                progress[ri.pack_id] = pack;
              }
            });

            return { progress };
          });

          console.log("✅ Merged remote progress into local store");
        } catch (err) {
          console.error("syncRemoteToLocalImpl failed:", err);
        }
      };

      const mergeSyncWithRemoteImpl = async (userId: string) => {
        try {
          await syncRemoteToLocalImpl(userId);
          await syncLocalToRemoteImpl(userId);
          console.log("✅ mergeSyncWithRemote completed");
        } catch (err) {
          console.error("mergeSyncWithRemoteImpl failed:", err);
        }
      };

      return {
        progress: {},
        _hasHydrated: false,

        setHasHydrated: (flag) => {
          set({ _hasHydrated: flag });
          if (flag && resolveHydration) {
            resolveHydration();
            resolveHydration = null;
          }
        },

        waitForHydration: () => hydrationPromise,

        getPackProgress: (packId) => get().progress[packId] || null,

        getDayProgress: (packId, day) => {
          const pack = get().progress[packId];
          if (!pack) return null;
          const dayPg = pack.progressByDay?.[day];
          if (!dayPg) return null;
          (dayPg as any).day = day;
          (dayPg as any).completedModes = normalizeCompletedModes(
            dayPg.completedModes || {}
          );
          (dayPg as any).completedItems = dayPg.completedItems || {};
          (dayPg as any).items = (dayPg as any).items || {};
          (dayPg as any).currentItemIndexByMode =
            (dayPg as any).currentItemIndexByMode || {};
          (dayPg as any).studySeconds = (dayPg as any).studySeconds ?? 0;
          return dayPg;
        },

        validateProgressForContent: (packId, contentIds) => {
          if (!packId) return;
          set((state) => {
            const next = { ...state.progress };
            const pack = ensurePack(next, packId);
            const byDay = pack.progressByDay || {};
            const validSet = new Set(contentIds || []);

            Object.keys(byDay).forEach((dayKey) => {
              const dayNum = Number(dayKey);
              if (!Number.isFinite(dayNum) || dayNum <= 0) {
                delete (byDay as any)[dayKey];
                return;
              }
              const dayPg = ensureDay(byDay, dayNum) as any;
              const items = dayPg.items || {};
              const pruned: Record<string, ItemProgress> = {};
              Object.keys(items).forEach((id) => {
                if (validSet.size === 0 || validSet.has(id)) {
                  const v = items[id];
                  pruned[id] = {
                    isCompleted: !!v?.isCompleted,
                    lastStudied: v?.lastStudied ?? null,
                  };
                }
              });
              dayPg.items = pruned;

              // 과거 completedItems 형태도 보정
              if (
                dayPg.completedItems &&
                Object.keys(dayPg.completedItems).length > 0
              ) {
                Object.keys(dayPg.completedItems).forEach((id) => {
                  if (pruned[id]) return;
                  const b = dayPg.completedItems[id];
                  if (typeof b === "boolean")
                    pruned[id] = { isCompleted: b, lastStudied: null };
                });
                dayPg.items = pruned;
              }

              dayPg.completedModes = normalizeCompletedModes(
                dayPg.completedModes || {}
              );
              dayPg.currentItemIndexByMode = dayPg.currentItemIndexByMode || {};
              dayPg.studySeconds = dayPg.studySeconds ?? 0;
              byDay[dayNum] = dayPg;
            });

            pack.progressByDay = byDay;
            next[packId] = pack;
            return { progress: next };
          });
        },

        setItemCompleted: (packId, day, itemId, completed) => {
          if (!packId || packId === "undefined" || !itemId) return;
          set((state) => {
            const progress = { ...state.progress };
            const pack = ensurePack(progress, packId);
            const dayPg = ensureDay(pack.progressByDay, day) as any;
            dayPg.items = dayPg.items || {};
            const prev = dayPg.items[itemId] || {
              isCompleted: false,
              lastStudied: null,
            };
            if (prev.isCompleted !== completed) {
              dayPg.items[itemId] = {
                isCompleted: completed,
                lastStudied: new Date().toISOString(),
              };
              dayPg.lastStudiedAt = new Date().toISOString() as any;
            }
            pack.progressByDay[day] = dayPg;
            progress[packId] = pack;
            return { progress };
          });

          (async () => {
            const { user } = useAppStore.getState();
            const userId = user?.id;
            if (!userId) return;
            await supabase.from("item_progress").upsert(
              {
                user_id: userId,
                pack_id: packId,
                day,
                item_id: itemId,
                is_completed: completed,
                last_studied: new Date().toISOString(),
              },
              { onConflict: ["user_id", "pack_id", "day", "item_id"] }
            );
          })().catch((e) =>
            console.warn("setItemCompleted remote sync failed:", e)
          );
        },

        clearItemProgress: (packId, day, itemId) => {
          if (!packId || packId === "undefined" || !itemId) return;
          set((state) => {
            const progress = { ...state.progress };
            const pack = progress[packId];
            if (!pack) return state;
            const dayPg = pack.progressByDay[day] as any;
            if (!dayPg) return state;
            dayPg.items = dayPg.items || {};
            delete dayPg.items[itemId];
            pack.progressByDay[day] = dayPg;
            progress[packId] = pack;
            return { progress };
          });
        },

        getItemProgress: (packId, day, itemId) => {
          const dp = get().getDayProgress(packId, day) as any;
          return dp?.items?.[itemId] ?? dp?.completedItems?.[itemId] ?? null;
        },

        setModeCompleted: (packId, day, modeType, packData) => {
          if (
            !packId ||
            packId === "undefined" ||
            !Number.isFinite(day) ||
            day <= 0 ||
            !modeType
          )
            return;
          const core = normalizeMode(modeType);
          if (!core) return; // introduction 등은 저장하지 않음

          set((state) => {
            const progress = { ...state.progress };
            const pack = ensurePack(progress, packId);
            const dayPg = ensureDay(pack.progressByDay, day);

            dayPg.completedModes = {
              ...normalizeCompletedModes(dayPg.completedModes),
              [core]: true,
            };

            // dayPlan에서 introduction 제외한 required 모드만 판정
            const dayPlan = packData?.learningPlan?.days.find(
              (d) => d.day === day
            );
            if (dayPlan) {
              const required = (dayPlan.modes || [])
                .map((m) => normalizeMode(m.type))
                .filter((m): m is CoreMode => !!m);
              const allDone = required.every((m) => !!dayPg.completedModes[m]);
              if (allDone && !dayPg.isCompleted) {
                dayPg.isCompleted = true;
                dayPg.lastStudiedAt = new Date().toISOString() as any;
                pack.completedDaysCount = Object.values(
                  pack.progressByDay
                ).filter((d: any) => d.isCompleted).length;
                pack.lastStudiedDay = day;
                pack.lastStudiedAt = new Date().toISOString() as any;
              }
            }

            pack.progressByDay[day] = dayPg;
            progress[packId] = pack;
            return { progress };
          });

          (async () => {
            const { user } = useAppStore.getState();
            const userId = user?.id;
            if (!userId) return;
            const cur = get().getDayProgress(packId, day);
            if (!cur) return;
            await supabase.from("day_progress").upsert(
              {
                user_id: userId,
                pack_id: packId,
                day,
                completed_modes: normalizeCompletedModes(
                  cur.completedModes || {}
                ),
                is_completed: !!cur.isCompleted,
                last_studied_at: cur.lastStudiedAt || new Date().toISOString(),
                study_seconds: (cur as any).studySeconds ?? 0,
              },
              { onConflict: "user_id,pack_id,day" }
            );
          })().catch((e) =>
            console.warn("setModeCompleted remote sync failed:", e)
          );
        },

        updateSettings: (packId, newSettings) => {
          if (!packId || packId === "undefined") return;
          set((state) => {
            const progress = { ...state.progress };
            const pack = ensurePack(progress, packId);
            pack.settings = {
              ...createDefaultStudySettings(),
              ...pack.settings,
              ...newSettings,
            };
            progress[packId] = pack;
            return { progress };
          });
        },

        getSettings: (packId) => {
          const pack = get().progress[packId];
          return pack?.settings || createDefaultStudySettings();
        },

        addStudySeconds: async (packId, day, seconds) => {
          if (
            !packId ||
            packId === "undefined" ||
            !Number.isFinite(day) ||
            day <= 0 ||
            !seconds
          )
            return;
          set((state) => {
            const progress = { ...state.progress };
            const pack = ensurePack(progress, packId);
            const dayPg = ensureDay(pack.progressByDay, day) as any;
            dayPg.studySeconds = (dayPg.studySeconds ?? 0) + seconds;
            dayPg.lastStudiedAt = new Date().toISOString() as any;
            pack.progressByDay[day] = dayPg;
            progress[packId] = pack;
            return { progress };
          });

          try {
            const { data: sessionData } = await supabase.auth.getSession();
            const userId = sessionData?.session?.user?.id;
            if (!userId) return;

            const { data: existingRow } = await supabase
              .from("day_progress")
              .select("study_seconds")
              .eq("user_id", userId)
              .eq("pack_id", packId)
              .eq("day", day)
              .limit(1)
              .single();

            const remoteSeconds = existingRow?.study_seconds ?? 0;
            const newSeconds = remoteSeconds + seconds;

            const cur = get().getDayProgress(packId, day);
            if (!cur) return;
            await supabase.from("day_progress").upsert(
              {
                user_id: userId,
                pack_id: packId,
                day,
                study_seconds: newSeconds,
                last_studied_at: cur.lastStudiedAt || new Date().toISOString(),
                completed_modes: normalizeCompletedModes(
                  cur.completedModes || {}
                ),
                is_completed: !!cur.isCompleted,
              },
              { onConflict: "user_id,pack_id,day" }
            );
          } catch (err) {
            console.warn("day_progress upsert failed:", err);
          }
        },

        clearPackProgress: (packId) => {
          if (!packId || packId === "undefined") return;
          set((state) => {
            const progress = { ...state.progress };
            delete progress[packId];
            return { progress };
          });
        },

        setCurrentItemIndex: (packId, day, mode, index) => {
          if (!packId || packId === "undefined") return;
          const core = normalizeMode(mode);
          if (!core) return;
          set((state) => {
            const progress = { ...state.progress };
            const pack = ensurePack(progress, packId);
            const dayPg = ensureDay(pack.progressByDay, day) as any;
            dayPg.currentItemIndexByMode = dayPg.currentItemIndexByMode || {};
            dayPg.currentItemIndexByMode[core] = index;
            pack.progressByDay[day] = dayPg;
            progress[packId] = pack;
            return { progress };
          });
        },

        getCurrentItemIndex: (packId, day, mode) => {
          const core = normalizeMode(mode);
          if (!core) return 0;
          const dp = get().getDayProgress(packId, day) as any;
          return dp?.currentItemIndexByMode?.[core] ?? 0;
        },

        getNextUncompletedIndex: (packId, day, _mode, contentIds) => {
          if (!packId || !contentIds.length) return 0;
          const dp = get().getDayProgress(packId, day) as any;
          if (!dp) return 0;
          const items = dp.items || dp.completedItems || {};
          for (let i = 0; i < contentIds.length; i++) {
            const it = contentIds[i];
            if (!items[it]?.isCompleted) return i;
          }
          return Math.max(0, contentIds.length - 1);
        },

        syncLocalToRemote: async (userId: string) => {
          await syncLocalToRemoteImpl(userId);
        },

        syncRemoteToLocal: async (userId: string) => {
          await syncRemoteToLocalImpl(userId);
        },

        syncWithRemote: async () => {
          try {
            const { user } = useAppStore.getState();
            const userId = user?.id;
            if (userId) {
              await mergeSyncWithRemoteImpl(userId);
            } else {
              const { data: sessionData } = await supabase.auth.getSession();
              const uid = sessionData?.session?.user?.id;
              if (!uid) {
                console.warn("No authenticated user available for sync");
                return;
              }
              await mergeSyncWithRemoteImpl(uid);
            }
          } catch (err) {
            console.error("syncWithRemote failed:", err);
          }
        },

        getRemotePackSummary: async (userId: string, packId: string) => {
          try {
            const {
              data: completedData,
              error: compErr,
              count: completedCount,
            } = await supabase
              .from("item_progress")
              .select("item_id", { count: "exact", head: false })
              .eq("user_id", userId)
              .eq("pack_id", packId)
              .eq("is_completed", true);
            if (compErr)
              console.warn(
                "getRemotePackSummary completed query error:",
                compErr
              );

            const {
              data: totalData,
              error: totErr,
              count: totalCount,
            } = await supabase
              .from("item_progress")
              .select("item_id", { count: "exact", head: false })
              .eq("user_id", userId)
              .eq("pack_id", packId);
            if (totErr)
              console.warn("getRemotePackSummary total query error:", totErr);

            return {
              completedCount: completedCount ?? completedData?.length ?? 0,
              totalCount: totalCount ?? totalData?.length ?? 0,
            };
          } catch (err) {
            console.error("getRemotePackSummary failed:", err);
            return { completedCount: 0, totalCount: 0 };
          }
        },
      };
    },
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ progress: state.progress }),
      onRehydrateStorage: () => (state, error) => {
        if (state) state.setHasHydrated(true);
        if (error)
          console.error("Hydration failed for studyProgressStore:", error);
        (async () => {
          try {
            const { data: sessionData } = await supabase.auth.getSession();
            const userId = sessionData?.session?.user?.id;
            if (userId)
              await (useStudyProgressStore.getState() as any).syncWithRemote();
          } catch (err) {
            console.error("Auto merge after hydration failed:", err);
          }
        })();
      },
    }
  )
);
