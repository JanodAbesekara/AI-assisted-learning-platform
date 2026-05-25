from app.rag.embeddings import embed_query
from app.rag.vector_store import FaissVectorStore
from app.utils.config import get_settings


def retrieve_context(
    user_email: str,
    query: str,
    pdf_ids: list[int] | None = None,
    top_k: int | None = None,
) -> tuple[str, list[dict]]:
    settings = get_settings()
    k = top_k or settings.top_k_chunks
    store = FaissVectorStore(user_email)
    query_vec = embed_query(query)
    hits = store.search(query_vec, top_k=k, pdf_ids=pdf_ids)
    if not hits:
        return "", []
    context_parts = []
    for i, hit in enumerate(hits, 1):
        context_parts.append(
            f"[Source {i}: {hit['filename']}]\n{hit['text']}"
        )
    return "\n\n---\n\n".join(context_parts), hits
