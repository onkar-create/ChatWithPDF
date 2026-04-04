# ============================================================
# routers/upload.py — POST /upload
# ============================================================

import os
import uuid
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import FileResponse

from schemas import UploadResponse
from services.pdf_processor import extract_text_by_page, chunk_pages, extract_page_images
from services.vector_store import store_chunks, delete_collection
from storage import clear_chat_history, delete_summary_cache, save_pdf, delete_pdf_record, get_all_pdfs
from auth import get_current_user

IMAGES_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "images")

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "uploads")


@router.post("/upload", response_model=UploadResponse)
async def upload_pdf(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):

    # Validate file type
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")

    # Validate file size (max 100MB)
    MAX_SIZE = 100 * 1024 * 1024
    contents = await file.read()
    if len(contents) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds 100MB limit.")

    # Save file to disk
    pdf_id   = str(uuid.uuid4())
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    filepath = os.path.join(UPLOAD_DIR, f"{pdf_id}.pdf")

    with open(filepath, "wb") as f:
        f.write(contents)

    try:
        # Extract text page by page
        pages = extract_text_by_page(filepath)
        if not pages:
            raise HTTPException(status_code=422, detail="This PDF appears to be fully scanned (image-only). No text could be extracted. Try a PDF with selectable text.")

        # Chunk the text
        chunks = chunk_pages(pages)

        # Embed + store in ChromaDB
        store_chunks(pdf_id, chunks)

        # Render each page as image for vision queries
        extract_page_images(filepath, pdf_id)

    except HTTPException:
        raise
    except Exception as e:
        # Clean up file on failure
        if os.path.exists(filepath):
            os.remove(filepath)
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

    save_pdf(pdf_id, file.filename, current_user["id"], len(pages))

    return UploadResponse(
        pdf_id=pdf_id,
        file_name=file.filename,
        page_count=len(pages),
        message="PDF uploaded and processed successfully.",
    )


@router.get("/pdfs")
async def list_pdfs(current_user: dict = Depends(get_current_user)):
    return {"pdfs": get_all_pdfs(current_user["id"])}


@router.get("/pdf/{pdf_id}")
async def serve_pdf(pdf_id: str):
    filepath = os.path.join(UPLOAD_DIR, f"{pdf_id}.pdf")
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="PDF not found.")
    return FileResponse(filepath, media_type="application/pdf")


@router.delete("/pdf/{pdf_id}")
async def delete_pdf(pdf_id: str):
    # Delete PDF file
    filepath = os.path.join(UPLOAD_DIR, f"{pdf_id}.pdf")
    if os.path.exists(filepath):
        os.remove(filepath)

    # Delete page images
    img_dir = os.path.join(IMAGES_DIR, pdf_id)
    if os.path.exists(img_dir):
        shutil.rmtree(img_dir)

    # Delete ChromaDB collection
    try:
        delete_collection(pdf_id)
    except Exception:
        pass

    # Clear chat history, summary cache, and pdf record
    clear_chat_history(pdf_id)
    delete_summary_cache(pdf_id)
    delete_pdf_record(pdf_id)

    return {"message": f"PDF {pdf_id} deleted successfully."}
