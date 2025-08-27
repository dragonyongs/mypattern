// src/features/learn/services/phraseBank.ts
import type {
  Chunk,
  Template,
  ComposeContext,
  ComposeResult,
} from "./phraseBank.types";

// 1) 시드 데이터(발췌 예시)
const CHUNKS: Chunk[] = [
  {
    id: "place.bus_stop",
    text: "the bus stop",
    type: "place",
    level: "beginner",
    tags: ["directions"],
    usFreq: 0.9,
  },
  {
    id: "landmark.crosswalk",
    text: "the crosswalk",
    type: "landmark",
    level: "beginner",
    tags: ["directions"],
    usFreq: 0.8,
  },
  {
    id: "delex.go",
    text: "go",
    type: "delex_verb",
    level: "beginner",
    tags: ["motion"],
    usFreq: 1.0,
  },
  {
    id: "filler.excuse_me",
    text: "Excuse me",
    type: "filler",
    level: "beginner",
    tags: ["polite"],
    usFreq: 1.0,
  },
];

const TEMPLATES: Template[] = [
  {
    id: "dir.where_is_place",
    english: "Excuse me, where is [PLACE]?",
    korean: "실례합니다, [PLACE]가 어디 있나요?",
    category: "directions",
    slots: ["PLACE"],
    level: "beginner",
    patterns: ["WH+BE+NP"],
  },
  {
    id: "dir.which_bus_to_place",
    english: "Which bus should I take to [PLACE]?",
    korean: "[PLACE]까지 어떤 버스를 타야 하나요?",
    category: "directions",
    slots: ["PLACE"],
    level: "beginner",
    patterns: ["WH+MODAL+V+PP"],
  },
  {
    id: "dir.near_landmark",
    english: "Is it near the [LANDMARK]?",
    korean: "[LANDMARK] 근처인가요?",
    category: "directions",
    slots: ["LANDMARK"],
    level: "beginner",
    patterns: ["BE+ADV+NP"],
  },
];

// 2) 유틸: a/an, 3인칭 단수 등 최소 보정
function fixArticles(text: string) {
  return text.replace(/\ba\s+([aeiouAEIOU])/g, "an $1");
}
function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// 3) 슬롯 채움
function fillSlots(
  t: Template,
  ctx: ComposeContext
): { en: string; ko: string; used: string[] } {
  let en = t.english,
    ko = t.korean;
  const used: string[] = [];
  const dict: Record<string, string> = {
    PLACE:
      ctx.keywords.find((k) => /bus|stop|station/i.test(k)) || "the bus stop",
    LANDMARK:
      ctx.keywords.find((k) => /crosswalk|intersection|median/i.test(k)) ||
      "the crosswalk",
    ACTION:
      ctx.keywords.find((k) => /transfer|get off|board/i.test(k)) || "transfer",
    TIME: ctx.keywords.find((k) => /minutes?|hour/i.test(k)) || "five minutes",
  };
  for (const s of t.slots) {
    const val = dict[s];
    if (val) {
      en = en.replace(`[${s}]`, val);
      ko = ko.replace(`[${s}]`, koMap(val));
      used.push(s);
    }
  }
  en = fixArticles(cap(en));
  return { en, ko, used };

  function koMap(val: string) {
    if (val === "the bus stop") return "버스 정류장";
    if (val === "the crosswalk") return "횡단보도";
    return val; // 키워드 한국어 맵핑(간단 매핑 → 점진 확장)
  }
}

// 4) 생성/랭킹
export function composeSentences(ctx: ComposeContext): ComposeResult[] {
  const candidates = TEMPLATES.filter((t) => t.category === "directions") // 데모: 의도별 필터
    .map((t) => {
      const { en, ko, used } = fillSlots(t, ctx);
      const score = scoreByFreqAndFit(en, ctx);
      return {
        text: en,
        korean: ko,
        templateId: t.id,
        usedChunks: used,
        notes: [`pattern:${t.patterns}`],
        _score: score,
      } as any;
    })
    .sort((a, b) => b._score - a._score)
    .slice(0, 5) as ComposeResult[];
  return candidates;
}

function scoreByFreqAndFit(en: string, ctx: ComposeContext) {
  const hasBus = /bus/i.test(en) ? 1 : 0;
  const hasPlace = /\b(stop|station)\b/i.test(en) ? 1 : 0;
  const lvl = ctx.level === "beginner" ? 1 : 0.8;
  return 0.5 * hasBus + 0.3 * hasPlace + 0.2 * lvl;
}
