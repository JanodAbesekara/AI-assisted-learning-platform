from app.rag.retriever import retrieve_context
from app.utils.llm import build_grounded_prompt, generate_text


def chat_with_documents(
    user_email: str,
    message: str,
    pdf_ids: list[int],
) -> dict:
    context, sources = retrieve_context(
        user_email=user_email,
        query=message,
        pdf_ids=pdf_ids if pdf_ids else None,
    )
    if not context.strip():
        return {
            "answer": (
                "I could not find relevant content in the selected PDFs. "
                "Please upload and index documents, or select different PDFs."
            ),
            "sources": [],
        }
    prompt = build_grounded_prompt(context, message)
    answer = generate_text(prompt)
    return {
        "answer": answer.strip(),
        "sources": [
            {
                "pdf_id": s["pdf_id"],
                "filename": s["filename"],
                "excerpt": s["text"][:300],
                "score": s.get("score"),
            }
            for s in sources
        ],
    }
