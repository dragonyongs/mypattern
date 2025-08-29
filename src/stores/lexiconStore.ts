// src/stores/lexiconStore.ts (완전 수정)
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Lexeme,
  POS,
  LangTag,
} from "@/features/learn/types/patternCore.types";

type Source = "user" | "global" | "pack";

interface LexiconState {
  hydrated: boolean;
  words: (Lexeme & { source: Source })[];
  loadedPacks: string[];
  isInitialized: boolean;

  // 기본 CRUD
  addWord: (
    w: Omit<Lexeme & { source?: Source }, "id" | "createdAt">
  ) => string;
  updateWord: (id: string, upd: Partial<Lexeme>) => void;
  removeWord: (id: string) => void;

  // 검색 및 필터
  search: (q: string) => (Lexeme & { source: Source })[];
  findByPos: (
    pos: POS[],
    categories?: LangTag[]
  ) => (Lexeme & { source: Source })[];

  // 데이터팩 관리 - seedIfEmpty 대체
  ensureMinimumWords: (
    count: number,
    categories?: LangTag[]
  ) => { added: number; totalBefore: number; totalAfter: number };

  // ✅ 새로운 초기화 함수 (seedIfEmpty 대체)
  initializeWithBasicWords: () => void;
  ensureBasicWordsAvailable: () => void;

  // 유틸리티
  exportUserWords: () => Lexeme[];
  getWordsByCategory: (
    categories: LangTag[]
  ) => (Lexeme & { source: Source })[];

  // ✅ upsertGlobalWords 추가 (loadPacks.ts 호환성)
  upsertGlobalWords: (lexemes: Array<Omit<Lexeme, "id" | "createdAt">>) => void;
}

// ✅ 기본 단어 세트 (하드코딩)
const BASIC_WORDS: Array<Omit<Lexeme, "id" | "createdAt">> = [
  // 기본 동사
  { en: "go", ko: "가다", pos: "VERB", tags: ["daily", "directions"] },
  { en: "come", ko: "오다", pos: "VERB", tags: ["daily"] },
  { en: "have", ko: "가지다/먹다", pos: "VERB", tags: ["daily"] },
  { en: "get", ko: "받다/사다", pos: "VERB", tags: ["daily"] },
  { en: "make", ko: "만들다", pos: "VERB", tags: ["daily"] },
  { en: "want", ko: "원하다", pos: "VERB", tags: ["daily"] },
  { en: "need", ko: "필요하다", pos: "VERB", tags: ["daily"] },
  { en: "like", ko: "좋아하다", pos: "VERB", tags: ["daily"] },

  // 기본 장소
  { en: "home", ko: "집", pos: "PLACE", tags: ["daily"] },
  { en: "school", ko: "학교", pos: "PLACE", tags: ["daily", "school"] },
  { en: "office", ko: "회사", pos: "PLACE", tags: ["daily", "business"] },
  { en: "store", ko: "가게", pos: "PLACE", tags: ["daily"] },
  { en: "hospital", ko: "병원", pos: "PLACE", tags: ["daily"] },
  { en: "bus stop", ko: "버스 정류장", pos: "PLACE", tags: ["directions"] },
  { en: "subway station", ko: "지하철역", pos: "PLACE", tags: ["directions"] },
  { en: "cafe", ko: "카페", pos: "PLACE", tags: ["daily"] },

  // 기본 사람
  { en: "friend", ko: "친구", pos: "PERSON", tags: ["daily"] },
  { en: "family", ko: "가족", pos: "PERSON", tags: ["daily"] },
  { en: "teacher", ko: "선생님", pos: "PERSON", tags: ["school"] },
  { en: "student", ko: "학생", pos: "PERSON", tags: ["school"] },

  // 기본 물건
  { en: "food", ko: "음식", pos: "ITEM", tags: ["daily"] },
  { en: "water", ko: "물", pos: "ITEM", tags: ["daily"] },
  { en: "coffee", ko: "커피", pos: "ITEM", tags: ["daily"] },
  { en: "book", ko: "책", pos: "ITEM", tags: ["daily", "school"] },
  { en: "phone", ko: "휴대폰", pos: "ITEM", tags: ["daily"] },
  { en: "bag", ko: "가방", pos: "ITEM", tags: ["daily"] },

  // 기본 시간
  { en: "today", ko: "오늘", pos: "TIME", tags: ["daily"] },
  { en: "tomorrow", ko: "내일", pos: "TIME", tags: ["daily"] },
  { en: "morning", ko: "아침", pos: "TIME", tags: ["daily"] },
  { en: "afternoon", ko: "오후", pos: "TIME", tags: ["daily"] },
  { en: "evening", ko: "저녁", pos: "TIME", tags: ["daily"] },
  { en: "weekend", ko: "주말", pos: "TIME", tags: ["daily"] },
];

export const useLexiconStore = create<LexiconState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      words: [],
      loadedPacks: [],
      isInitialized: false,

      addWord: (w) => {
        const normalizedEn = w.en.toLowerCase().trim();
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
          en: w.en.trim(),
          ko: w.ko.trim(),
          pos: w.pos,
          tags: w.tags ?? [],
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
        const n = q.toLowerCase().trim();
        return get().words.filter(
          (w) => w.en.toLowerCase().includes(n) || w.ko.includes(q)
        );
      },

      findByPos: (pos, categories) => {
        let filtered = get().words.filter((w) => pos.includes(w.pos));

        if (categories?.length) {
          filtered = filtered.filter((w) =>
            w.tags.some((tag) => categories.includes(tag))
          );
        }

        return filtered;
      },

      // ✅ upsertGlobalWords 구현 (loadPacks.ts 호환성)
      upsertGlobalWords: (lexemes) => {
        const state = get();
        const existingKeys = new Set(
          state.words.map((w) => `${w.en.toLowerCase()}_${w.pos}`)
        );

        const newWords: (Lexeme & { source: Source })[] = lexemes
          .filter(
            (lexeme) =>
              !existingKeys.has(`${lexeme.en.toLowerCase()}_${lexeme.pos}`)
          )
          .map((lexeme, index) => ({
            id: `pack_${Date.now()}_${index}`,
            en: lexeme.en,
            ko: lexeme.ko,
            pos: lexeme.pos,
            tags: lexeme.tags || [],
            createdAt: new Date().toISOString(),
            source: "pack" as Source,
          }));

        if (newWords.length > 0) {
          set((state) => ({
            words: [...state.words, ...newWords],
          }));
          console.log(`✅ ${newWords.length}개 글로벌 단어 추가됨`);
        }
      },

      // ✅ seedIfEmpty 대체: 기본 단어로 초기화
      initializeWithBasicWords: () => {
        const state = get();
        if (state.isInitialized) return;

        console.log("🔄 기본 단어로 초기화 중...");

        const existingKeys = new Set(
          state.words.map((w) => `${w.en.toLowerCase()}_${w.pos}`)
        );

        const newWords = BASIC_WORDS.filter(
          (word) => !existingKeys.has(`${word.en.toLowerCase()}_${word.pos}`)
        ).map((word, index) => ({
          id: `basic_${Date.now()}_${index}`,
          en: word.en,
          ko: word.ko,
          pos: word.pos,
          tags: word.tags,
          createdAt: new Date().toISOString(),
          source: "global" as Source,
        }));

        if (newWords.length > 0) {
          set((state) => ({
            words: [...state.words, ...newWords],
            isInitialized: true,
          }));
          console.log(`✅ ${newWords.length}개 기본 단어 추가됨`);
        } else {
          set((state) => ({ ...state, isInitialized: true }));
        }
      },

      // ✅ 기본 단어 보장 (패턴 생성 전 호출용)
      ensureBasicWordsAvailable: () => {
        const state = get();
        const posCount = state.words.reduce((acc, w) => {
          acc[w.pos] = (acc[w.pos] || 0) + 1;
          return acc;
        }, {} as Record<POS, number>);

        // 최소 필요 단어 체크
        const minimums = {
          VERB: 3,
          PLACE: 3,
          PERSON: 2,
          ITEM: 3,
          TIME: 2,
        };

        let needsMore = false;
        for (const [pos, min] of Object.entries(minimums)) {
          if ((posCount[pos as POS] || 0) < min) {
            needsMore = true;
            break;
          }
        }

        if (needsMore) {
          console.log("📈 기본 단어 추가 필요, 자동 추가 중...");
          get().initializeWithBasicWords();
        }
      },

      // 최소 단어 수 보장
      ensureMinimumWords: (count, categories) => {
        const current = categories
          ? get().getWordsByCategory(categories)
          : get().words;

        const totalBefore = current.length;

        if (totalBefore >= count) {
          return { added: 0, totalBefore, totalAfter: totalBefore };
        }

        // 먼저 기본 단어로 채우기 시도
        get().initializeWithBasicWords();

        const afterBasic = categories
          ? get().getWordsByCategory(categories).length
          : get().words.length;

        return {
          added: afterBasic - totalBefore,
          totalBefore,
          totalAfter: afterBasic,
        };
      },

      getWordsByCategory: (categories) => {
        return get().words.filter((w) =>
          w.tags.some((tag) => categories.includes(tag))
        );
      },

      exportUserWords: () => get().words.filter((w) => w.source === "user"),
    }),
    {
      name: "mypattern-lexicon",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        words: s.words.filter((w) => w.source === "user"), // 사용자 단어만 저장
        loadedPacks: s.loadedPacks,
        isInitialized: s.isInitialized,
      }),
      onRehydrateStorage: () => (state, err) => {
        if (!err && state) {
          console.log("[lexiconStore] 하이드레이션 완료", {
            words: state.words?.length,
            loadedPacks: state.loadedPacks?.length,
            isInitialized: state.isInitialized,
          });

          // ✅ 하이드레이션 후 자동으로 기본 단어 초기화
          setTimeout(() => {
            if (!state.isInitialized) {
              (state as LexiconState).initializeWithBasicWords();
            }
          }, 100);
        }

        return { hydrated: true };
      },
    }
  )
);
