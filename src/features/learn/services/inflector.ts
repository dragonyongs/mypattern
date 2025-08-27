// src/features/learn/services/inflector.ts
import type { VerbFeatures } from "../types/patternCore.types";

const IRREGULAR: Record<
  string,
  { past: string; ppart: string; third: string }
> = {
  be: { past: "was/were", ppart: "been", third: "is" },
  go: { past: "went", ppart: "gone", third: "goes" },
  have: { past: "had", ppart: "had", third: "has" },
  do: { past: "did", ppart: "done", third: "does" },
  make: { past: "made", ppart: "made", third: "makes" },
  take: { past: "took", ppart: "taken", third: "takes" },
  bring: { past: "brought", ppart: "brought", third: "brings" },
};

function thirdPerson(lemma: string) {
  if (IRREGULAR[lemma]?.third) return IRREGULAR[lemma].third;
  if (/[sxz]$|ch$|sh$/i.test(lemma)) return lemma + "es";
  if (/[bcdfghjklmnpqrstvwxyz]y$/i.test(lemma))
    return lemma.replace(/y$/i, "ies");
  return lemma + "s";
}

function pastForm(lemma: string) {
  if (IRREGULAR[lemma]?.past) return IRREGULAR[lemma].past;
  if (/e$/i.test(lemma)) return lemma + "d";
  if (/[bcdfghjklmnpqrstvwxyz]y$/i.test(lemma))
    return lemma.replace(/y$/i, "ied");
  return lemma + "ed";
}
function ppart(lemma: string) {
  if (IRREGULAR[lemma]?.ppart) return IRREGULAR[lemma].ppart;
  return pastForm(lemma);
}

export function inflectVerb(lemma: string, f: Partial<VerbFeatures> = {}) {
  const tense = f.tense ?? "present";
  const aspect = f.aspect ?? "simple";
  const person = f.person ?? "first";
  const number = f.number ?? "singular";
  const neg = f.polarity === "negative";

  // 조동사/비동사 처리(간단)
  const isBe = lemma === "be";
  const isHave = lemma === "have";
  const isDo = lemma === "do";

  const not = neg ? " not" : "";

  if (aspect === "progressive") {
    const beForm =
      tense === "past"
        ? number === "plural" || person !== "third"
          ? "were"
          : "was"
        : tense === "present"
        ? person === "third" && number === "singular"
          ? "is"
          : "are"
        : "will be";
    const baseIng =
      /e$/i.test(lemma) && !/ee$/i.test(lemma)
        ? lemma.replace(/e$/i, "ing")
        : lemma + "ing";
    return `${beForm}${not} ${baseIng}`.trim();
  }

  if (aspect === "perfect") {
    const haveForm =
      tense === "past"
        ? "had"
        : tense === "present"
        ? person === "third" && number === "singular"
          ? "has"
          : "have"
        : "will have";
    return `${haveForm}${not} ${ppart(lemma)}`.trim();
  }

  // simple
  if (tense === "future") return `will${not} ${lemma}`.trim();
  if (tense === "past")
    return `${pastForm(lemma)}` + (neg ? " (did not + base)" : "");
  // present
  if (person === "third" && number === "singular")
    return `${thirdPerson(lemma)}` + (neg ? " (does not + base)" : "");
  return `${lemma}` + (neg ? " (do not + base)" : "");
}
