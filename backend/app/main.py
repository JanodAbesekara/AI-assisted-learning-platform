from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.routes import router as auth_router
from app.db.models import init_db
from app.routes.chat import router as chat_router
from app.routes.pdf import router as pdf_router
from app.routes.quiz import router as quiz_router
from app.utils.config import get_settings


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    get_settings().ensure_dirs()
    yield


app = FastAPI(
    title="SelfLearn AI Platform",
    description="Local AI learning platform with RAG, quizzes, and JWT auth",
    version="1.0.0",
    lifespan=lifespan,
)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(pdf_router)
app.include_router(chat_router)
app.include_router(quiz_router)


@app.get("/health")
def health():
    return {"status": "ok"}
