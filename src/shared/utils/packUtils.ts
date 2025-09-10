// src/shared/utils/packUtils.ts
export type Vocabulary = {
  id: string;
  type: "vocabulary";
  category: string;
  word: string;
  meaning?: string;
  emoji?: string;
  pronunciation?: string;
};

export type Sentence = {
  id: string;
  type: "sentence";
  category: string;
  text: string;
  translation?: string;
  targetWords: string[]; // ex: ["hear"]
  relatedVocabIds?: string[];
};

export type PackDataMinimal = {
  id: string;
  title?: string;
  contents: Array<Vocabulary | Sentence>;
};

export type GeneratedWorkbook = {
  id: string; // e.g. `gen-w:${sentence.id}:${targetWord}`
  question: string;
  options: string[]; // option strings
  correctAnswer: string;
  explanation?: string;
  relatedSentenceId: string;
};

// 안전한 셔플 (Fisher-Yates)
function shuffle<T>(arr: T[]) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 개선된 options 생성: 유사도+랜덤 가중치
export function generateOptionsForTarget(
  targetWord: string,
  allVocabs: Vocabulary[],
  category?: string,
  totalOptions = 4
): string[] {
  // 후보 pool: 같은 카테고리 우선
  let candidates = allVocabs
    .filter((v) => v.word !== targetWord)
    .map((v) => ({ word: v.word, category: v.category }));

  // 점수를 매겨서 정렬 (유사도 우선, 그 다음 랜덤성)
  const scored = candidates.map((c) => {
    const sim = bigramDice(targetWord, c.word);
    const rand = Math.random() * 0.2; // small jitter
    return { ...c, score: sim + rand };
  });

  // 같은 카테고리인 항목들 우선적으로 필터/부스터
  const sameCat = scored.filter((s) => !category || s.category === category);
  const pool = (sameCat.length >= totalOptions - 1 ? sameCat : scored)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.word);

  // 최종 선택: 상위 (totalOptions -1)개 + 정답 섞기
  const chosen = pool.slice(0, totalOptions - 1);
  const final = shuffle([targetWord, ...chosen]);
  return final;
}

// 문장 -> 워크북 생성
export function generateWorkbookFromSentence(
  sentence: Sentence,
  allContents: Array<Vocabulary | Sentence>,
  totalOptions = 4
): GeneratedWorkbook[] {
  const vocabs = allContents.filter(
    (c): c is Vocabulary => c.type === "vocabulary"
  );
  const results: GeneratedWorkbook[] = [];

  for (const target of sentence.targetWords) {
    const options = generateOptionsForTarget(
      target,
      vocabs,
      sentence.category,
      totalOptions
    );
    const question = sentence.text.replace(
      new RegExp(`\\b${escapeRegExp(target)}\\b`, "i"),
      "_____"
    );
    results.push({
      id: `gen-w:${sentence.id}:${target}`,
      question,
      options,
      correctAnswer: target,
      explanation: undefined,
      relatedSentenceId: sentence.id,
    });
  }
  return results;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// 한 번에 팩을 최소화(필요한 vocab만 추출) — UI 목록용
export function materializeMinimalPack(pack: PackDataMinimal) {
  const sentences = pack.contents.filter(
    (c): c is Sentence => c.type === "sentence"
  );
  // targetWords 집합을 구해서 vocabulary 필터링
  const targetSet = new Set<string>();
  for (const s of sentences) {
    for (const t of s.targetWords) targetSet.add(t);
  }
  const vocabs = pack.contents.filter(
    (c): c is Vocabulary => c.type === "vocabulary"
  );
  const filteredVocab = vocabs.filter((v) => targetSet.has(v.word));
  return {
    sentences,
    targetVocabs: filteredVocab,
  };
}

// 유사도: 빅램(Dice coefficient) 기반 점수 (0..1)
function bigramDice(a: string, b: string): number {
  if (!a || !b) return 0;
  const bigrams = (s: string) =>
    s
      .toLowerCase()
      .replace(/\s+/g, " ")
      .split("")
      .reduce((acc: string[], _, i, arr) => {
        if (i < arr.length - 1) acc.push(arr[i] + arr[i + 1]);
        return acc;
      }, []);
  const A = bigrams(a);
  const B = bigrams(b);
  if (A.length === 0 || B.length === 0) return 0;
  const intersection = A.filter((x, i) => B.includes(x)).length;
  return (2 * intersection) / (A.length + B.length);
}
