import re
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.models import PdfDocument, User, get_db
from app.rag.pdf_loader import chunk_text, extract_text_from_pdf
from app.rag.vector_store import FaissVectorStore
from app.utils.config import get_settings

router = APIRouter(prefix="/pdf", tags=["pdf"])


class PdfListItem(BaseModel):
    id: int
    filename: str
    upload_date: datetime
    chunk_count: int
    indexed: bool

    model_config = {"from_attributes": True}


class PdfSelectRequest(BaseModel):
    pdf_ids: list[int]


@router.post("/upload", response_model=PdfListItem)
async def upload_pdf(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    settings = get_settings()
    content = await file.read()
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds {settings.max_upload_mb}MB limit",
        )
    safe_name = re.sub(r"[^a-zA-Z0-9._-]", "_", Path(file.filename).name)
    user_upload_dir = Path(settings.upload_dir) / re.sub(
        r"[^a-zA-Z0-9._-]", "_", current_user.email.lower()
    )
    user_upload_dir.mkdir(parents=True, exist_ok=True)
    stored_name = f"{uuid.uuid4().hex}_{safe_name}"
    stored_path = user_upload_dir / stored_name
    stored_path.write_bytes(content)

    try:
        text = extract_text_from_pdf(stored_path)
        chunks = chunk_text(text)
        if not chunks:
            raise HTTPException(status_code=400, detail="No extractable text in PDF")
    except HTTPException:
        stored_path.unlink(missing_ok=True)
        raise
    except Exception as e:
        stored_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=f"PDF processing failed: {e}") from e

    doc = PdfDocument(
        user_id=current_user.id,
        filename=file.filename,
        stored_path=str(stored_path),
        chunk_count=len(chunks),
        indexed=False,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    store = FaissVectorStore(current_user.email)
    store.add_chunks(doc.id, doc.filename, chunks)
    doc.indexed = True
    db.commit()
    db.refresh(doc)

    return PdfListItem(
        id=doc.id,
        filename=doc.filename,
        upload_date=doc.upload_date,
        chunk_count=doc.chunk_count,
        indexed=doc.indexed,
    )


@router.get("/list", response_model=list[PdfListItem])
def list_pdfs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    docs = (
        db.query(PdfDocument)
        .filter(PdfDocument.user_id == current_user.id)
        .order_by(PdfDocument.upload_date.desc())
        .all()
    )
    return [
        PdfListItem(
            id=d.id,
            filename=d.filename,
            upload_date=d.upload_date,
            chunk_count=d.chunk_count,
            indexed=d.indexed,
        )
        for d in docs
    ]


@router.post("/select")
def select_pdfs(
    body: PdfSelectRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not body.pdf_ids:
        return {"selected": [], "message": "No PDFs selected"}
    docs = (
        db.query(PdfDocument)
        .filter(
            PdfDocument.user_id == current_user.id,
            PdfDocument.id.in_(body.pdf_ids),
        )
        .all()
    )
    found_ids = {d.id for d in docs}
    missing = set(body.pdf_ids) - found_ids
    if missing:
        raise HTTPException(
            status_code=404,
            detail=f"PDFs not found or not owned by user: {sorted(missing)}",
        )
    return {
        "selected": [
            {"id": d.id, "filename": d.filename, "indexed": d.indexed}
            for d in docs
        ]
    }
