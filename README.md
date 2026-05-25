# SelfLearn AI — Local Learning Platform

Production-ready local AI learning platform: upload PDFs, RAG chat, quiz generation, and instant grading. Each user has isolated FAISS vector storage keyed by email.

## Tech stack

| Layer | Stack |
|-------|--------|
| Frontend | React 18, Vite, TypeScript, Zustand, Axios |
| Backend | FastAPI, SQLAlchemy (SQLite), JWT |
| Vector DB | FAISS (per-user namespace) |
| Embeddings | `sentence-transformers` (`all-MiniLM-L6-v2`) |
| LLM | Gemini (primary) → Mistral (fallback) |
| PDF | PyMuPDF text extraction |

## Project structure

```
backend/
  app/
    main.py
    auth/          # JWT register, login, /me
    rag/           # PDF load, chunk, embed, FAISS
    chat/          # RAG Q&A service
    quiz/          # Generate + evaluate quizzes
    db/            # SQLAlchemy models
    routes/        # PDF, chat, quiz API routers
    utils/         # config, LLM client
frontend/
  src/             # React pages + stores
```

## Setup

### 1. Backend

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Edit .env: GEMINI_API_KEY, MISTRAL_API_KEY, JWT_SECRET

uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — the Vite dev server proxies API calls to the backend.

## Environment variables

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key (preferred LLM) |
| `MISTRAL_API_KEY` | Mistral API key (fallback) |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `DATABASE_URL` | Default: `sqlite:///./data/app.db` |
| `UPLOAD_DIR` | Local PDF storage (default `./uploads`) |
| `VECTOR_STORE_DIR` | FAISS indexes at `./vector_store/{email}/index.faiss` |

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Get JWT |
| GET | `/auth/me` | Current user (auth required) |
| POST | `/pdf/upload` | Upload + index PDF |
| GET | `/pdf/list` | List user PDFs |
| POST | `/pdf/select` | Validate PDF selection |
| POST | `/chat/message` | RAG chat |
| POST | `/quiz/generate` | Generate MCQ + short questions |
| POST | `/quiz/submit` | Grade answers |

All routes except `/auth/register`, `/auth/login`, and `/health` require `Authorization: Bearer <token>`.

## User isolation

- SQLite records scoped by `user_id`
- Uploads: `uploads/{safe_email}/`
- FAISS: `vector_store/{safe_email}/index.faiss` + `metadata.json`

## Security

- PDF-only uploads, size limit (default 25MB)
- Passwords hashed with bcrypt
- JWT on all protected routes
- RAG/quiz prompts enforce context-only answers

## First run

1. Register at `/register`
2. Upload PDFs on **Upload PDFs**
3. Select PDFs in the sidebar
4. Use **Chat** or **Quiz**
