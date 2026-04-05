# ============================================================
# services/rag.py — LangChain RAG pipeline with Groq + Memory
# ============================================================

import os
from typing import List, Dict
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from services.vector_store import get_retriever, similarity_search

# ── LLM ────────────────────────────────────────────────────
def _get_llm() -> ChatGroq:
    return ChatGroq(
        model="llama-3.1-8b-instant",
        api_key=os.getenv("GROQ_API_KEY"),
        temperature=0.2,
    )


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

    # Step 3 — Call Groq LLM
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

    response = _get_llm().invoke(messages)
    raw      = response.content.strip()
    lines    = [
        line.strip().lstrip("-•* ").strip()
        for line in raw.split("\n")
        if line.strip()
    ]
    return lines[:6] if lines else ["Summary could not be generated."]
