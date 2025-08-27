export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface LevelQuestion {
  id: string;
  type: "translation" | "grammar" | "comprehension";
  difficulty: "beginner" | "intermediate" | "advanced";
  question: string;
  options: QuestionOption[];
  explanation?: string;
  tags: string[];
}

export const levelTestQuestions: LevelQuestion[] = [
  {
    id: "q1",
    type: "translation",
    difficulty: "beginner",
    question: "Hello, nice to meet you.",
    options: [
      { id: "q1_opt1", text: "안녕하세요, 처음 뵙겠습니다.", isCorrect: false },
      { id: "q1_opt2", text: "안녕, 만나서 반가워.", isCorrect: false },
      {
        id: "q1_opt3",
        text: "안녕하세요, 만나서 반갑습니다.",
        isCorrect: true,
      },
      { id: "q1_opt4", text: "잘 모르겠어요", isCorrect: false },
    ],
    explanation:
      "'Nice to meet you'는 '만나서 반갑습니다'가 가장 자연스러운 번역입니다.",
    tags: ["greeting", "formal", "basic"],
  },
  {
    id: "q2",
    type: "translation",
    difficulty: "intermediate",
    question: "Could you help me with this?",
    options: [
      { id: "q2_opt1", text: "이것 좀 도와주시겠어요?", isCorrect: true },
      {
        id: "q2_opt2",
        text: "이것을 나를 도와줄 수 있나요?",
        isCorrect: false,
      },
      {
        id: "q2_opt3",
        text: "이것으로 나를 도울 수 있어요?",
        isCorrect: false,
      },
      { id: "q2_opt4", text: "잘 모르겠어요", isCorrect: false },
    ],
    explanation: "'Could you help me with~'는 정중한 요청 표현입니다.",
    tags: ["request", "polite", "help"],
  },
  {
    id: "q3",
    type: "translation",
    difficulty: "intermediate",
    question: "I'm still working on it.",
    options: [
      { id: "q3_opt1", text: "아직 일하고 있어요.", isCorrect: false },
      { id: "q3_opt2", text: "아직 작업 중이에요.", isCorrect: true },
      { id: "q3_opt3", text: "여전히 그것을 일하고 있어요.", isCorrect: false },
      { id: "q3_opt4", text: "잘 모르겠어요", isCorrect: false },
    ],
    explanation: "'work on something'은 '~을 작업하다'는 의미입니다.",
    tags: ["progress", "continuous", "work"],
  },
  {
    id: "q4",
    type: "grammar",
    difficulty: "advanced",
    question: "다음 중 가장 자연스러운 표현은?",
    options: [
      { id: "q4_opt1", text: "I'm so sorry for the late.", isCorrect: false },
      { id: "q4_opt2", text: "I'm sorry for being late.", isCorrect: true },
      { id: "q4_opt3", text: "I'm sorry because I'm late.", isCorrect: false },
      { id: "q4_opt4", text: "잘 모르겠어요", isCorrect: false },
    ],
    explanation: "'Sorry for + -ing'가 가장 자연스러운 사과 표현입니다.",
    tags: ["apology", "grammar", "gerund"],
  },
  {
    id: "q5",
    type: "comprehension",
    difficulty: "intermediate",
    question: "What does 'I'll get back to you' mean?",
    options: [
      { id: "q5_opt1", text: "나는 당신에게 돌아갈 것이다", isCorrect: false },
      { id: "q5_opt2", text: "나중에 다시 연락드리겠습니다", isCorrect: true },
      { id: "q5_opt3", text: "당신을 다시 데려오겠다", isCorrect: false },
      { id: "q5_opt4", text: "잘 모르겠어요", isCorrect: false },
    ],
    explanation: "'get back to someone'은 '다시 연락하다'는 의미입니다.",
    tags: ["business", "communication", "phrasal-verb"],
  },
  {
    id: "q6",
    type: "grammar",
    difficulty: "beginner",
    question: "I ___ coffee every morning.",
    options: [
      { id: "q6_opt1", text: "drink", isCorrect: true },
      { id: "q6_opt2", text: "drinks", isCorrect: false },
      { id: "q6_opt3", text: "drinking", isCorrect: false },
      { id: "q6_opt4", text: "drank", isCorrect: false },
    ],
    explanation: "현재 습관을 나타낼 때는 현재형을 사용합니다.",
    tags: ["grammar", "present-tense", "basic"],
  },
  {
    id: "q7",
    type: "comprehension",
    difficulty: "intermediate",
    question: "If I _____ you, I would study harder.",
    options: [
      { id: "q7_opt1", text: "am", isCorrect: false },
      { id: "q7_opt2", text: "was", isCorrect: false },
      { id: "q7_opt3", text: "were", isCorrect: true },
      { id: "q7_opt4", text: "will be", isCorrect: false },
    ],
    explanation: "가정법 과거에서는 'were'를 사용합니다.",
    tags: ["grammar", "conditional", "subjunctive"],
  },
  {
    id: "q8",
    type: "comprehension",
    difficulty: "advanced",
    question:
      "The project's success hinges _____ our ability to secure funding.",
    options: [
      { id: "q8_opt1", text: "on", isCorrect: true },
      { id: "q8_opt2", text: "in", isCorrect: false },
      { id: "q8_opt3", text: "by", isCorrect: false },
      { id: "q8_opt4", text: "with", isCorrect: false },
    ],
    explanation: "'hinge on'은 '~에 달려있다'는 의미의 고급 표현입니다.",
    tags: ["phrasal-verb", "business", "advanced"],
  },
];

// 레벨별 문항 필터링 헬퍼
export const getQuestionsByDifficulty = (
  difficulty: "beginner" | "intermediate" | "advanced"
) => {
  return levelTestQuestions.filter((q) => q.difficulty === difficulty);
};

// 문항 타입별 필터링
export const getQuestionsByType = (
  type: "translation" | "grammar" | "comprehension"
) => {
  return levelTestQuestions.filter((q) => q.type === type);
};

// 적응형 문항 선택 로직
export const getAdaptiveQuestions = (
  currentLevel: "beginner" | "intermediate" | "advanced" | null = null
): LevelQuestion[] => {
  if (!currentLevel) {
    // 초기 테스트: 각 레벨에서 1-2문항씩
    return [
      ...getQuestionsByDifficulty("beginner").slice(0, 2),
      ...getQuestionsByDifficulty("intermediate").slice(0, 2),
      ...getQuestionsByDifficulty("advanced").slice(0, 1),
    ];
  }

  // 기존 레벨 기반 추가 문항
  return getQuestionsByDifficulty(currentLevel).slice(0, 3);
};
