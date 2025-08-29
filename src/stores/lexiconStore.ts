// src/stores/lexiconStore.ts (완전 개선 + 기존 로직 유지 버전)

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
  userAddedCoreWords: Set<string>;
  isLoadingPacks: boolean; // ✅ 로딩 상태 추가

  // 기본 CRUD
  addWord: (w: Omit<Lexeme & { source: Source }, "id" | "createdAt">) => string;
  updateWord: (id: string, upd: Partial<Lexeme>) => void;
  removeWord: (id: string) => void;

  // 검색 및 필터
  search: (q: string) => (Lexeme & { source: Source })[];
  findByPos: (
    pos: POS[],
    categories?: LangTag[]
  ) => (Lexeme & { source: Source })[];

  // 데이터팩 관리
  ensureMinimumWords: (
    count: number,
    categories?: LangTag[]
  ) => { added: number; totalBefore: number; totalAfter: number };

  // 초기화 함수들
  initializeWithBasicWords: () => void;
  ensureBasicWordsAvailable: () => void;
  seedIfEmpty: () => void;
  loadJSONPacks: () => Promise<void>; // ✅ 추가

  // 코어 단어 관리
  addCoreWordToUser: (wordId: string) => void;
  removeCoreWordFromUser: (wordId: string) => void;

  // 유틸리티
  exportUserWords: () => Lexeme[];
  getWordsByCategory: (
    categories: LangTag[]
  ) => (Lexeme & { source: Source })[];

  // upsertGlobalWords
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
      userAddedCoreWords: new Set<string>(),
      isLoadingPacks: false,

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

      // ✅ upsertGlobalWords 구현 (JSON 팩 단어들을 global로 설정)
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
            // ✅ 핵심 수정: JSON 팩 단어들도 global로 설정 (앱 코어에 표시되도록)
            source: "global" as Source,
          }));

        if (newWords.length > 0) {
          set((state) => ({
            words: [...state.words, ...newWords],
          }));
          console.log(`✅ ${newWords.length}개 글로벌 단어 추가됨`);
        }
      },

      // ✅ JSON 팩 로딩 함수
      loadJSONPacks: async () => {
        const state = get();
        if (state.isLoadingPacks) {
          console.log("📦 이미 팩 로딩 중...");
          return;
        }

        set({ isLoadingPacks: true });

        try {
          console.log("📦 JSON 팩 로딩 시작...");

          // pack-index.json 로드
          const packIndexResponse = await fetch("/data/packs/pack-index.json");
          if (!packIndexResponse.ok) {
            throw new Error(
              `pack-index.json 로드 실패: ${packIndexResponse.status}`
            );
          }

          const packIndex = await packIndexResponse.json();
          console.log(
            "📋 pack-index 로드 완료:",
            packIndex.packs?.length || 0,
            "개 팩"
          );

          if (!packIndex.packs || !Array.isArray(packIndex.packs)) {
            console.warn("⚠️ pack-index.json에 올바른 packs 배열이 없습니다");
            return;
          }

          // 이미 로드된 팩들 체크
          const currentState = get();
          const packsToLoad = packIndex.packs.filter(
            (pack: any) => !currentState.loadedPacks.includes(pack.packId)
          );

          console.log("🔄 로드할 팩들:", packsToLoad.length, "개");

          let totalLoaded = 0;
          for (const pack of packsToLoad) {
            try {
              console.log(`📥 ${pack.packId} 로딩 중...`);
              const response = await fetch(`/data/packs/${pack.file}`);

              if (!response.ok) {
                console.warn(`⚠️ ${pack.file} 로드 실패: ${response.status}`);
                continue;
              }

              const packData = await response.json();

              // lexemes를 글로벌 단어로 추가
              if (
                packData.lexemes &&
                Array.isArray(packData.lexemes) &&
                packData.lexemes.length > 0
              ) {
                get().upsertGlobalWords(packData.lexemes);
                totalLoaded += packData.lexemes.length;

                // 로드된 팩 기록
                set((state) => ({
                  loadedPacks: [...state.loadedPacks, pack.packId],
                }));

                console.log(
                  `✅ ${pack.packId} 완료: ${packData.lexemes.length}개 단어`
                );
              } else {
                console.warn(`⚠️ ${pack.packId}에 올바른 lexemes가 없습니다`);
              }

              // 과도한 요청 방지를 위한 짧은 딜레이
              await new Promise((resolve) => setTimeout(resolve, 10));
            } catch (error) {
              console.warn(`⚠️ ${pack.packId} 팩 로드 실패:`, error);
            }
          }

          console.log(`🎉 JSON 팩 로딩 완료! 총 ${totalLoaded}개 단어 추가됨`);
        } catch (error) {
          console.error("❌ JSON 팩 로딩 실패:", error);
        } finally {
          set({ isLoadingPacks: false });
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

      // ✅ seedIfEmpty 구현
      seedIfEmpty: () => {
        // 기본 단어 초기화
        get().initializeWithBasicWords();

        // JSON 팩들도 로드 (비동기)
        get()
          .loadJSONPacks()
          .catch((error) => {
            console.warn("JSON 팩 로딩 중 오류 발생:", error);
          });
      },

      // ✅ 코어 단어를 내 단어장에 추가 (참조 방식)
      addCoreWordToUser: (wordId) => {
        set((state) => ({
          userAddedCoreWords: new Set([...state.userAddedCoreWords, wordId]),
        }));
      },

      // ✅ 코어 단어를 내 단어장에서 제거
      removeCoreWordFromUser: (wordId) => {
        set((state) => {
          const newSet = new Set(state.userAddedCoreWords);
          newSet.delete(wordId);
          return { userAddedCoreWords: newSet };
        });
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
        // isInitialized를 저장하지 않음 (매번 코어 단어 체크하도록)
        userAddedCoreWords: Array.from(s.userAddedCoreWords),
      }),
      onRehydrateStorage: () => (state, err) => {
        if (!err && state) {
          console.log("[lexiconStore] 하이드레이션 완료", {
            words: state.words?.length,
            loadedPacks: state.loadedPacks?.length,
          });

          // ✅ 하이드레이션 시 Set으로 복원
          if (Array.isArray(state.userAddedCoreWords)) {
            (state as any).userAddedCoreWords = new Set(
              state.userAddedCoreWords
            );
          } else {
            (state as any).userAddedCoreWords = new Set<string>();
          }

          // ✅ 매번 기본 단어 초기화 (isInitialized를 저장하지 않으므로)
          setTimeout(() => {
            (state as LexiconState).initializeWithBasicWords();
          }, 100);
        }
        return { hydrated: true };
      },
    }
  )
);
