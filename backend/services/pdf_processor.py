# ============================================================
# services/pdf_processor.py — Extract & chunk PDF text + images
# ============================================================

import os
import fitz  # pymupdf
from langchain_text_splitters import RecursiveCharacterTextSplitter
from typing import List, Dict

IMAGES_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "images")


def extract_text_by_page(filepath: str) -> List[Dict]:
    """
    Returns a list of dicts: { page: int, text: str }
    Uses PyMuPDF (fitz) for accurate text extraction including code blocks.
    """
    doc   = fitz.open(filepath)
    pages = []
    for i, page in enumerate(doc):
        text = page.get_text("text") or ""
        text = text.strip()
        if text:
            pages.append({"page": i + 1, "text": text})
    doc.close()
    return pages


def chunk_pages(pages: List[Dict], chunk_size: int = 1200, chunk_overlap: int = 150) -> List[Dict]:
    """
    Splits each page's text into smaller chunks.
    Returns list of dicts: { page: int, text: str, chunk_index: int }
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ".", " ", ""],
    )

    chunks = []
    for page_data in pages:
        page_chunks = splitter.split_text(page_data["text"])
        for idx, chunk_text in enumerate(page_chunks):
            chunks.append({
                "page":        page_data["page"],
                "text":        chunk_text.strip(),
                "chunk_index": idx,
            })

    return chunks


def extract_page_images(filepath: str, pdf_id: str) -> Dict[int, str]:
    """
    Renders each PDF page as a JPEG image.
    Returns dict: { page_number: image_path }
    """
    out_dir = os.path.join(IMAGES_DIR, pdf_id)
    os.makedirs(out_dir, exist_ok=True)

    doc       = fitz.open(filepath)
    page_imgs = {}

    for i, page in enumerate(doc):
        page_num  = i + 1
        img_path  = os.path.join(out_dir, f"page_{page_num}.jpg")
        mat       = fitz.Matrix(2.0, 2.0)   # 2x zoom for clarity
        pix       = page.get_pixmap(matrix=mat)
        pix.save(img_path)
        page_imgs[page_num] = img_path

    doc.close()
    return page_imgs
