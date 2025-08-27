// src/features/learn/services/nounInflector.ts
const IRREGULAR_NOUNS: Record<string, string> = {
  tooth: "teeth",
  foot: "feet",
  goose: "geese",
  man: "men",
  woman: "women",
  child: "children",
  mouse: "mice",
  person: "people",
  // 필요시 확장
};

const INVARIABLE_PLURALS = new Set([
  "sheep",
  "deer",
  "fish",
  "species",
  "aircraft",
]);

export function pluralize(lemma: string, irregular?: string) {
  const base = lemma.toLowerCase().trim();
  if (irregular) return irregular;
  if (INVARIABLE_PLURALS.has(base)) return lemma; // 단복수 동일
  if (IRREGULAR_NOUNS[base]) return IRREGULAR_NOUNS[base]; // tooth→teeth 등
  if (/[sxz]$|ch$|sh$/i.test(base)) return lemma + "es";
  if (/[bcdfghjklmnpqrstvwxyz]y$/i.test(base))
    return lemma.replace(/y$/i, "ies");
  if (/f$|fe$/i.test(base)) return base.replace(/f(e)?$/i, "ves"); // knife→knives
  return lemma + "s";
}

export function realizeNoun(
  lex: { en: string; irregularPlural?: string; countability?: Countability },
  number: "singular" | "plural",
  withArticle = true
) {
  if (number === "plural") return pluralize(lex.en, lex.irregularPlural);
  // singular
  if (withArticle && (lex.countability ?? "countable") !== "uncountable") {
    const a = /^[aeiou]/i.test(lex.en) ? "an " : "a ";
    return a + lex.en;
  }
  return lex.en;
}
