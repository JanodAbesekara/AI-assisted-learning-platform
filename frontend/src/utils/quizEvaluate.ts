export function normalizeText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export function evaluateAnswer(
  questionType: string,
  correctAnswer: string,
  userAnswer: string
): boolean {
  if (!userAnswer?.trim()) return false;
  if (questionType === "mcq") {
    return normalizeText(userAnswer) === normalizeText(correctAnswer);
  }
  const correct = normalizeText(correctAnswer);
  const given = normalizeText(userAnswer);
  if (correct === given) return true;
  if (correct.includes(given) || given.includes(correct)) return true;
  const correctWords = new Set(correct.split(" "));
  const givenWords = new Set(given.split(" "));
  if (correctWords.size >= 2) {
    let overlap = 0;
    correctWords.forEach((w) => {
      if (givenWords.has(w)) overlap++;
    });
    return overlap / correctWords.size >= 0.7;
  }
  return false;
}

export interface QuestionFeedback {
  correct: boolean;
  user_answer: string;
  correct_answer: string;
  explanation: string;
}
