# ============================================================
# schemas.py — Pydantic request / response models
# ============================================================

from pydantic import BaseModel
from typing import List, Optional


# ---------- Upload ----------
class UploadResponse(BaseModel):
    pdf_id: str
    file_name: str
    page_count: int = 0
    message: str


# ---------- Chat ----------
class ChatRequest(BaseModel):
    pdf_id: str
    question: str


class Citation(BaseModel):
    page: int
    text: str


class ChatResponse(BaseModel):
    answer: str
    citations: List[Citation]
    timestamp: str


class ChatMessage(BaseModel):
    question: str
    answer: str
    timestamp: str


class ChatHistoryResponse(BaseModel):
    pdf_id: str
    messages: List[ChatMessage]


# ---------- Summary ----------
class SummaryResponse(BaseModel):
    pdf_id: str
    summary: List[str]


# ---------- Notes ----------
class NoteCreateRequest(BaseModel):
    content: str
    source: str = "user"   # "user" or "ai"
    pdf_id: Optional[str] = None
    pdf_name: Optional[str] = None


class NoteUpdateRequest(BaseModel):
    content: str


class RenamePdfRequest(BaseModel):
    file_name: str


class NoteResponse(BaseModel):
    note_id: str
    content: str
    source: str
    created_at: str
    pinned: bool = False
    pdf_id: Optional[str] = None
    pdf_name: Optional[str] = None


class NotesListResponse(BaseModel):
    notes: List[NoteResponse]
