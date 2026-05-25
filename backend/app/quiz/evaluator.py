import re


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def evaluate_answer(
    question_type: str,
    correct_answer: str,
    user_answer: str,
) -> bool:
    if not user_answer or not user_answer.strip():
        return False
    if question_type == "mcq":
        return _normalize(user_answer) == _normalize(correct_answer)
    correct = _normalize(correct_answer)
    given = _normalize(user_answer)
    if correct == given:
        return True
    if correct in given or given in correct:
        return True
    correct_words = set(correct.split())
    given_words = set(given.split())
    if len(correct_words) >= 2:
        overlap = len(correct_words & given_words) / len(correct_words)
        return overlap >= 0.7
    return False


def evaluate_quiz_submission(questions: list[dict], answers: list[dict]) -> dict:
    answer_map = {a["question_id"]: a.get("answer", "") for a in answers}
    results = []
    correct_count = 0
    for q in questions:
        qid = q.get("id", "")
        user_ans = answer_map.get(qid, "")
        is_correct = evaluate_answer(
            q.get("type", "mcq"),
            q.get("correct_answer", ""),
            user_ans,
        )
        if is_correct:
            correct_count += 1
        results.append(
            {
                "question_id": qid,
                "correct": is_correct,
                "user_answer": user_ans,
                "correct_answer": q.get("correct_answer"),
                "explanation": q.get("explanation", ""),
            }
        )
    total = len(questions)
    score = round((correct_count / total) * 100, 1) if total else 0
    return {
        "score": score,
        "correct_count": correct_count,
        "total": total,
        "results": results,
    }
