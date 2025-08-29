// src/features/build/services/patternFeedbackService.ts (새로 생성)

interface UserFeedback {
  userInput: string;
  selectedPatternId: string;
  rejectedPatternIds: string[];
  timestamp: number;
  wasHelpful: boolean;
}

class PatternFeedbackService {
  private feedbackHistory: UserFeedback[] = [];

  // 로컬 스토리지에서 피드백 히스토리 로드
  constructor() {
    const saved = localStorage.getItem("pattern-feedback-history");
    if (saved) {
      try {
        this.feedbackHistory = JSON.parse(saved);
      } catch (e) {
        console.warn("Failed to load feedback history:", e);
      }
    }
  }

  recordSelection(
    userInput: string,
    selectedPatternId: string,
    availablePatternIds: string[]
  ) {
    const feedback: UserFeedback = {
      userInput,
      selectedPatternId,
      rejectedPatternIds: availablePatternIds.filter(
        (id) => id !== selectedPatternId
      ),
      timestamp: Date.now(),
      wasHelpful: true, // 일단 선택했다면 도움이 되었다고 가정
    };

    this.feedbackHistory.push(feedback);
    this.saveFeedbackHistory();

    // 패턴 매칭 가중치 조정 (간단한 버전)
    this.adjustPatternWeights(feedback);
  }

  private adjustPatternWeights(feedback: UserFeedback) {
    // 추후 simplePatternMatcher의 클러스터 가중치를 동적으로 조정
    // 지금은 로깅만
    console.log(
      `Pattern ${feedback.selectedPatternId} was helpful for: ${feedback.userInput}`
    );
  }

  private saveFeedbackHistory() {
    try {
      // 최근 100개만 유지
      const recentHistory = this.feedbackHistory.slice(-100);
      localStorage.setItem(
        "pattern-feedback-history",
        JSON.stringify(recentHistory)
      );
    } catch (e) {
      console.warn("Failed to save feedback history:", e);
    }
  }

  getPopularPatterns(
    limit: number = 5
  ): { patternId: string; count: number }[] {
    const patternCounts = this.feedbackHistory.reduce((acc, feedback) => {
      acc[feedback.selectedPatternId] =
        (acc[feedback.selectedPatternId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(patternCounts)
      .map(([patternId, count]) => ({ patternId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}

export const patternFeedbackService = new PatternFeedbackService();
