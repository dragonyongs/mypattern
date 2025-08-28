// src/stores/lexiconStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Lexeme,
  POS,
  Countability,
} from "@/features/learn/types/patternCore.types";

type Source = "user" | "global";
const norm = (s: string | undefined | null): string =>
  (s || "").toLowerCase().trim();
const keyOf = (en: string, pos: POS) => `${pos}:${norm(en)}`;

const MIN_PACK = [
  { en: "go", ko: "가다", pos: "VERB" as const, tags: ["daily", "directions"] },
  {
    en: "bring",
    ko: "가져오다",
    pos: "VERB" as const,
    tags: ["daily", "school"],
  },
  {
    en: "school",
    ko: "학교",
    pos: "PLACE" as const,
    tags: ["daily", "school"],
  },
  {
    en: "after school",
    ko: "방과 후",
    pos: "TIME" as const,
    tags: ["school", "daily"],
  },
  {
    en: "friend",
    ko: "친구",
    pos: "PERSON" as const,
    tags: ["daily", "school"],
  },
];

interface LexiconState {
  hydrated: boolean;
  seededOnce: boolean;
  words: (Lexeme & { source: Source })[];
  addWord: (
    w: Omit<Lexeme, "id" | "createdAt" | "updatedAt"> & { source?: Source }
  ) => string;
  updateWord: (id: string, upd: Partial<Lexeme>) => void;
  removeWord: (id: string) => void;
  search: (q: string) => (Lexeme & { source: Source })[];
  findByPos: (pos: POS[]) => (Lexeme & { source: Source })[];
  seedIfEmpty: () => void;
  ensureMinimumPack: (minTotal?: number) => {
    added: number;
    totalBefore: number;
    totalAfter: number;
  };
  upsertGlobalWords: (ws: typeof MIN_PACK) => void;
  exportUserWords: () => Lexeme[];
}
export const useLexiconStore = create<LexiconState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      seededOnce: false,
      words: [],

      addWord: (w) => {
        const normalizedEn = w.en.toLowerCase().trim();
        const k = `${w.pos}:${normalizedEn}`;

        // ✅ 더 정확한 중복 체크
        const exists = get().words.find(
          (x) => x.pos === w.pos && x.en.toLowerCase().trim() === normalizedEn
        );

        if (exists) {
          console.log(`⚠️ 중복 단어 무시: "${w.en}" (${w.pos})`);
          return exists.id;
        }

        const id = `lex_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        const now = new Date().toISOString();

        const item: Lexeme & { source: Source } = {
          id,
          en: w.en.trim(), // ✅ 공백 제거
          ko: w.ko.trim(), // ✅ 공백 제거
          pos: w.pos,
          tags: w.tags ?? [],
          countability: w.countability as Countability | undefined,
          irregularPlural: w.irregularPlural,
          register: (w as any).register,
          createdAt: now,
          source: w.source ?? "user",
        };

        console.log(`✅ 새 단어 추가: "${item.en}" (${item.pos})`);
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

      seedIfEmpty: () => {
        const st = get();
        if (!st.hydrated || st.seededOnce || st.words.length > 0) return;
        get().upsertGlobalWords(MIN_PACK);
        set({ seededOnce: true });
      },

      ensureMinimumPack: (targetCount = 15) => {
        const state = get();
        const totalBefore = state.words.length;

        console.log(
          "🔧 ensureMinimumPack 시작 - 현재 단어:",
          totalBefore,
          "개"
        );
        console.log(
          "현재 단어들:",
          state.words.map((w) => `${w.en}(${w.pos})`)
        );

        // 현재 품사별 단어 수 체크
        const posCount = state.words.reduce((acc, w) => {
          acc[w.pos] = (acc[w.pos] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        console.log("현재 품사별 단어 수:", posCount);

        const essentialWords = [
          // VERB (동사)
          { en: "go", ko: "가다", pos: "VERB", tags: ["daily"] },
          { en: "come", ko: "오다", pos: "VERB", tags: ["daily"] },
          { en: "get", ko: "받다", pos: "VERB", tags: ["daily"] },
          { en: "have", ko: "가지다", pos: "VERB", tags: ["daily"] },
          { en: "make", ko: "만들다", pos: "VERB", tags: ["daily"] },
          { en: "take", ko: "가져가다", pos: "VERB", tags: ["daily"] },
          { en: "bring", ko: "가져오다", pos: "VERB", tags: ["daily"] },
          { en: "see", ko: "보다", pos: "VERB", tags: ["daily"] },

          // PLACE (장소)
          { en: "home", ko: "집", pos: "PLACE", tags: ["daily"] },
          { en: "school", ko: "학교", pos: "PLACE", tags: ["school"] },
          { en: "office", ko: "사무실", pos: "PLACE", tags: ["business"] },
          { en: "store", ko: "가게", pos: "PLACE", tags: ["daily"] },
          { en: "hospital", ko: "병원", pos: "PLACE", tags: ["daily"] },
          { en: "library", ko: "도서관", pos: "PLACE", tags: ["daily"] },
          { en: "station", ko: "역", pos: "PLACE", tags: ["directions"] },
          { en: "park", ko: "공원", pos: "PLACE", tags: ["daily"] },

          // PERSON (사람)
          { en: "friend", ko: "친구", pos: "PERSON", tags: ["daily"] },
          { en: "teacher", ko: "선생님", pos: "PERSON", tags: ["school"] },
          { en: "colleague", ko: "동료", pos: "PERSON", tags: ["business"] },
          { en: "student", ko: "학생", pos: "PERSON", tags: ["school"] },
          { en: "doctor", ko: "의사", pos: "PERSON", tags: ["daily"] },
          { en: "mom", ko: "엄마", pos: "PERSON", tags: ["daily"] },
          { en: "dad", ko: "아빠", pos: "PERSON", tags: ["daily"] },

          // NOUN (명사)
          { en: "book", ko: "책", pos: "NOUN", tags: ["school"] },
          { en: "phone", ko: "휴대폰", pos: "NOUN", tags: ["daily"] },
          { en: "car", ko: "자동차", pos: "NOUN", tags: ["daily"] },
          { en: "computer", ko: "컴퓨터", pos: "NOUN", tags: ["business"] },
          { en: "coffee", ko: "커피", pos: "NOUN", tags: ["daily"] },
          { en: "meeting", ko: "회의", pos: "NOUN", tags: ["business"] },
          { en: "work", ko: "일", pos: "NOUN", tags: ["business"] },

          // ITEM (물건)
          { en: "bag", ko: "가방", pos: "ITEM", tags: ["school"] },
          { en: "laptop", ko: "노트북", pos: "ITEM", tags: ["business"] },
          { en: "water", ko: "물", pos: "ITEM", tags: ["daily"] },
          { en: "pen", ko: "펜", pos: "ITEM", tags: ["school"] },
          { en: "key", ko: "열쇠", pos: "ITEM", tags: ["daily"] },
          { en: "wallet", ko: "지갑", pos: "ITEM", tags: ["daily"] },
          { en: "document", ko: "서류", pos: "ITEM", tags: ["business"] },

          // TIME (시간)
          { en: "morning", ko: "아침", pos: "TIME", tags: ["daily"] },
          { en: "afternoon", ko: "오후", pos: "TIME", tags: ["daily"] },
          { en: "evening", ko: "저녁", pos: "TIME", tags: ["daily"] },
          { en: "today", ko: "오늘", pos: "TIME", tags: ["daily"] },
          { en: "tomorrow", ko: "내일", pos: "TIME", tags: ["daily"] },
        ];

        // ✅ 품사별 최소 필요 수량 - 더 넉넉하게
        const minRequired = {
          VERB: 6,
          PLACE: 6,
          PERSON: 4,
          NOUN: 5,
          ITEM: 5,
          TIME: 4,
        };

        let addedCount = 0;
        const addedWords: any[] = [];

        for (const word of essentialWords) {
          const currentCount = posCount[word.pos] || 0;
          const needed = minRequired[word.pos as keyof typeof minRequired] || 0;

          const exists = state.words.some(
            (w) =>
              w.pos === word.pos &&
              w.en.toLowerCase().trim() === word.en.toLowerCase().trim()
          );

          if (currentCount < needed && !exists && addedCount < targetCount) {
            const newWord = {
              id: `auto-${Date.now()}-${Math.random()
                .toString(36)
                .substr(2, 9)}`,
              en: word.en,
              ko: word.ko,
              pos: word.pos as any,
              tags: word.tags as any,
              createdAt: new Date().toISOString(),
              source: "global" as any,
            };

            addedWords.push(newWord);
            posCount[word.pos] = (posCount[word.pos] || 0) + 1;
            addedCount++;
          }
        }

        console.log(
          `💾 추가할 단어: ${addedWords.length}개`,
          addedWords.map((w) => `${w.en}(${w.pos})`)
        );

        if (addedWords.length > 0) {
          set((state) => ({
            words: [...addedWords, ...state.words],
          }));
          console.log(`✅ ${addedWords.length}개 단어 추가 완료!`);
        }

        const totalAfter = get().words.length;

        return {
          added: addedCount,
          totalBefore,
          totalAfter,
        };
      },

      upsertGlobalWords: (ws) => {
        set((state) => {
          const seen = new Set(state.words.map((x) => keyOf(x.en, x.pos)));
          const add: (Lexeme & { source: Source })[] = [];

          for (const w of ws) {
            // ✅ 필수 필드 검증
            if (!w.en || !w.ko || !w.pos) {
              console.warn("Skipping invalid word:", w);
              continue;
            }

            const k = keyOf(w.en, w.pos);
            if (seen.has(k)) continue;
            seen.add(k);

            add.push({
              id: `lex_${Date.now()}_${add.length}`,
              en: w.en,
              ko: w.ko,
              pos: w.pos,
              tags: w.tags ?? [],
              countability: undefined,
              irregularPlural: undefined,
              register: undefined,
              createdAt: new Date().toISOString(),
              source: "global",
            });
          }

          console.log("Actually adding:", add.length, "words");
          return add.length ? { words: [...add, ...state.words] } : state;
        });
      },

      exportUserWords: () => get().words.filter((w) => w.source === "user"),
    }),
    {
      name: "mypattern-lexicon",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ words: s.words, seededOnce: s.seededOnce }),
      onRehydrateStorage: () => (state, err) => {
        console.log("[lexiconStore] onRehydrateStorage done", {
          err,
          words: state?.words?.length,
        });
        // ❌ useLexiconStore.setState({ hydrated: true }); // TDZ 에러
        return { hydrated: true }; // ✅ 직접 상태 반환
      },
    }
  )
);

// persist API로 하이드레이션 보장(첫 실행/HMR 포함)
const persistApi = (useLexiconStore as any).persist;
persistApi?.onFinishHydration?.(() => {
  console.log("[lexiconStore] onFinishHydration");
  useLexiconStore.setState({ hydrated: true });
});
if (persistApi?.hasHydrated?.()) {
  console.log("[lexiconStore] already hydrated");
  useLexiconStore.setState({ hydrated: true });
}
