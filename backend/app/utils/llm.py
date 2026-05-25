import json
import time

from app.utils.config import get_settings

GROUNDED_SYSTEM = (
    "You are a learning assistant. Answer ONLY using the provided context from PDF documents. "
    "If the context does not contain enough information, say you cannot find it in the selected documents. "
    "Do not use outside knowledge. Do not hallucinate."
)


def _call_gemini(prompt: str, json_mode: bool = False) -> str:
    import google.generativeai as genai

    settings = get_settings()
    if not settings.gemini_api_key:
        raise ValueError("GEMINI_API_KEY not configured")
    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel(settings.gemini_model)
    gen_cfg = {"response_mime_type": "application/json"} if json_mode else {}
    for attempt in range(3):
        try:
            response = model.generate_content(prompt, generation_config=gen_cfg)
            return response.text or ""
        except Exception as e:
            if attempt < 2:
                time.sleep(2**attempt)
            else:
                raise ValueError(f"Gemini API failed: {e}") from e
    return ""


def _call_mistral(prompt: str, json_mode: bool = False) -> str:
    from openai import OpenAI

    settings = get_settings()
    if not settings.mistral_api_key:
        raise ValueError("MISTRAL_API_KEY not configured")
    client = OpenAI(
        api_key=settings.mistral_api_key,
        base_url="https://api.mistral.ai/v1",
    )
    kwargs: dict = {
        "model": settings.mistral_model,
        "messages": [{"role": "user", "content": prompt}],
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}
    for attempt in range(3):
        try:
            response = client.chat.completions.create(**kwargs)
            return response.choices[0].message.content or ""
        except Exception as e:
            if attempt < 2:
                time.sleep(2**attempt)
            else:
                raise ValueError(f"Mistral API failed: {e}") from e
    return ""


def generate_text(prompt: str) -> str:
    settings = get_settings()
    errors: list[str] = []
    if settings.gemini_api_key:
        try:
            return _call_gemini(prompt)
        except Exception as e:
            errors.append(f"Gemini: {e}")
    if settings.mistral_api_key:
        try:
            return _call_mistral(prompt)
        except Exception as e:
            errors.append(f"Mistral: {e}")
    raise ValueError(
        "No LLM provider available. "
        + ("; ".join(errors) if errors else "Set GEMINI_API_KEY or MISTRAL_API_KEY")
    )


def generate_json(prompt: str) -> dict:
    settings = get_settings()
    errors: list[str] = []
    raw = ""
    if settings.gemini_api_key:
        try:
            raw = _call_gemini(prompt, json_mode=True)
            return _parse_json(raw)
        except Exception as e:
            errors.append(f"Gemini: {e}")
    if settings.mistral_api_key:
        try:
            raw = _call_mistral(prompt, json_mode=True)
            return _parse_json(raw)
        except Exception as e:
            errors.append(f"Mistral: {e}")
    raise ValueError(
        "No LLM provider available for JSON. "
        + ("; ".join(errors) if errors else "Set GEMINI_API_KEY or MISTRAL_API_KEY")
    )


def _parse_json(raw: str) -> dict:
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        cleaned = raw.replace("```json", "").replace("```", "").strip()
        return json.loads(cleaned)


def build_grounded_prompt(context: str, question: str) -> str:
    return f"""{GROUNDED_SYSTEM}

Answer using ONLY the context below. If the answer is not in the context, say so clearly.

Format your response in a formal, structured style:
1. Start with a concise **Summary** (1-2 sentences).
2. Provide a **Detailed Answer** with clear paragraphs.
3. Use bullet points (- item) for lists when helpful.
4. End with **Key Takeaways** as 2-4 bullet points when applicable.
Do not use markdown headings (#). Use bold labels like **Summary:** on their own line.

Context:
{context}

Question:
{question}
"""
