# ============================================================
# services/rag.py — LangChain RAG pipeline with Ollama + Memory + Vision
# ============================================================

import os
import base64
from typing import List, Dict
from langchain_ollama import ChatOllama
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
import ollama as ollama_client

from services.vector_store import get_retriever, similarity_search

IMAGES_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "images")

VISION_KEYWORDS = {
    "diagram", "image", "figure", "chart", "graph", "picture",
    "illustration", "draw", "visual", "flowchart",
    "screenshot", "photo", "sketch",
}

# ── LLMs ───────────────────────────────────────────────────
def _get_llm() -> ChatOllama:
    return ChatOllama(model="llama3.2:1b", temperature=0.2)


def _is_visual_question(question: str) -> bool:
    q = question.lower()
    return any(kw in q for kw in VISION_KEYWORDS)


def _load_image_b64(path: str) -> str:
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def _answer_with_vision(pdf_id: str, question: str, pages: List[int]) -> str:
    """Uses moondream to answer questions about page images."""
    img_dir = os.path.join(IMAGES_DIR, pdf_id)

    for page in pages:
        img_path = os.path.join(img_dir, f"page_{page}.jpg")
        if os.path.exists(img_path):
            try:
                response = ollama_client.chat(
                    model="moondream",
                    messages=[{
                        "role": "user",
                        "content": (
                            "You are analyzing a PDF page image.\n"
                            "Answer the following question based on what you see.\n"
                            "Be specific about any diagrams, charts, tables, or figures.\n\n"
                            f"Question: {question}"
                        ),
                        "images": [img_path],
                    }]
                )
                return response["message"]["content"].strip()
            except Exception:
                continue

    return None  # fall back to text


# ── Per-PDF conversation history (in-process) ──────────────
_histories: Dict[str, List[Dict]] = {}


def clear_memory(pdf_id: str) -> None:
    if pdf_id in _histories:
        del _histories[pdf_id]


# ── Main RAG function ───────────────────────────────────────
def answer_question(pdf_id: str, question: str) -> Dict:
    # Step 1 — Retrieve via MMR
    retriever = get_retriever(pdf_id, k=6)
    docs      = retriever.invoke(question)

    if not docs:
        return {
            "answer":    "I couldn't find relevant information in the document.",
            "citations": [],
        }

    context = "\n\n".join(
        f"[Page {d.metadata.get('page', 0)}]: {d.page_content}" for d in docs
    )

    # Step 2 — Build message list with history
    history  = _histories.get(pdf_id, [])
    messages = [
        SystemMessage(content=(
            "You are an AI assistant answering questions about a PDF document.\n"
            "Use the context below to answer the question as accurately and specifically as possible.\n"
            "Include exact details like names, numbers, code snippets, and values mentioned in the context.\n"
            "If the context does not contain the answer, say: "
            "\"I couldn't find that information in the document.\"\n"
            "Be concise and direct.\n\n"
            f"Context:\n{context}"
        ))
    ]

    for msg in history[-10:]:
        if msg["role"] == "user":
            messages.append(HumanMessage(content=msg["content"]))
        else:
            messages.append(AIMessage(content=msg["content"]))

    messages.append(HumanMessage(content=question))

    # Step 3 — Use moondream for visual questions, llama3.2:1b for text
    retrieved_pages = list({d.metadata.get("page", 0) for d in docs})
    if _is_visual_question(question):
        vision_answer = _answer_with_vision(pdf_id, question, retrieved_pages)
        if vision_answer:
            answer = vision_answer
        else:
            answer = _get_llm().invoke(messages).content.strip()
    else:
        answer = _get_llm().invoke(messages).content.strip()

    # Step 4 — Save to memory
    if pdf_id not in _histories:
        _histories[pdf_id] = []
    _histories[pdf_id].append({"role": "user",     "content": question})
    _histories[pdf_id].append({"role": "assistant", "content": answer})

    # Step 5 — Build citations
    seen_pages = set()
    citations  = []
    for doc in docs:
        page = doc.metadata.get("page", 0)
        if page not in seen_pages:
            seen_pages.add(page)
            text = doc.page_content
            citations.append({
                "page": page,
                "text": text[:120] + "..." if len(text) > 120 else text,
            })

    return {"answer": answer, "citations": citations}


# ── Summary ─────────────────────────────────────────────────
def generate_summary(pdf_id: str) -> List[str]:
    chunks = similarity_search(pdf_id, "main topic overview introduction conclusion", k=8)

    if not chunks:
        return ["Could not generate a summary — no content found in the document."]

    combined_text = "\n\n".join(c["text"] for c in chunks)
    llm = _get_llm()
    messages = [
        SystemMessage(content=(
            "You are a document summarizer.\n"
            "Summarize the following text into exactly 5-6 concise bullet points.\n"
            "Each bullet point should capture a distinct key idea.\n"
            "Return ONLY the bullet points, one per line, starting with a dash (-).\n"
            "Do NOT include any intro or outro text."
        )),
        HumanMessage(content=combined_text),
    ]

    response = llm.invoke(messages)
    raw      = response.content.strip()
    lines    = [
        line.strip().lstrip("-•* ").strip()
        for line in raw.split("\n")
        if line.strip()
    ]
    return lines[:6] if lines else ["Summary could not be generated."]
