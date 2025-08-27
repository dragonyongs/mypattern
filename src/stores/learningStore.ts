// src/stores/learningStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { addDays, format, differenceInDays } from "date-fns";

/* ============= 타입 정의 ============= */
export interface DailyPattern {
  id: string;
  text: string;
  korean: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  category: string;
  estimatedTime: number;
  completed: boolean;
  completedAt?: string;
}

export interface UserPattern {
  id: string;
  korean: string;
  english: string;
  category: string;
  createdAt: string;
  updatedAt?: string;
}

export interface LearningStats {
  totalPatternsLearned: number;
  todayPatternsCompleted: number;
  currentStreak: number;
  lastStudyDate: string | null;
  weeklyProgress: number[];
  monthlyGoalProgress: number;
}

export interface RecommendedContent {
  id: string;
  interest: string;
  title: string;
  description: string;
  patterns: string[];
  priority: number;
  estimatedTime: number;
}

export interface UserProgress {
  level: "beginner" | "intermediate" | "advanced";
  interests: string[];
  dailyGoal: number;
  completedToday: number;
  totalCompleted: number;
  streakCount: number;
  lastActiveDate: string | null;
}

export interface PatternProgress {
  patternId: string;
  completedSteps: string[];
  accuracy: number;
  totalAttempts: number;
  lastStudiedAt: string;
  masteryLevel: number; // 0-100
  nextReviewDate: string;
}

export type PatternLearningMode =
  | "preview"
  | "listen"
  | "repeat"
  | "type"
  | "build"
  | "review"
  | "completed";

export interface UserResponse {
  stepId: string;
  userInput: string;
  expectedAnswer: string;
  isCorrect: boolean;
  timestamp: string;
  attempts: number;
}

export interface PatternSession {
  id: string;
  patternId: string;
  mode: PatternLearningMode;
  currentStep: number;
  totalSteps: number;
  accuracy: number;
  startTime: string;
  responses: UserResponse[];
}

export interface Scenario {
  id: string;
  place: "street" | "station" | "cafe" | "office";
  intent: "ask_direction" | "bus_stop" | "order" | "small_talk";
  keywords: string[]; // ["bus stop","crosswalk", ...]
  createdAt: string;
}

// Quick Compose 내부 타입(외부 엔진 없이 동작)
export interface ComposeContext {
  intent: string;
  place: string;
  keywords: string[];
  level: "beginner" | "intermediate" | "advanced";
}
export interface ComposeResult {
  text: string;
  korean: string;
  templateId: string;
  usedChunks: string[];
  notes?: string[];
}

/* ============= 스토어 상태/액션 인터페이스 ============= */
interface LearningState {
  userProgress: UserProgress;
  dailyPatterns: DailyPattern[];
  stats: LearningStats;
  recommendedContent: RecommendedContent[];
  patternProgress: Record<string, PatternProgress>;
  currentSession: PatternSession | null;
  userLibrary: UserPattern[];
  loading: boolean;
  lastUpdated: string | null;

  // 온보딩/시나리오/퀵컴포즈
  firstRunDone: boolean;
  selectedScenario: Scenario | null;
  recentKeywords: string[];
  suggestedPhrases: string[];
  uiIntent?: {
    mode: "voice" | "write" | "edit" | null;
    patternId: string | null;
    token: number;
  };
}

interface LearningActions {
  initializeLearning: () => Promise<void>;
  updateUserProgress: (progress: Partial<UserProgress>) => void;
  completePattern: (patternId: string) => void;
  generateDailyPatterns: () => void;
  generateRecommendations: () => void;
  updateStats: () => void;
  calculateStreak: () => number;

  // 온보딩/시나리오
  setScenario: (s: Scenario) => void;
  buildDailyFromScenario: () => void;
  skipScenarioWithSamples: () => void;
  finishFirstRun: () => void;

  // 세션/진척
  startPatternSession: (patternId: string) => PatternSession;
  updatePatternProgress: (
    patternId: string,
    progress: Partial<PatternProgress>
  ) => void;
  saveSessionResult: (session: PatternSession, accuracy: number) => void;
  getPatternProgress: (patternId: string) => PatternProgress | null;

  // 사용자 라이브러리
  addUserPattern: (p: {
    korean: string;
    english: string;
    category?: string;
  }) => string;
  updateUserPattern: (id: string, upd: Partial<UserPattern>) => void;

  // 영작 검증(완료 전)
  recordWritingAttempt: (patternId: string, accuracy: number) => void;

  // 복습
  getReviewQueue: () => DailyPattern[];
  scheduleNextReview: (patternId: string, masteryLevel: number) => void;

  // Quick Compose
  suggestFromContext: (ctx: ComposeContext) => void;
  acceptSuggestionToQueue: (
    res: ComposeResult,
    mode?: "voice" | "write"
  ) => string;
  fireUIIntent: (mode: "voice" | "write" | "edit", patternId: string) => void;

  // CHANGED: 배치/중복 병합 유틸
  addOrMergeDailyPatterns: (items: DailyPattern[]) => void; // <- 추가
  acceptSuggestionsToQueueBatch: (resList: ComposeResult[]) => string[]; // <- 추가

  // 동기화
  syncWithDatabase: () => Promise<void>;
}

/* ============= 초기 상태 ============= */
const initialState: LearningState = {
  userProgress: {
    level: "beginner",
    interests: [],
    dailyGoal: 3,
    completedToday: 0,
    totalCompleted: 0,
    streakCount: 3,
    lastActiveDate: null,
  },
  dailyPatterns: [],
  stats: {
    totalPatternsLearned: 0,
    todayPatternsCompleted: 0,
    currentStreak: 3,
    lastStudyDate: null,
    weeklyProgress: [0, 0, 0, 0, 0, 0, 0],
    monthlyGoalProgress: 0,
  },
  recommendedContent: [],
  patternProgress: {},
  currentSession: null,
  userLibrary: [],
  loading: false,
  lastUpdated: null,
  firstRunDone: false,
  selectedScenario: null,
  recentKeywords: [],
  suggestedPhrases: [],
  uiIntent: { mode: null, patternId: null, token: 0 },
};

/* ============= 내부 유틸: 슬롯 채우기/간단 생성기 ============= */
function fillSlots(
  t: { en: string; ko: string; slots: string[] },
  map: Record<string, string>
) {
  let en = t.en;
  let ko = t.ko;
  for (const s of t.slots) {
    const val = map[s] ?? "";
    en = en.replace(`[${s}]`, val);
    ko = ko.replace(`[${s}]`, map[`KO_${s}`] ?? val);
  }
  // 간단 a/an 보정 + 대문자 시작
  en = en.replace(/\ba\s+([aeiouAEIOU])/g, "an $1");
  en = en.charAt(0).toUpperCase() + en.slice(1);
  return { en, ko };
}

function composeFromContext(ctx: ComposeContext): ComposeResult[] {
  // 데모 템플릿 3종 (의도는 directions 계열)
  const templates = [
    {
      id: "dir.where",
      en: "Excuse me, where is [PLACE]?",
      ko: "실례합니다, [PLACE]가 어디 있나요?",
      slots: ["PLACE"],
    },
    {
      id: "dir.which_bus",
      en: "Which bus should I take to [PLACE]?",
      ko: "[PLACE]까지 어떤 버스를 타야 하나요?",
      slots: ["PLACE"],
    },
    {
      id: "dir.near",
      en: "Is it near the [LANDMARK]?",
      ko: "[LANDMARK] 근처인가요?",
      slots: ["LANDMARK"],
    },
  ];

  const kw = ctx.keywords.map((k) => k.trim()).filter(Boolean);
  const place =
    kw.find((k) => /bus stop|stop|station/i.test(k)) || "the bus stop";
  const landmark =
    kw.find((k) => /crosswalk|intersection|median|light/i.test(k)) ||
    "the crosswalk";

  const map = {
    PLACE: place,
    LANDMARK: landmark,
    KO_PLACE: place === "the bus stop" ? "버스 정류장" : place,
    KO_LANDMARK: landmark === "the crosswalk" ? "횡단보도" : landmark,
  };

  const scored = templates.map((t) => {
    const { en, ko } = fillSlots({ en: t.en, ko: t.ko, slots: t.slots }, map);
    const fit =
      (/(bus|stop|station)/i.test(en) ? 0.5 : 0) +
      (/(crosswalk|intersection|median)/i.test(en) ? 0.3 : 0);
    const lvl = ctx.level === "beginner" ? 0.2 : 0.1;
    return {
      text: en,
      korean: ko,
      templateId: t.id,
      usedChunks: t.slots,
      notes: [],
      _score: fit + lvl,
    } as any;
  });
  return scored
    .sort((a, b) => b._score - a._score)
    .slice(0, 5) as ComposeResult[];
}

/* ============= 스토어 구현 ============= */
export const useLearningStore = create<LearningState & LearningActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      /* 초기화 */
      initializeLearning: async () => {
        set({ loading: true });
        try {
          get().generateDailyPatterns();
          get().generateRecommendations();
          get().updateStats();
          set({ loading: false, lastUpdated: new Date().toISOString() });
          console.log("🎯 학습 데이터 초기화 완료");
        } catch (e) {
          console.error("학습 데이터 초기화 실패:", e);
          set({ loading: false });
        }
      },

      /* 사용자 진행 업데이트 */
      updateUserProgress: (progress) => {
        set((state) => ({
          userProgress: { ...state.userProgress, ...progress },
        }));
        get().generateDailyPatterns();
        get().generateRecommendations();
        console.log("📊 사용자 진행 상황 업데이트:", progress);
      },

      /* 패턴 완료 */
      completePattern: (patternId) => {
        const now = new Date().toISOString();
        const today = format(new Date(), "yyyy-MM-dd");
        set((state) => ({
          dailyPatterns: state.dailyPatterns.map((p) =>
            p.id === patternId ? { ...p, completed: true, completedAt: now } : p
          ),
          userProgress: {
            ...state.userProgress,
            completedToday: state.userProgress.completedToday + 1,
            totalCompleted: state.userProgress.totalCompleted + 1,
            lastActiveDate: today,
          },
        }));
        get().updateStats();
        console.log("✅ 패턴 완료:", patternId);
      },

      /* CHANGED: 배치 병합 유틸 */
      addOrMergeDailyPatterns: (items) => {
        set((s) => {
          const seen = new Set(
            s.dailyPatterns.map((p) => normalizeText(p.text))
          );
          const appended: DailyPattern[] = [];
          for (const it of items) {
            if (!seen.has(normalizeText(it.text))) {
              seen.add(normalizeText(it.text));
              appended.push(it);
            }
          }
          return { dailyPatterns: [...appended, ...s.dailyPatterns] };
        });
      },

      /* 일일 패턴 생성(데모 템플릿) */
      generateDailyPatterns: () => {
        const { userProgress } = get();
        const { level, interests } = userProgress;
        const patternTemplates: Record<
          "beginner" | "intermediate" | "advanced",
          { text: string; korean: string; category: string }[]
        > = {
          beginner: [
            {
              text: "Hello, nice to meet you",
              korean: "안녕하세요, 만나서 반가워요",
              category: "greeting",
            },
            {
              text: "How are you doing?",
              korean: "어떻게 지내세요?",
              category: "greeting",
            },
            {
              text: "Could you help me?",
              korean: "도와주실 수 있나요?",
              category: "request",
            },
            {
              text: "Excuse me, where is...?",
              korean: "실례합니다, ...이 어디 있나요?",
              category: "directions",
            },
          ],
          intermediate: [
            {
              text: "I'm still working on it",
              korean: "아직 작업 중이에요",
              category: "progress",
            },
            {
              text: "Let me get back to you",
              korean: "다시 연락드릴게요",
              category: "business",
            },
            {
              text: "That sounds great",
              korean: "그거 좋네요",
              category: "agreement",
            },
            {
              text: "I appreciate your help",
              korean: "도움 주셔서 감사해요",
              category: "gratitude",
            },
          ],
          advanced: [
            {
              text: "I'd like to propose an alternative",
              korean: "대안을 제안하고 싶어요",
              category: "business",
            },
            {
              text: "From my perspective...",
              korean: "제 관점에서는...",
              category: "opinion",
            },
            {
              text: "That's an interesting point",
              korean: "흥미로운 지적이네요",
              category: "discussion",
            },
            {
              text: "Let's explore this further",
              korean: "이것을 더 자세히 살펴봅시다",
              category: "analysis",
            },
          ],
        };

        const templates = patternTemplates[level] || patternTemplates.beginner;
        const filtered = interests.length
          ? templates.filter((t) =>
              interests.some((i) => t.category.includes(i))
            )
          : templates;

        const daily: DailyPattern[] = (filtered.length ? filtered : templates)
          .slice(0, userProgress.dailyGoal)
          .map((t, index) => ({
            id: `daily_${Date.now()}_${index}`,
            text: t.text,
            korean: t.korean,
            difficulty: level,
            category: t.category,
            estimatedTime: 5,
            completed: false,
          }));
        set({ dailyPatterns: daily });
        console.log("📚 오늘의 패턴 생성:", daily.length);
      },

      /* 추천 생성(데모) */
      generateRecommendations: () => {
        const { userProgress } = get();
        const { interests } = userProgress;

        const recommendationTemplates: Record<string, RecommendedContent[]> = {
          directions: [
            {
              id: "dir_1",
              interest: "directions",
              title: "길 묻기 기본 패턴",
              description: "기본적인 길 찾기 표현을 배워보세요",
              patterns: [
                "Excuse me, where is...?",
                "How do I get to...?",
                "Is it far from here?",
              ],
              priority: 1,
              estimatedTime: 10,
            },
          ],
          business: [
            {
              id: "biz_1",
              interest: "business",
              title: "회의 영어 표현",
              description: "비즈니스 미팅에서 사용하는 핵심 표현",
              patterns: [
                "Let's schedule a meeting",
                "I'll get back to you",
                "That makes sense",
              ],
              priority: 2,
              estimatedTime: 15,
            },
          ],
          daily: [
            {
              id: "daily_1",
              interest: "daily",
              title: "카페 주문하기",
              description: "일상적인 카페 상황에서 사용하는 표현",
              patterns: [
                "Can I have a coffee?",
                "What would you recommend?",
                "For here or to go?",
              ],
              priority: 1,
              estimatedTime: 8,
            },
          ],
        };

        const recommendations = interests
          .map((interest) => recommendationTemplates[interest] || [])
          .flat()
          .sort((a, b) => a.priority - b.priority)
          .slice(0, 3);
        set({ recommendedContent: recommendations });
        console.log("⭐ 추천 콘텐츠 생성:", recommendations.length);
      },

      /* 통계 업데이트 */
      updateStats: () => {
        const { userProgress, dailyPatterns } = get();
        const todayCompleted = dailyPatterns.filter((p) => p.completed).length;
        const stats: LearningStats = {
          totalPatternsLearned: userProgress.totalCompleted,
          todayPatternsCompleted: todayCompleted,
          currentStreak: get().calculateStreak(),
          lastStudyDate: userProgress.lastActiveDate,
          weeklyProgress: [0, 0, 0, todayCompleted, 0, 0, 0],
          monthlyGoalProgress: (userProgress.totalCompleted / 30) * 100,
        };
        set({ stats });
        console.log("📈 통계 업데이트:", stats);
      },

      /* 연속 학습 계산 */
      calculateStreak: () => {
        const { userProgress } = get();
        const { lastActiveDate } = userProgress;
        if (!lastActiveDate) return 0;
        const diff = differenceInDays(new Date(), new Date(lastActiveDate));
        return diff <= 1 ? userProgress.streakCount : 0;
      },

      /* ============= 세션/진척 ============= */
      startPatternSession: (patternId) => {
        const session: PatternSession = {
          id: `session_${Date.now()}`,
          patternId,
          mode: "preview",
          currentStep: 0,
          totalSteps: 5,
          accuracy: 0,
          startTime: new Date().toISOString(),
          responses: [],
        };
        set({ currentSession: session });
        return session;
      },

      updatePatternProgress: (patternId, progressUpdate) => {
        const current =
          get().patternProgress[patternId] ||
          ({
            patternId,
            completedSteps: [],
            accuracy: 0,
            totalAttempts: 0,
            lastStudiedAt: new Date().toISOString(),
            masteryLevel: 0,
            nextReviewDate: new Date().toISOString(),
          } as PatternProgress);
        const updated = { ...current, ...progressUpdate };
        set((state) => ({
          patternProgress: { ...state.patternProgress, [patternId]: updated },
        }));
      },

      saveSessionResult: (session, accuracy) => {
        const { patternId } = session;
        const now = new Date().toISOString();
        const current = get().patternProgress[patternId];
        const masteryIncrease = accuracy * 20; // 100% 정확도 시 20 증가
        const newMastery = Math.min(
          100,
          (current?.masteryLevel || 0) + masteryIncrease
        );
        const nextReview = addDays(
          new Date(),
          Math.max(1, Math.floor(newMastery / 20))
        ).toISOString();
        get().updatePatternProgress(patternId, {
          accuracy,
          totalAttempts: (current?.totalAttempts || 0) + 1,
          lastStudiedAt: now,
          masteryLevel: newMastery,
          nextReviewDate: nextReview,
        });
        console.log("📚 학습 세션 저장:", {
          patternId,
          accuracy,
          masteryLevel: newMastery,
          nextReview,
        });
      },

      // CHANGED: 배치 추가
      acceptSuggestionsToQueueBatch: (resList) => {
        const level = get().userProgress.level;
        const ts = Date.now();
        const items: DailyPattern[] = resList.map((res, i) => ({
          id: `suggest_${ts + i}`,
          text: res.text,
          korean: res.korean,
          difficulty: level,
          category: "directions",
          estimatedTime: 5,
          completed: false,
        }));
        get().addOrMergeDailyPatterns(items);
        const byNorm = new Map(
          get().dailyPatterns.map((p) => [normalizeText(p.text), p.id])
        );
        return resList.map((res) => byNorm.get(normalizeText(res.text))!);
      },

      getPatternProgress: (patternId) =>
        get().patternProgress[patternId] || null,

      /* ============= 사용자 라이브러리 ============= */
      addUserPattern: (p) => {
        const id = `user_${Date.now()}`;
        const item: UserPattern = {
          id,
          korean: p.korean,
          english: p.english,
          category: p.category ?? "user",
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ userLibrary: [item, ...s.userLibrary] }));
        console.log("➕ 사용자 패턴 추가:", item);
        return id;
      },

      updateUserPattern: (id, upd) => {
        set((s) => ({
          userLibrary: s.userLibrary.map((it) =>
            it.id === id
              ? { ...it, ...upd, updatedAt: new Date().toISOString() }
              : it
          ),
        }));
      },

      /* 영작 검증(완료 전) */
      recordWritingAttempt: (patternId, accuracy) => {
        const current = get().patternProgress[patternId];
        const newMastery = Math.min(
          100,
          (current?.masteryLevel || 0) + accuracy * 10
        ); // 완료 전 누적
        const nextReview = addDays(
          new Date(),
          Math.max(1, Math.floor(newMastery / 25))
        ).toISOString();
        get().updatePatternProgress(patternId, {
          accuracy,
          totalAttempts: (current?.totalAttempts || 0) + 1,
          lastStudiedAt: new Date().toISOString(),
          masteryLevel: newMastery,
          nextReviewDate: nextReview,
        });
      },

      /* ============= 복습 ============= */
      getReviewQueue: () => {
        const { dailyPatterns, patternProgress } = get();
        const now = new Date();
        return dailyPatterns.filter((p) => {
          const prog = patternProgress[p.id];
          if (!prog) return false;
          return (
            new Date(prog.nextReviewDate) <= now && prog.masteryLevel < 100
          );
        });
      },

      scheduleNextReview: (patternId, masteryLevel) => {
        const days = Math.max(1, Math.floor(masteryLevel / 20));
        const nextReviewDate = addDays(new Date(), days).toISOString();
        get().updatePatternProgress(patternId, { nextReviewDate });
      },

      /* ============= 온보딩/시나리오 ============= */
      setScenario: (s) =>
        set({ selectedScenario: s, recentKeywords: s.keywords }),
      finishFirstRun: () => set({ firstRunDone: true }),

      buildDailyFromScenario: () => {
        const { selectedScenario, userProgress } = get();
        const level = userProgress.level;

        const base = [
          {
            text: "Excuse me, where is [PLACE]?",
            korean: "실례합니다, [PLACE]가 어디 있나요?",
            category: "directions",
          },
          {
            text: "Which bus should I take to [PLACE]?",
            korean: "[PLACE]까지 어떤 버스를 타야 하나요?",
            category: "directions",
          },
          {
            text: "Is it near the [LANDMARK]?",
            korean: "[LANDMARK] 근처인가요?",
            category: "directions",
          },
        ];

        const kw = selectedScenario?.keywords ?? [];
        const place = kw || "the bus stop"; // CHANGED: 배열 전체가 아닌 첫 요소를 사용
        const landmark = kw[1] || "crosswalk";

        const maps = [
          { PLACE: place, LANDMARK: "crosswalk" },
          { PLACE: place, LANDMARK: "median" },
          { PLACE: "Cheongdam Station", LANDMARK: landmark },
        ];

        const fill = (t: string, map: Record<string, string>) =>
          t.replace(/\[([A-Z]+)\]/g, (_, k) => map[k] ?? "");

        const built: DailyPattern[] = maps
          .slice(0, userProgress.dailyGoal)
          .map((m, i) => ({
            id: `daily_${Date.now()}_${i}`,
            text: fill(base[i % base.length].text, m),
            korean: fill(base[i % base.length].korean, {
              PLACE: m.PLACE === "the bus stop" ? "버스 정류장" : m.PLACE,
              LANDMARK: m.LANDMARK === "crosswalk" ? "횡단보도" : m.LANDMARK,
            }),
            difficulty: level,
            category: base[i % base.length].category,
            estimatedTime: 5,
            completed: false,
          }));
        set({ dailyPatterns: built });
        get().updateStats();
      },

      skipScenarioWithSamples: () => {
        get().generateDailyPatterns();
      },

      /* ============= Quick Compose ============= */
      suggestFromContext: (ctx) => {
        const res = composeFromContext(ctx);
        set({ suggestedPhrases: res.map((r) => r.text) });
      },

      fireUIIntent: (mode, patternId) => {
        set({ uiIntent: { mode, patternId, token: Date.now() } });
      },

      acceptSuggestionToQueue: (res) => {
        const exists = get().dailyPatterns.find(
          (x) => normalizeText(x.text) === normalizeText(res.text)
        );
        if (exists) return exists.id;

        const id = `suggest_${Date.now()}`;
        const level = get().userProgress.level;
        const p: DailyPattern = {
          id,
          text: res.text,
          korean: res.korean,
          difficulty: level,
          category: "directions",
          estimatedTime: 5,
          completed: false,
        };
        set((s) => ({ dailyPatterns: [p, ...s.dailyPatterns] }));
        return id;
      },

      /* ============= 동기화(추후) ============= */
      syncWithDatabase: async () => {
        console.log("🔄 데이터베이스 동기화 (추후 구현)");
      },
    }),
    {
      name: "mypattern-learning",
      partialize: (state) => ({
        userProgress: state.userProgress,
        dailyPatterns: state.dailyPatterns,
        stats: state.stats,
        patternProgress: state.patternProgress,
        recommendedContent: state.recommendedContent,
        userLibrary: state.userLibrary,
        selectedScenario: state.selectedScenario,
        firstRunDone: state.firstRunDone,
        recentKeywords: state.recentKeywords,
        suggestedPhrases: state.suggestedPhrases,
        lastUpdated: state.lastUpdated,
      }),
    }
  )
);

/* ============= 공용 유틸 ============= */
function normalizeText(t: string) {
  return t.toLowerCase().trim();
}
