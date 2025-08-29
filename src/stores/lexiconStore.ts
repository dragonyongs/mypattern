// src/stores/lexiconStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Lexeme, POS } from "@/features/learn/types/patternCore.types";

type Source = "user" | "global";

// 간소화된 최소 데이터팩 (하드코딩 최소화)
const CORE_WORDS = [
  { en: "go", ko: "가다", pos: "VERB" as const, tags: ["daily"] },
  { en: "come", ko: "오다", pos: "VERB" as const, tags: ["daily"] },
  { en: "home", ko: "집", pos: "PLACE" as const, tags: ["daily"] },
  { en: "school", ko: "학교", pos: "PLACE" as const, tags: ["school"] },
  { en: "friend", ko: "친구", pos: "PERSON" as const, tags: ["daily"] },
  { en: "today", ko: "오늘", pos: "TIME" as const, tags: ["daily"] },
  { en: "phone", ko: "휴대폰", pos: "ITEM" as const, tags: ["daily"] },
];

interface LexiconState {
  hydrated: boolean;
  words: (Lexeme & { source: Source })[];
  userAddedCoreWords: Set<string>; // 새로 추가

  // 기본 CRUD
  addWord: (
    w: Omit<Lexeme & { source?: Source }, "id" | "createdAt">
  ) => string;
  updateWord: (id: string, upd: Partial<Lexeme>) => void;
  removeWord: (id: string) => void;

  // 검색 및 필터
  search: (q: string) => (Lexeme & { source: Source })[];
  findByPos: (pos: POS[]) => (Lexeme & { source: Source })[];

  // 초기화
  seedIfEmpty: () => void;

  // 코어 단어 관리 (새로 추가)
  addCoreWordToUser: (coreWordId: string) => void;
  removeCoreWordFromUser: (coreWordId: string) => void;

  // 유틸리티
  exportUserWords: () => Lexeme[];
}

export const useLexiconStore = create<LexiconState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      words: [],
      userAddedCoreWords: new Set<string>(),

      // 기본 단어 추가
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

      findByPos: (pos) => get().words.filter((w) => pos.includes(w.pos)),

      // 초기 시드 데이터 로드 (간소화)
      seedIfEmpty: () => {
        const st = get();
        if (!st.hydrated || st.words.length > 0) return;

        const coreWords = CORE_WORDS.map((w, index) => ({
          id: `core_${Date.now()}_${index}`,
          en: w.en,
          ko: w.ko,
          pos: w.pos,
          tags: w.tags,
          createdAt: new Date().toISOString(),
          source: "global" as Source,
        }));

        set((state) => ({ words: [...coreWords, ...state.words] }));
        console.log(`✅ ${coreWords.length}개 코어 단어 로드됨`);
      },

      // 코어 단어를 사용자 단어장에 추가 (참조 방식)
      addCoreWordToUser: (coreWordId) => {
        const state = get();
        const newSet = new Set(state.userAddedCoreWords);
        newSet.add(coreWordId);
        set({ userAddedCoreWords: newSet });
        console.log(`✅ 코어 단어 추가됨: ${coreWordId}`);
      },

      // 코어 단어를 사용자 단어장에서 제거
      removeCoreWordFromUser: (coreWordId) => {
        const state = get();
        const newSet = new Set(state.userAddedCoreWords);
        newSet.delete(coreWordId);
        set({ userAddedCoreWords: newSet });
        console.log(`✅ 코어 단어 제거됨: ${coreWordId}`);
      },

      exportUserWords: () => get().words.filter((w) => w.source === "user"),
    }),
    {
      name: "mypattern-lexicon",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        words: s.words,
        userAddedCoreWords: Array.from(s.userAddedCoreWords), // Set을 Array로 변환
      }),
      onRehydrateStorage: () => (state, err) => {
        if (!err && state) {
          // Array를 다시 Set으로 변환
          state.userAddedCoreWords = new Set(state.userAddedCoreWords || []);
          console.log("[lexiconStore] 하이드레이션 완료", {
            words: state.words?.length,
            userAddedCore: state.userAddedCoreWords.size,
          });
        }
        return { hydrated: true };
      },
    }
  )
);

// 하이드레이션 보장
const persistApi = (useLexiconStore as any).persist;
if (persistApi?.hasHydrated?.()) {
  useLexiconStore.setState({ hydrated: true });
}
