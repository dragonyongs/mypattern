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
  come: { past: "came", ppart: "come", third: "comes" },
  get: { past: "got", ppart: "gotten", third: "gets" },
  study: { past: "studied", ppart: "studied", third: "studies" },
  work: { past: "worked", ppart: "worked", third: "works" },
};

function getThirdPersonForm(lemma: string): string {
  if (IRREGULAR[lemma]?.third) return IRREGULAR[lemma].third;
  if (/[sxz]$|ch$|sh$/i.test(lemma)) return lemma + "es";
  if (/[bcdfghjklmnpqrstvwxyz]y$/i.test(lemma))
    return lemma.replace(/y$/i, "ies");
  return lemma + "s";
}

function getPastForm(lemma: string): string {
  if (IRREGULAR[lemma]?.past) return IRREGULAR[lemma].past;
  if (/e$/i.test(lemma)) return lemma + "d";
  if (/[bcdfghjklmnpqrstvwxyz]y$/i.test(lemma))
    return lemma.replace(/y$/i, "ied");
  return lemma + "ed";
}

function getPastParticiple(lemma: string): string {
  if (IRREGULAR[lemma]?.ppart) return IRREGULAR[lemma].ppart;
  return getPastForm(lemma);
}

function getIngForm(lemma: string): string {
  if (lemma === "make") return "making";
  if (lemma === "take") return "taking";
  if (lemma === "come") return "coming";
  if (lemma === "get") return "getting";
  if (lemma === "study") return "studying";
  if (lemma === "work") return "working";

  // 일반 규칙: e로 끝나는 경우 (ee 제외)
  if (/e$/i.test(lemma) && !/ee$/i.test(lemma)) {
    return lemma.slice(0, -1) + "ing";
  }

  // 자음+모음+자음 패턴 (겹받침)
  if (
    /[bcdfghjklmnpqrstvwxyz][aeiou][bcdfghjklmnpqrstvwxyz]$/.test(lemma) &&
    lemma.length > 3
  ) {
    return lemma + lemma.slice(-1) + "ing";
  }

  return lemma + "ing";
}

export function inflectVerb(lemma: string, f: Partial<VerbFeatures> = {}) {
  const tense = f.tense ?? "present";
  const aspect = f.aspect ?? "simple";
  const person = f.person ?? "first";
  const number = f.number ?? "singular";
  const neg = f.polarity === "negative";

  // ✅ Progressive 형태 - 중복 방지
  if (aspect === "progressive") {
    const beForm =
      tense === "past"
        ? person === "first" && number === "singular"
          ? "was"
          : "were"
        : tense === "present"
        ? person === "third" && number === "singular"
          ? "is"
          : "are"
        : "will be";

    const ingForm = getIngForm(lemma);
    return `${beForm}${neg ? " not" : ""} ${ingForm}`;
  }

  // ✅ Perfect 형태 - 중복 방지
  if (aspect === "perfect") {
    const haveForm =
      tense === "past"
        ? "had"
        : tense === "present"
        ? person === "third" && number === "singular"
          ? "has"
          : "have"
        : "will have";

    return `${haveForm}${neg ? " not" : ""} ${getPastParticiple(lemma)}`;
  }

  // Simple 형태들
  if (tense === "future") {
    return `will${neg ? " not" : ""} ${lemma}`;
  }

  if (tense === "past") {
    return `${getPastForm(lemma)}${neg ? " (negative needed)" : ""}`;
  }

  if (person === "third" && number === "singular" && tense === "present") {
    return `${getThirdPersonForm(lemma)}${neg ? " (negative needed)" : ""}`;
  }

  return `${lemma}${neg ? " (negative needed)" : ""}`;
}
