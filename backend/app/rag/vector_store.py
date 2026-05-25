import json
import re
from pathlib import Path

import faiss
import numpy as np

from app.rag.embeddings import embed_texts
from app.utils.config import get_settings


def _safe_email_namespace(email: str) -> str:
    return re.sub(r"[^a-zA-Z0-9._-]", "_", email.lower())


class FaissVectorStore:
    def __init__(self, user_email: str):
        settings = get_settings()
        namespace = _safe_email_namespace(user_email)
        self.user_dir = Path(settings.vector_store_dir) / namespace
        self.user_dir.mkdir(parents=True, exist_ok=True)
        self.index_path = self.user_dir / "index.faiss"
        self.meta_path = self.user_dir / "metadata.json"
        self._index: faiss.IndexFlatIP | None = None
        self._metadata: list[dict] = []
        self._dim: int | None = None
        self._load()

    def _load(self) -> None:
        if self.index_path.exists() and self.meta_path.exists():
            self._index = faiss.read_index(str(self.index_path))
            self._dim = self._index.d
            with open(self.meta_path, encoding="utf-8") as f:
                self._metadata = json.load(f)
        else:
            self._index = None
            self._metadata = []

    def _persist(self) -> None:
        if self._index is None:
            return
        faiss.write_index(self._index, str(self.index_path))
        with open(self.meta_path, "w", encoding="utf-8") as f:
            json.dump(self._metadata, f, ensure_ascii=False, indent=2)

    def add_chunks(
        self,
        pdf_id: int,
        filename: str,
        chunks: list[str],
    ) -> int:
        if not chunks:
            return 0
        vectors = np.array(embed_texts(chunks), dtype=np.float32)
        dim = vectors.shape[1]

        if self._index is None:
            self._index = faiss.IndexFlatIP(dim)
            self._dim = dim
        elif self._dim != dim:
            raise ValueError("Embedding dimension mismatch")

        self._index.add(vectors)
        start_idx = len(self._metadata)
        for i, chunk in enumerate(chunks):
            self._metadata.append(
                {
                    "faiss_id": start_idx + i,
                    "pdf_id": pdf_id,
                    "filename": filename,
                    "text": chunk,
                }
            )
        self._persist()
        return len(chunks)

    def remove_pdf(self, pdf_id: int) -> None:
        if not self._metadata:
            return
        kept = [m for m in self._metadata if m["pdf_id"] != pdf_id]
        if len(kept) == len(self._metadata):
            return
        self._rebuild(kept)

    def _rebuild(self, metadata: list[dict]) -> None:
        if not metadata:
            self._index = None
            self._metadata = []
            if self.index_path.exists():
                self.index_path.unlink()
            if self.meta_path.exists():
                self.meta_path.unlink()
            return
        texts = [m["text"] for m in metadata]
        vectors = np.array(embed_texts(texts), dtype=np.float32)
        dim = vectors.shape[1]
        index = faiss.IndexFlatIP(dim)
        index.add(vectors)
        for i, m in enumerate(metadata):
            m["faiss_id"] = i
        self._index = index
        self._dim = dim
        self._metadata = metadata
        self._persist()

    def search(
        self,
        query_vector: list[float],
        top_k: int,
        pdf_ids: list[int] | None = None,
    ) -> list[dict]:
        if self._index is None or self._index.ntotal == 0:
            return []
        q = np.array([query_vector], dtype=np.float32)
        k = min(top_k * 3, self._index.ntotal)
        scores, indices = self._index.search(q, k)
        results: list[dict] = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < 0 or idx >= len(self._metadata):
                continue
            meta = self._metadata[idx]
            if pdf_ids and meta["pdf_id"] not in pdf_ids:
                continue
            results.append({**meta, "score": float(score)})
            if len(results) >= top_k:
                break
        return results
