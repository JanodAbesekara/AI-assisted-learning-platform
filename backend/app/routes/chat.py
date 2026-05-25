from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.chat.service import chat_with_documents
from app.db.models import ChatMessage, PdfDocument, User, get_db

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    pdf_ids: list[int] = Field(default_factory=list)


class ChatResponse(BaseModel):
    answer: str
    sources: list[dict]


@router.post("/message", response_model=ChatResponse)
def send_message(
    body: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not body.pdf_ids:
        raise HTTPException(status_code=400, detail="Select at least one PDF")
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

    result = chat_with_documents(
        user_email=current_user.email,
        message=body.message,
        pdf_ids=body.pdf_ids,
    )

    pdf_ids_str = ",".join(str(i) for i in body.pdf_ids)
    db.add(
        ChatMessage(
            user_id=current_user.id,
            role="user",
            content=body.message,
            pdf_ids=pdf_ids_str,
        )
    )
    db.add(
        ChatMessage(
            user_id=current_user.id,
            role="assistant",
            content=result["answer"],
            pdf_ids=pdf_ids_str,
        )
    )
    db.commit()

    return ChatResponse(answer=result["answer"], sources=result["sources"])
