from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.models import PdfDocument, User, get_db
from app.quiz.evaluator import evaluate_answer, evaluate_quiz_submission
from app.quiz.generator import generate_quiz

router = APIRouter(prefix="/quiz", tags=["quiz"])

DifficultyLevel = Literal["easy", "medium", "hard"]


class QuizGenerateRequest(BaseModel):
    pdf_ids: list[int] = Field(min_length=1)
    mcq_count: int = Field(default=5, ge=1, le=15)
    short_count: int = Field(default=3, ge=0, le=10)
    difficulty: DifficultyLevel = "medium"
    topic_hint: str = ""


class QuizCheckRequest(BaseModel):
    question_type: str
    correct_answer: str
    user_answer: str
    explanation: str = ""


class QuizAnswerItem(BaseModel):
    question_id: str
    answer: str


class QuizSubmitRequest(BaseModel):
    questions: list[dict]
    answers: list[QuizAnswerItem]


@router.post("/generate")
def create_quiz(
    body: QuizGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    docs = (
        db.query(PdfDocument)
        .filter(
            PdfDocument.user_id == current_user.id,
            PdfDocument.id.in_(body.pdf_ids),
        )
        .all()
    )
    if len(docs) != len(set(body.pdf_ids)):
        raise HTTPException(status_code=404, detail="One or more PDFs not found")
    if not all(d.indexed for d in docs):
        raise HTTPException(status_code=400, detail="Selected PDFs must be indexed")
    try:
        return generate_quiz(
            user_email=current_user.email,
            pdf_ids=body.pdf_ids,
            mcq_count=body.mcq_count,
            short_count=body.short_count,
            difficulty=body.difficulty,
            topic_hint=body.topic_hint,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/check")
def check_single_answer(
    body: QuizCheckRequest,
    current_user: User = Depends(get_current_user),
):
    is_correct = evaluate_answer(
        body.question_type,
        body.correct_answer,
        body.user_answer,
    )
    return {
        "correct": is_correct,
        "correct_answer": body.correct_answer,
        "explanation": body.explanation,
        "user_answer": body.user_answer,
    }


@router.post("/submit")
def submit_quiz(
    body: QuizSubmitRequest,
    current_user: User = Depends(get_current_user),
):
    if not body.questions:
        raise HTTPException(status_code=400, detail="No questions provided")
    answers = [{"question_id": a.question_id, "answer": a.answer} for a in body.answers]
    return evaluate_quiz_submission(body.questions, answers)
