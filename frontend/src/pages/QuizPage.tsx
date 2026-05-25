import { useMemo, useState } from "react";
import api from "../api/client";
import { usePdfStore } from "../store/pdfStore";
import {
  evaluateAnswer,
  type QuestionFeedback,
} from "../utils/quizEvaluate";

interface Question {
  id: string;
  type: "mcq" | "short";
  question: string;
  options?: string[];
  correct_answer: string;
  explanation: string;
}

type Difficulty = "easy" | "medium" | "hard";

export default function QuizPage() {
  const selectedIds = usePdfStore((s) => s.selectedIds);
  const [mcqCount, setMcqCount] = useState(5);
  const [shortCount, setShortCount] = useState(3);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, QuestionFeedback>>({});
  const [quizFinished, setQuizFinished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const answeredCount = Object.keys(feedback).length;
  const correctCount = Object.values(feedback).filter((f) => f.correct).length;
  const liveScore =
    answeredCount > 0
      ? Math.round((correctCount / answeredCount) * 1000) / 10
      : null;
  const finalScore =
    questions.length > 0
      ? Math.round((correctCount / questions.length) * 1000) / 10
      : 0;

  const allAnswered = questions.length > 0 && answeredCount === questions.length;

  const generate = async () => {
    if (selectedIds.length === 0) {
      setError("Select at least one PDF in the sidebar");
      return;
    }
    setError("");
    setLoading(true);
    setQuizFinished(false);
    setFeedback({});
    setAnswers({});
    try {
      const { data } = await api.post<{ questions: Question[] }>("/quiz/generate", {
        pdf_ids: selectedIds,
        mcq_count: mcqCount,
        short_count: shortCount,
        difficulty,
      });
      setQuestions(data.questions);
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Quiz generation failed";
      setError(typeof detail === "string" ? detail : "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const revealAnswer = async (q: Question, userAnswer: string) => {
    if (!userAnswer.trim() || feedback[q.id]) return;

    let result: QuestionFeedback;
    try {
      const { data } = await api.post<QuestionFeedback>("/quiz/check", {
        question_type: q.type,
        correct_answer: q.correct_answer,
        user_answer: userAnswer,
        explanation: q.explanation,
      });
      result = data;
    } catch {
      const correct = evaluateAnswer(q.type, q.correct_answer, userAnswer);
      result = {
        correct,
        user_answer: userAnswer,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
      };
    }
    setFeedback((f) => ({ ...f, [q.id]: result }));
  };

  const handleMcqSelect = (q: Question, option: string) => {
    if (feedback[q.id]) return;
    setAnswers((a) => ({ ...a, [q.id]: option }));
    revealAnswer(q, option);
  };

  const handleShortCheck = (q: Question) => {
    const ans = answers[q.id] || "";
    if (!ans.trim()) return;
    revealAnswer(q, ans);
  };

  const finishQuiz = () => {
    setQuizFinished(true);
  };

  const resetQuiz = () => {
    setQuestions([]);
    setAnswers({});
    setFeedback({});
    setQuizFinished(false);
  };

  const difficultyLabel = useMemo(
    () => ({ easy: "Easy", medium: "Medium", hard: "Hard" }[difficulty]),
    [difficulty]
  );

  return (
    <>
      <header className="page-header">
        <h2>Quiz</h2>
        <p className="page-subtitle">
          {selectedIds.length} PDF(s) selected · Configure counts and difficulty below
        </p>
      </header>
      <div className="page-body">
        <div className="card quiz-settings">
          <h3 className="settings-title">Quiz settings</h3>
          <div className="settings-grid">
            <div className="form-group">
              <label htmlFor="mcq-count">MCQ count</label>
              <input
                id="mcq-count"
                type="number"
                min={1}
                max={15}
                value={mcqCount}
                onChange={(e) => setMcqCount(Number(e.target.value))}
                disabled={questions.length > 0 && !quizFinished}
              />
            </div>
            <div className="form-group">
              <label htmlFor="short-count">Short answer count</label>
              <input
                id="short-count"
                type="number"
                min={0}
                max={10}
                value={shortCount}
                onChange={(e) => setShortCount(Number(e.target.value))}
                disabled={questions.length > 0 && !quizFinished}
              />
            </div>
            <div className="form-group">
              <label htmlFor="difficulty">Difficulty</label>
              <select
                id="difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                disabled={questions.length > 0 && !quizFinished}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>
          <div className="quiz-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={generate}
              disabled={loading || (questions.length > 0 && !quizFinished)}
            >
              {loading && !questions.length ? "Generating…" : "Generate Quiz"}
            </button>
            {questions.length > 0 && (
              <button type="button" className="btn btn-ghost" onClick={resetQuiz}>
                New quiz
              </button>
            )}
            {questions.length > 0 && !quizFinished && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={finishQuiz}
                disabled={answeredCount === 0}
              >
                Finish & show score
              </button>
            )}
          </div>
        </div>

        {error && <p className="error-msg quiz-error">{error}</p>}

        {answeredCount > 0 && !quizFinished && liveScore !== null && (
          <div className="live-score-bar">
            <span>
              Progress: {answeredCount}/{questions.length} answered
            </span>
            <span className="live-score-pct">{liveScore}% correct so far</span>
          </div>
        )}

        {quizFinished && (
          <div className="score-banner">
            <p>Final score · {difficultyLabel} difficulty</p>
            <div className="score">{finalScore}%</div>
            <p className="score-detail">
              {correctCount} correct out of {questions.length} questions
            </p>
            <div
              className="score-bar"
              role="progressbar"
              aria-valuenow={finalScore}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="score-bar-fill" style={{ width: `${finalScore}%` }} />
            </div>
          </div>
        )}

        {questions.map((q, idx) => {
          const fb = feedback[q.id];
          const locked = !!fb;
          return (
            <div key={q.id} className="card quiz-question">
              <div className="quiz-q-header">
                <span className="quiz-q-num">Q{idx + 1}</span>
                <span className="quiz-q-badge">
                  {q.type === "mcq" ? "Multiple choice" : "Short answer"}
                </span>
              </div>
              <h4 className="quiz-q-text">{q.question}</h4>

              {q.type === "mcq" && q.options ? (
                <div className="quiz-options">
                  {q.options.map((opt) => {
                    const selected = answers[q.id] === opt;
                    let cls = "quiz-option";
                    if (selected && !fb) cls += " selected";
                    if (fb) {
                      if (opt === q.correct_answer) cls += " correct";
                      else if (selected) cls += " incorrect";
                      else if (!fb.correct && opt !== q.correct_answer) cls += " dimmed";
                    }
                    return (
                      <label key={opt} className={cls}>
                        <input
                          type="radio"
                          name={q.id}
                          checked={selected}
                          disabled={locked}
                          onChange={() => handleMcqSelect(q, opt)}
                        />
                        {opt}
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="short-answer-row">
                  <input
                    type="text"
                    className="short-input"
                    placeholder="Type your answer"
                    value={answers[q.id] || ""}
                    disabled={locked}
                    onChange={(e) =>
                      setAnswers((a) => ({ ...a, [q.id]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleShortCheck(q);
                    }}
                  />
                  {!locked && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => handleShortCheck(q)}
                      disabled={!answers[q.id]?.trim()}
                    >
                      Check
                    </button>
                  )}
                </div>
              )}

              {fb && (
                <div className={`feedback-box ${fb.correct ? "feedback-correct" : "feedback-wrong"}`}>
                  <p className="feedback-status">
                    {fb.correct ? "✓ Correct" : "✗ Incorrect"}
                  </p>
                  {!fb.correct && (
                    <p className="feedback-answer">
                      <strong>Correct answer:</strong> {fb.correct_answer}
                    </p>
                  )}
                  <p className="feedback-explanation">
                    <strong>Explanation:</strong> {fb.explanation}
                  </p>
                </div>
              )}
            </div>
          );
        })}

        {allAnswered && !quizFinished && (
          <div className="card quiz-complete-hint">
            <p>All questions answered. Tap &quot;Finish & show score&quot; for your final percentage.</p>
          </div>
        )}
      </div>
    </>
  );
}
