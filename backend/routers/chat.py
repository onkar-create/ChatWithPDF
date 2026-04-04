# ============================================================
# routers/chat.py — POST /chat  |  GET /chat/{id}  |  DELETE /chat/{id}
# ============================================================

from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException

from schemas import ChatRequest, ChatResponse, ChatHistoryResponse
from services.rag import answer_question, clear_memory
from storage import get_chat_history, append_chat_message, clear_chat_history

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def ask_question(body: ChatRequest):

    if not body.pdf_id:
        raise HTTPException(status_code=400, detail="pdf_id is required.")
    if not body.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    # Run RAG pipeline
    try:
        result = answer_question(body.pdf_id, body.question.strip())
    except Exception as e:
        err = str(e).lower()
        if "connection refused" in err or "404" in err or "not found" in err:
            raise HTTPException(status_code=503, detail="AI model is not running. Please start Ollama and try again.")
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")

    timestamp = datetime.now(timezone.utc).isoformat()

    # Persist to chat history
    append_chat_message(body.pdf_id, {
        "question":  body.question.strip(),
        "answer":    result["answer"],
        "timestamp": timestamp,
    })

    return ChatResponse(
        answer=result["answer"],
        citations=result["citations"],
        timestamp=timestamp,
    )


@router.get("/chat/{pdf_id}", response_model=ChatHistoryResponse)
async def get_history(pdf_id: str):
    messages = get_chat_history(pdf_id)
    return ChatHistoryResponse(pdf_id=pdf_id, messages=messages)


@router.delete("/chat/{pdf_id}")
async def clear_chat(pdf_id: str):
    clear_chat_history(pdf_id)
    clear_memory(pdf_id)
    return {"message": f"Chat history cleared for PDF {pdf_id}."}
