// src/features/learn/services/keywordComposer.ts
import { normalizeEn } from "@/shared/lib/lang";
import { translationEngine } from "./translationEngine";

export type ComposeCandidate = { text: string; korean: string };

const ko2en: Record<string, string> = {
  버스정류장: "bus stop",
  횡단보도: "crosswalk",
  분리대: "median",
  지하철역: "subway station",
  학교: "school",
  친구: "friend",
  음식: "food",
  방과후: "after school",
};

function pickPlaceAndLandmark(words: string[]) {
  const w = words.map((w) => w.toLowerCase());
  const place =
    w.find((x) => /bus|stop|station|school|cafe|hotel|airport/.test(x)) ??
    "the bus stop";
  const landmark =
    w.find((x) => /crosswalk|intersection|median|corner|light/.test(x)) ??
    "the crosswalk";
  return { place, landmark };
}

function fill(t: string, m: Record<string, string>) {
  return t.replace(/\[([A-Z]+)\]/g, (_, k) => m[k] ?? "");
}

export function composeFromKeywords(
  rawKeywords: string[],
  level: "beginner" | "intermediate" | "advanced",
  lang: "ko" | "en" | "mixed",
  limit = 7
): ComposeCandidate[] {
  const enKeywords = rawKeywords.map((k) => {
    if (lang === "ko" || lang === "mixed") {
      const trimmed = k.trim();
      if (ko2en[trimmed]) return ko2en[trimmed];
    }
    return k;
  });

  const { place, landmark } = pickPlaceAndLandmark(enKeywords);

  const templates = [
    {
      id: "dir.where",
      en: "Excuse me, where is [PLACE]?",
      ko: "실례합니다, [PLACE]가 어디 있나요?",
    },
    {
      id: "dir.which",
      en: "Which bus should I take to [PLACE]?",
      ko: "[PLACE]까지 어떤 버스를 타야 하나요?",
    },
    {
      id: "dir.near",
      en: "Is it near the [LANDMARK]?",
      ko: "[LANDMARK] 근처인가요?",
    },
  ];

  const maps = {
    PLACE: place,
    LANDMARK: landmark,
  };

  const made = templates.map((t) => ({
    text: fill(t.en, maps),
    korean: fill(t.ko, {
      PLACE: place === "the bus stop" ? "버스 정류장" : place,
      LANDMARK: landmark === "the crosswalk" ? "횡단보도" : landmark,
    }),
  }));

  // Optionally enrich with translation-based suggestions for KO inputs
  const extras: ComposeCandidate[] = [];
  if (lang !== "en") {
    const source = rawKeywords.join(", ");
    try {
      const sugs = translationEngine.translateKoreanToEnglish(source);
      sugs
        .slice(0, 3)
        .forEach((s) => extras.push({ text: s.text, korean: source }));
    } catch {
      // ignore
    }
  }

  // Score + dedupe
  const scored = [...made, ...extras].map((c) => {
    const t = normalizeEn(c.text);
    const score =
      (/(bus|stop|station)/.test(t) ? 0.5 : 0) +
      (/(crosswalk|intersection|median)/.test(t) ? 0.3 : 0) +
      (level === "beginner" ? 0.2 : 0.1);
    return { ...c, _score: score } as any;
  });

  const unique = scored
    .sort((a, b) => b._score - a._score)
    .filter(
      (c, i, arr) =>
        arr.findIndex((x) => normalizeEn(x.text) === normalizeEn(c.text)) === i
    )
    .slice(0, limit)
    .map(({ text, korean }) => ({ text, korean }));

  return unique;
}
