# ============================================================
# routers/notes.py — POST /notes  |  GET /notes  |  DELETE /notes/{id}
# ============================================================

import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends

from schemas import NoteCreateRequest, NoteUpdateRequest, NoteResponse
from storage import get_all_notes, save_note, delete_note, update_note
from auth import get_current_user

router = APIRouter()


@router.post("/notes", response_model=NoteResponse)
async def create_note(body: NoteCreateRequest, current_user: dict = Depends(get_current_user)):
    if not body.content.strip():
        raise HTTPException(status_code=400, detail="Note content cannot be empty.")
    if body.source not in ("user", "ai"):
        raise HTTPException(status_code=400, detail="source must be 'user' or 'ai'.")

    note = {
        "note_id":    str(uuid.uuid4()),
        "content":    body.content.strip(),
        "source":     body.source,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "pinned":     False,
        "pdf_id":     body.pdf_id,
        "pdf_name":   body.pdf_name,
    }
    save_note(note, current_user["id"])
    return NoteResponse(**note)


@router.get("/notes", response_model=list[NoteResponse])
async def list_notes(current_user: dict = Depends(get_current_user)):
    return get_all_notes(current_user["id"])


@router.patch("/notes/{note_id}", response_model=NoteResponse)
async def edit_note(note_id: str, body: NoteUpdateRequest):
    if not body.content.strip():
        raise HTTPException(status_code=400, detail="Note content cannot be empty.")
    note = update_note(note_id, {"content": body.content.strip()})
    if not note:
        raise HTTPException(status_code=404, detail="Note not found.")
    return NoteResponse(**note)


@router.patch("/notes/{note_id}/pin", response_model=NoteResponse)
async def toggle_pin(note_id: str):
    from storage import get_note
    note = get_note(note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found.")
    note = update_note(note_id, {"pinned": not note.get("pinned", False)})
    return NoteResponse(**note)


@router.delete("/notes/{note_id}")
async def remove_note(note_id: str):
    success = delete_note(note_id)
    if not success:
        raise HTTPException(status_code=404, detail="Note not found.")
    return {"message": "Note deleted."}
