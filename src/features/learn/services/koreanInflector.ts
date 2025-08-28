// src/features/learn/services/koreanInflector.ts
export function inflectKoreanVerb(verb: string, morph?: any): string {
  // 기본형에서 '다' 제거
  const stem = verb.endsWith("다") ? verb.slice(0, -1) : verb;

  if (!morph) return verb;

  const { tense, aspect, person } = morph;

  // ✅ 과거 단순 - 반말 통일
  if (tense === "past" && aspect === "simple") {
    if (stem === "만들") return "만들었어";
    if (stem === "가") return "갔어";
    if (stem === "오") return "왔어";
    if (stem === "받") return "받았어";
    if (stem === "가지") return "가졌어";
    if (stem === "마시") return "마셨어";
    if (stem === "먹") return "먹었어";
    if (stem === "공부하") return "공부했어";
    if (stem === "일하") return "일했어";
    return `${stem}었어`; // 기본 규칙
  }

  // ✅ 과거 진행 - 중복 방지, 반말 통일
  if (tense === "past" && aspect === "progressive") {
    if (stem === "만들") return "만들고 있었어";
    if (stem === "가") return "가고 있었어";
    if (stem === "공부하") return "공부하고 있었어";
    if (stem === "일하") return "일하고 있었어";
    return `${stem}고 있었어`; // ✅ 단일 형태로 통일
  }

  // ✅ 현재 완료 - 반말 통일
  if (tense === "present" && aspect === "perfect") {
    if (stem === "만들") return "만들었어";
    if (stem === "가") return "갔어";
    if (stem === "마시") return "마셨어";
    if (stem === "먹") return "먹었어";
    return `${stem}었어`;
  }

  // ✅ 현재 3인칭 단수 - 존댓말 유지
  if (tense === "present" && aspect === "simple" && person === "third") {
    if (stem === "만들") return "만들어요";
    if (stem === "가") return "가요";
    if (stem === "마시") return "마셔요";
    return `${stem}어요`;
  }

  return verb; // 기본값
}
