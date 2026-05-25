from app.rag.retriever import retrieve_context
from app.utils.llm import generate_json

QUIZ_PROMPT = """You are an expert educator. Generate quiz questions using ONLY the provided context from PDFs.
Do NOT use outside knowledge. Do NOT hallucinate facts not present in the context.

Return valid JSON with this exact structure:
{{
  "questions": [
    {{
      "id": "q1",
      "type": "mcq",
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "exact option text",
      "explanation": "why this is correct based on context"
    }},
    {{
      "id": "q2",
      "type": "short",
      "question": "...",
      "correct_answer": "expected short answer",
      "explanation": "..."
    }}
  ]
}}

Requirements:
- Generate exactly {mcq_count} MCQ questions (4 options each) and {short_count} short-answer questions.
- Difficulty level: {difficulty} (easy = recall/definitions, medium = application, hard = analysis/synthesis from context).
- Each question must be answerable from the context only.
- correct_answer for MCQ must match one option exactly.
- Tailor question complexity and distractors to the difficulty level.

Context:
{context}
"""

DIFFICULTY_GUIDE = {
    "easy": "Focus on direct facts, definitions, and simple recall from the text.",
    "medium": "Focus on understanding, comparison, and applying concepts from the text.",
    "hard": "Focus on analysis, inference, and multi-step reasoning strictly from the text.",
}


def generate_quiz(
    user_email: str,
    pdf_ids: list[int],
    mcq_count: int = 5,
    short_count: int = 3,
    difficulty: str = "medium",
    topic_hint: str = "",
) -> dict:
    query = topic_hint or "key concepts definitions facts procedures examples"
    context, _ = retrieve_context(
        user_email=user_email,
        query=query,
        pdf_ids=pdf_ids,
        top_k=12,
    )
    if not context.strip():
        raise ValueError("No indexed content found for selected PDFs")
    level = difficulty.lower()
    if level not in DIFFICULTY_GUIDE:
        level = "medium"
    prompt = QUIZ_PROMPT.format(
        context=context,
        mcq_count=mcq_count,
        short_count=short_count,
        difficulty=f"{level} — {DIFFICULTY_GUIDE[level]}",
    )
    data = generate_json(prompt)
    questions = data.get("questions", [])
    if not questions:
        raise ValueError("LLM returned no questions")
    return {
        "questions": questions,
        "pdf_ids": pdf_ids,
        "difficulty": level,
        "mcq_count": mcq_count,
        "short_count": short_count,
    }
