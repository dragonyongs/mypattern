// src/shared/services/contentFilterService.ts
export class ContentFilterService {
  // 특정 날짜의 콘텐츠 필터링
  getContentForDay(contents: Content[], day: number, phase?: string) {
    return contents.filter(
      (content) =>
        content.includedInDays.includes(day) &&
        (!phase || content.phase.includes(phase))
    );
  }

  // 단계별 콘텐츠 필터링
  getContentByPhase(contents: Content[], phase: string, day?: number) {
    return contents.filter(
      (content) =>
        content.phase.includes(phase) &&
        (!day || content.includedInDays.includes(day))
    );
  }

  // 연관 콘텐츠 가져오기
  getRelatedContent(contents: Content[], contentId: string) {
    const content = contents.find((c) => c.id === contentId);
    if (!content) return [];

    return contents.filter(
      (c) =>
        c.relatedVocab?.includes(contentId) ||
        c.relatedSentence?.includes(contentId) ||
        content.relatedVocab?.includes(c.id)
    );
  }
}
