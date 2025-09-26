// src/shared/services/workbook.builder.ts
import type { PackData } from "@/types";
import type { WorkbookItem } from "@/types/workbook.types";
import { generateSafeOptions } from "@/utils/workbook.generator";
import { packDataService } from "@/shared/services/packDataService";

// ✅ targetWords를 기반으로 빈칸 생성
const createBlankFromTargetWord = (
  sentence: string,
  targetWord: string
): string => {
  // 정확한 단어/구문 매칭을 위한 정규식
  const escapedTarget = targetWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`\\b${escapedTarget}\\b`, "gi");

  if (regex.test(sentence)) {
    return sentence.replace(regex, "_____");
  }

  // 부분 매칭 시도 (예: "looking for" -> "look for")
  const variations = [
    targetWord,
    targetWord.replace(/ing\b/, ""), // looking -> look
    targetWord.replace(/s\b/, ""), // turns -> turn
    targetWord.replace(/ed\b/, ""), // turned -> turn
  ];

  for (const variation of variations) {
    const variationRegex = new RegExp(
      `\\b${variation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
      "gi"
    );
    if (variationRegex.test(sentence)) {
      return sentence.replace(variationRegex, "_____");
    }
  }

  return sentence; // 매칭 실패 시 원문 반환
};

// ✅ 같은 의미군 답안들 정의 (여러 답이 맞는 경우)
const getAcceptableAnswers = (
  targetWord: string,
  category: string
): string[] => {
  const baseAnswers = [targetWord.toLowerCase()];

  // 방향 관련 예외 처리
  if (category === "directions") {
    if (targetWord.toLowerCase().includes("turn left")) {
      baseAnswers.push("turn right"); // 둘 다 방향이므로 맞다고 처리할 수 있음
    }
    if (targetWord.toLowerCase().includes("turn right")) {
      baseAnswers.push("turn left");
    }
  }

  // 색상 관련 예외 처리
  if (category === "colors" || targetWord.toLowerCase().includes("coffee")) {
    // 예: "hot coffee" vs "iced coffee" 둘 다 맞을 수 있음
    if (targetWord.toLowerCase().includes("hot")) {
      baseAnswers.push("iced", "cold");
    }
    if (targetWord.toLowerCase().includes("iced")) {
      baseAnswers.push("hot", "warm");
    }
  }

  return baseAnswers;
};

// ✅ 카테고리별 선택지 풀 생성
const createOptionsPool = (
  data: PackData,
  category: string,
  excludeWords: string[] = []
): string[] => {
  const pool = (data.contents || [])
    .filter((c: any) => {
      if (c.type === "vocabulary" && c.category === category) return true;
      if (c.type === "sentence" && c.category === category && c.targetWords) {
        return c.targetWords.some(
          (word: string) =>
            !excludeWords.some((exclude) =>
              word.toLowerCase().includes(exclude.toLowerCase())
            )
        );
      }
      return false;
    })
    .flatMap((c: any) => {
      if (c.type === "vocabulary") return [c.word];
      if (c.type === "sentence") return c.targetWords || [];
      return [];
    })
    .filter(
      (word: string) =>
        word &&
        !excludeWords.some((exclude) =>
          word.toLowerCase().includes(exclude.toLowerCase())
        )
    );

  return [...new Set(pool)]; // 중복 제거
};

// ✅ 동기: 메모리에 로드된 PackData로부터 생성
export function buildWorkbookForDayFromPack(
  data: PackData,
  dayNumber: number,
  optionCount = 4
): WorkbookItem[] {
  const day = data.learningPlan.days.find((d: any) => d.day === dayNumber);
  if (!day) {
    console.warn(`No day ${dayNumber} found in learning plan`);
    return [];
  }

  // ✅ 워크북 전용 contentIds가 있으면 사용, 없으면 문장 데이터에서 생성
  const workbookMode = day.modes?.find((m: any) => m.type === "workbook");
  let targetSentenceIds: string[] = [];

  if (workbookMode?.contentIds?.length > 0) {
    console.log(
      "🔥 Using workbook-specific contentIds:",
      workbookMode.contentIds
    );
    targetSentenceIds = workbookMode.contentIds;
  } else {
    console.log("🔥 No workbook contentIds, generating from sentence data");
    // 해당 일자의 모든 문장 모드에서 contentIds 수집
    targetSentenceIds = (day.modes || []).flatMap((m: any) => {
      if (m.type?.includes("sentence")) return m.contentIds || [];
      return [];
    });
  }

  // ✅ 문장 데이터 필터링
  const sentences = (data.contents || []).filter((c: any) => {
    if (c.type !== "sentence") return false;

    // targetWords가 있는 문장만 선택
    if (
      !c.targetWords ||
      !Array.isArray(c.targetWords) ||
      c.targetWords.length === 0
    ) {
      return false;
    }

    if (targetSentenceIds.length > 0) {
      return targetSentenceIds.includes(c.id);
    }
    return true;
  });

  if (!sentences.length) {
    console.warn("No sentences with targetWords found for workbook generation");
    return [];
  }

  console.log(`🔥 Found ${sentences.length} sentences for workbook generation`);

  // ✅ 각 문장의 targetWords별로 워크북 아이템 생성
  const workbookItems: WorkbookItem[] = [];

  sentences.forEach((sentence: any, sentenceIndex: number) => {
    sentence.targetWords.forEach((targetWord: string, wordIndex: number) => {
      const questionText = createBlankFromTargetWord(sentence.text, targetWord);

      // 빈칸이 생성되지 않은 경우 건너뛰기
      if (questionText === sentence.text) {
        console.warn(
          `🔥 Could not create blank for "${targetWord}" in "${sentence.text}"`
        );
        return;
      }

      // 선택지 풀 생성 (현재 targetWord 제외)
      const optionsPool = createOptionsPool(data, sentence.category, [
        targetWord,
      ]);

      // 정답 가능한 답안들
      const acceptableAnswers = getAcceptableAnswers(
        targetWord,
        sentence.category
      );

      const workbookItem: WorkbookItem = {
        id: `wb-${sentence.id}-${wordIndex}`,
        sentence: sentence.text,
        question: questionText,
        blank: questionText,
        options: [], // 아래에서 생성
        answer: targetWord,
        correctAnswer: targetWord,
        explanation: sentence.translation || "",
        correctAnswers: acceptableAnswers,
        evaluation: { mode: "single" },
        tags: [
          `#${sentence.category}`,
          `#${targetWord.replace(/\s+/g, "-").toLowerCase()}`,
        ],
        targetWord: targetWord, // 디버깅용
        category: sentence.category,
      };

      // ✅ 선택지 생성
      const distractors = optionsPool
        .filter(
          (option) =>
            !acceptableAnswers.some(
              (correct) => correct.toLowerCase() === option.toLowerCase()
            )
        )
        .sort(() => Math.random() - 0.5)
        .slice(0, optionCount - 1);

      // 부족한 선택지는 기본값으로 채우기
      const defaultOptions = [
        "get to",
        "look for",
        "go straight",
        "turn right",
        "excuse me",
        "I'd like",
      ];
      while (distractors.length < optionCount - 1) {
        const defaultOption =
          defaultOptions[distractors.length % defaultOptions.length];
        if (
          !distractors.includes(defaultOption) &&
          !acceptableAnswers.some(
            (correct) => correct.toLowerCase() === defaultOption.toLowerCase()
          )
        ) {
          distractors.push(defaultOption);
        } else {
          distractors.push(`option-${distractors.length + 1}`);
        }
      }

      // 정답과 오답을 섞어서 최종 선택지 생성
      workbookItem.options = [targetWord, ...distractors].sort(
        () => Math.random() - 0.5
      );

      workbookItems.push(workbookItem);

      // console.log(`🔥 Created workbook item:`, {
      //   id: workbookItem.id,
      //   question: questionText,
      //   targetWord: targetWord,
      //   options: workbookItem.options,
      //   acceptableAnswers: acceptableAnswers,
      // });
    });
  });

  return workbookItems.slice(0, 12); // 최대 12개로 제한
}

// ✅ 비동기 Proxy: packId로 로드 → FromPack 호출
export async function buildWorkbookForDay(
  packId: string,
  dayNumber: number,
  optionCount = 4
): Promise<WorkbookItem[]> {
  try {
    const data = await packDataService.loadPackData(packId);
    return buildWorkbookForDayFromPack(data, dayNumber, optionCount);
  } catch (error) {
    console.error("Failed to build workbook for day:", error);
    return [];
  }
}
