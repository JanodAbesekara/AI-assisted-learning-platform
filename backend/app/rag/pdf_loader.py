import re
from pathlib import Path

import fitz

from app.utils.config import get_settings


def extract_text_from_pdf(file_path: str | Path) -> str:
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"PDF not found: {path}")
    parts: list[str] = []
    with fitz.open(path) as doc:
        for page in doc:
            text = page.get_text("text")
            if text.strip():
                parts.append(text.strip())
    return "\n\n".join(parts)


def _split_by_tokens(text: str, chunk_size: int, overlap: int) -> list[str]:
    """Approximate token chunking using word boundaries (~4 chars per token)."""
    words = re.split(r"\s+", text.strip())
    if not words:
        return []
    approx_words_per_chunk = max(50, chunk_size // 4)
    overlap_words = max(10, overlap // 4)
    chunks: list[str] = []
    start = 0
    while start < len(words):
        end = min(len(words), start + approx_words_per_chunk)
        chunk = " ".join(words[start:end]).strip()
        if chunk:
            chunks.append(chunk)
        if end >= len(words):
            break
        start = max(0, end - overlap_words)
    return chunks


def chunk_text(text: str) -> list[str]:
    settings = get_settings()
    cleaned = re.sub(r"\s+", " ", text).strip()
    if not cleaned:
        return []
    return _split_by_tokens(cleaned, settings.chunk_size, settings.chunk_overlap)
