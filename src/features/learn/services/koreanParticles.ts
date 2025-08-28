// src/features/learn/services/koreanParticles.ts
export function attachParticle(noun: string, particle: string): string {
  const lastChar = noun.slice(-1);
  const lastCharCode = lastChar.charCodeAt(0);

  // 한글 체크 (가-힣)
  if (lastCharCode >= 0xac00 && lastCharCode <= 0xd7a3) {
    const finalConsonant = (lastCharCode - 0xac00) % 28;
    const hasConsonant = finalConsonant > 0;

    switch (particle) {
      case "을/를":
        return hasConsonant ? "을" : "를";
      case "이/가":
        return hasConsonant ? "이" : "가";
      case "은/는":
        return hasConsonant ? "은" : "는";
      case "과/와":
        return hasConsonant ? "과" : "와";
      default:
        return particle;
    }
  }

  // 영어나 숫자의 경우 (자음으로 간주)
  return particle.split("/")[0];
}
