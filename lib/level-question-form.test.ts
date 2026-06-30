import { describe, expect, it } from "vitest";

import { parseLevelQuestionForm } from "@/lib/level-question-form";
import { QuestionDifficulty } from "@/lib/generated/prisma/enums";

describe("parseLevelQuestionForm", () => {
  it("accepts a valid question", () => {
    const result = parseLevelQuestionForm({
      prompt: " 9 + 4 ",
      correctAnswerRaw: "13",
      category: "Carry",
      difficultyRaw: "EASY",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.prompt).toBe("9 + 4");
      expect(result.data.correctAnswer).toBe(13);
      expect(result.data.difficulty).toBe(QuestionDifficulty.EASY);
    }
  });

  it("rejects non-integer answers", () => {
    const result = parseLevelQuestionForm({
      prompt: "1 + 1",
      correctAnswerRaw: "2.5",
      difficultyRaw: "MEDIUM",
    });
    expect(result.ok).toBe(false);
  });
});
