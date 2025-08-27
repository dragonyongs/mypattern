// src/stores/lexiconStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Lexeme,
  POS,
  Countability,
} from "@/features/learn/types/patternCore.types";

/* ===== 유틸/상수 ===== */
type Source = "user" | "global";
const norm = (s: string) => s.toLowerCase().trim();
const keyOf = (en: string, pos: POS) => `${pos}:${norm(en)}`;

// 최소 세트(부족 시 보충용)
const MIN_PACK: Omit<Lexeme, "id" | "createdAt" | "updatedAt">[] = [
  { en: "go", ko: "가다", pos: "VERB", tags: ["daily", "directions"] },
  { en: "bring", ko: "가져오다", pos: "VERB", tags: ["daily", "school"] },
  { en: "school", ko: "학교", pos: "PLACE", tags: ["daily", "school"] },
  { en: "after school", ko: "방과 후", pos: "TIME", tags: ["school", "daily"] },
  { en: "friend", ko: "친구", pos: "PERSON", tags: ["daily", "school"] },
];

/* ===== 스토어 타입 ===== */
interface LexiconState {
  hydrated: boolean;
  seededOnce: boolean;
  words: (Lexeme & { source: Source })[];
  // CRUD
  addWord: (
    w: Omit<Lexeme, "id" | "createdAt" | "updatedAt"> & { source?: Source }
  ) => string;
  updateWord: (id: string, upd: Partial<Lexeme>) => void;
  removeWord: (id: string) => void;
  search: (q: string) => (Lexeme & { source: Source })[];
  findByPos: (pos: POS[]) => (Lexeme & { source: Source })[];
  // 시드/보충/병합
  seedIfEmpty: () => void;
  ensureMinimumPack: (minTotal?: number) => {
    added: number;
    totalBefore: number;
    totalAfter: number;
  };
  upsertGlobalWords: (
    ws: Omit<Lexeme, "id" | "createdAt" | "updatedAt">[]
  ) => void;
  // 동기화용
  exportUserWords: () => Lexeme[];
}

/* ===== 스토어 구현 ===== */
export const useLexiconStore = create<LexiconState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      seededOnce: false,
      words: [],

      /* --- CRUD --- */
      addWord: (w) => {
        const k = keyOf(w.en, w.pos);
        const exists = get().words.find((x) => keyOf(x.en, x.pos) === k);
        if (exists) return exists.id; // 중복 차단

        const id = `lex_${Date.now()}`;
        const now = new Date().toISOString();
        const item: Lexeme & { source: Source } = {
          id,
          en: w.en,
          ko: w.ko,
          pos: w.pos,
          tags: w.tags ?? [],
          countability: w.countability as Countability | undefined,
          irregularPlural: w.irregularPlural,
          register: (w as any).register,
          createdAt: now,
          source: w.source ?? "user",
        };
        set((s) => ({ words: [item, ...s.words] }));
        return id;
      },

      updateWord: (id, upd) =>
        set((s) => ({
          words: s.words.map((x) =>
            x.id === id
              ? { ...x, ...upd, updatedAt: new Date().toISOString() }
              : x
          ),
        })),

      removeWord: (id) =>
        set((s) => ({ words: s.words.filter((x) => x.id !== id) })),

      search: (q) => {
        const n = norm(q);
        return get().words.filter(
          (w) => w.en.toLowerCase().includes(n) || w.ko.includes(q)
        );
      },

      findByPos: (pos) => get().words.filter((w) => pos.includes(w.pos)),

      /* --- 최초 시드: 진짜 '완전 비었을 때만' 1회 --- */
      seedIfEmpty: () => {
        const st = get();
        if (!st.hydrated || st.seededOnce || st.words.length > 0) return;

        // 최소 세트와 동일한 구성으로 시드
        get().upsertGlobalWords(MIN_PACK);
        set({ seededOnce: true });
      },

      /* --- 최소 세트 보충: 부족 품사/개수만 채움 --- */
      ensureMinimumPack: (minTotal = 5) => {
        const st = get();
        const words = st.words;

        const hasVerb = words.some((w) => w.pos === "VERB");
        const hasContent = words.some((w) =>
          ["PLACE", "NOUN", "ITEM", "TIME"].includes(w.pos)
        );
        const totalBefore = words.length;

        const existsKey = (en: string, pos: POS) =>
          words.some((w) => w.pos === pos && norm(w.en) === norm(en));

        const want: Omit<Lexeme, "id" | "createdAt" | "updatedAt">[] = [];

        // 핵심 결핍 우선 보충
        if (!hasVerb && !existsKey("go", "VERB")) want.push(MIN_PACK); // go
        if (!hasContent && !existsKey("school", "PLACE"))
          want.push(MIN_PACK[11]); // school

        // 총 개수 확보를 위해 남는 후보에서 채우기
        const pool = MIN_PACK.filter(
          (x) =>
            !existsKey(x.en, x.pos) &&
            !want.find((w) => w.en === x.en && w.pos === x.pos)
        );

        while (get().words.length + want.length < minTotal && pool.length) {
          const pick = pool.shift()!;
          want.push(pick);
        }

        if (want.length) get().upsertGlobalWords(want);
        return {
          added: want.length,
          totalBefore,
          totalAfter: get().words.length,
        };
      },

      /* --- 글로벌 병합(중복 키 차단) --- */
      upsertGlobalWords: (ws) => {
        set((state) => {
          const seen = new Set(state.words.map((x) => keyOf(x.en, x.pos)));
          const add: (Lexeme & { source: Source })[] = [];

          for (const w of ws) {
            const k = keyOf(w.en, w.pos as POS);
            if (seen.has(k)) continue;
            seen.add(k);
            add.push({
              id: `lex_${Date.now()}_${add.length}`,
              en: w.en,
              ko: w.ko,
              pos: w.pos as POS,
              tags: w.tags ?? [],
              countability: (w as any).countability,
              irregularPlural: (w as any).irregularPlural,
              register: (w as any).register,
              createdAt: new Date().toISOString(),
              source: "global",
            });
          }

          return add.length ? { words: [...add, ...state.words] } : state;
        });
      },

      /* --- 동기화용 내 단어만 추출 --- */
      exportUserWords: () => get().words.filter((w) => w.source === "user"),
    }),
    {
      name: "mypattern-lexicon",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ words: s.words, seededOnce: s.seededOnce }),
      onRehydrateStorage: () => () => {
        useLexiconStore.setState({ hydrated: true });
      },
    }
  )
);
