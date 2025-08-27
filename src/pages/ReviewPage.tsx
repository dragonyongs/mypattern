import React, { useState, useMemo } from "react";
import { Check, X } from "lucide-react";
import { useAppSelector, useAppDispatch } from "@/providers/AppProvider";
import { updateSentenceStatus } from "@/shared/lib/schedule";

export function ReviewPage() {
  const dispatch = useAppDispatch();
  const sentences = useAppSelector((state) => state.sentences);
  const settings = useAppSelector((state) => state.settings);

  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [reviewAnswer, setReviewAnswer] = useState("");
  const [showKorean, setShowKorean] = useState(false);

  const dailyQueue = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return sentences.filter((s) => s.nextDue <= today);
  }, [sentences]);

  const handleReviewSubmit = (isCorrect: boolean) => {
    const currentSentence = dailyQueue[currentReviewIndex];

    const updatedSentence = updateSentenceStatus(
      currentSentence,
      isCorrect,
      settings.reviewInterval
    );

    dispatch({
      type: "UPDATE_SENTENCE",
      payload: updatedSentence,
    });

    if (currentReviewIndex < dailyQueue.length - 1) {
      setCurrentReviewIndex((prev) => prev + 1);
    } else {
      setCurrentReviewIndex(0);
    }

    setReviewAnswer("");
    setShowKorean(false);
  };

  if (dailyQueue.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">🎉</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          오늘 복습 완료!
        </h2>
        <p className="text-gray-600">내일 새로운 문장들이 준비됩니다.</p>
      </div>
    );
  }

  const currentSentence = dailyQueue[currentReviewIndex];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">복습</h2>
        <div className="text-sm text-gray-500">
          {currentReviewIndex + 1} / {dailyQueue.length}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="mb-6">
          <div className="text-lg text-gray-800 mb-2">
            {currentSentence.korean}
          </div>
          {!settings.hideL1 || showKorean ? (
            <div className="text-sm text-gray-500">힌트 표시됨</div>
          ) : (
            <button
              onClick={() => setShowKorean(true)}
              className="text-sm text-blue-500 hover:text-blue-700"
            >
              힌트 보기
            </button>
          )}
        </div>

        <div className="mb-4">
          <input
            type="text"
            value={reviewAnswer}
            onChange={(e) => setReviewAnswer(e.target.value)}
            placeholder="영어로 말해보세요..."
            className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {reviewAnswer && (
          <div className="border-t pt-4">
            <div className="text-sm text-gray-600 mb-3">
              정답: {currentSentence.english}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => handleReviewSubmit(true)}
                className="flex items-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
              >
                <Check className="h-4 w-4 mr-2" />
                맞음
              </button>
              <button
                onClick={() => handleReviewSubmit(false)}
                className="flex items-center px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                <X className="h-4 w-4 mr-2" />
                틀림
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
