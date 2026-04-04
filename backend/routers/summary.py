# ============================================================
# routers/summary.py — GET /summary/{pdf_id}
# ============================================================

from fastapi import APIRouter, HTTPException
from schemas import SummaryResponse
from services.rag import generate_summary
from storage import get_summary_cache, save_summary_cache

router = APIRouter()


@router.get("/summary/{pdf_id}", response_model=SummaryResponse)
async def get_summary(pdf_id: str, refresh: bool = False):

    if not pdf_id:
        raise HTTPException(status_code=400, detail="pdf_id is required.")

    # Return cached summary unless refresh=true
    if not refresh:
        cached = get_summary_cache(pdf_id)
        if cached:
            return SummaryResponse(pdf_id=pdf_id, summary=cached)

    points = generate_summary(pdf_id)
    save_summary_cache(pdf_id, points)

    return SummaryResponse(pdf_id=pdf_id, summary=points)
