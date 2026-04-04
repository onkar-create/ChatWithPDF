# ============================================================
# main.py — FastAPI entry point
# ============================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routers import upload, chat, summary, notes, auth
from database.setup import create_tables

# Load .env
load_dotenv()

# Create MySQL tables if they don't exist
create_tables()

app = FastAPI(
    title="ChatWithPDF API",
    description="AI-powered PDF question answering backend using RAG + LangChain + ChromaDB",
    version="1.0.0",
)

# CORS — allow requests from the frontend (opened as a local file or localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(upload.router,  tags=["Upload"])
app.include_router(chat.router,    tags=["Chat"])
app.include_router(summary.router, tags=["Summary"])
app.include_router(notes.router,   tags=["Notes"])


@app.get("/")
def root():
    return {"message": "ChatWithPDF API is running."}


@app.get("/health")
def health():
    return {"status": "ok"}
