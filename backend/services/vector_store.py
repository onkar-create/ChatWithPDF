# ============================================================
# services/vector_store.py — ChromaDB vector storage
# ============================================================

import os
from typing import List, Dict
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.documents import Document

# ChromaDB persists to disk in /backend/chroma_db/
CHROMA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "chroma_db")

# Local embeddings model — downloads once (~90MB), runs offline after that
def _get_embeddings() -> HuggingFaceEmbeddings:
    return HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")


def _get_collection_name(pdf_id: str) -> str:
    # ChromaDB collection name must be alphanumeric + underscores
    return f"pdf_{pdf_id.replace('-', '_')}"


def store_chunks(pdf_id: str, chunks: List[Dict]) -> None:
    """
    Embeds each chunk and stores in ChromaDB.
    Each chunk: { page: int, text: str, chunk_index: int }
    """
    documents = [
        Document(
            page_content=chunk["text"],
            metadata={
                "page":        chunk["page"],
                "chunk_index": chunk["chunk_index"],
                "pdf_id":      pdf_id,
            },
        )
        for chunk in chunks
    ]

    Chroma.from_documents(
        documents=documents,
        embedding=_get_embeddings(),
        collection_name=_get_collection_name(pdf_id),
        persist_directory=CHROMA_DIR,
    )


def similarity_search(pdf_id: str, query: str, k: int = 4) -> List[Dict]:
    """
    Finds the top-k most relevant chunks for the given query.
    Returns list of { page: int, text: str }
    """
    vectordb = Chroma(
        collection_name=_get_collection_name(pdf_id),
        embedding_function=_get_embeddings(),
        persist_directory=CHROMA_DIR,
    )

    results = vectordb.similarity_search(query, k=k)

    return [
        {
            "page": doc.metadata.get("page", 0),
            "text": doc.page_content,
        }
        for doc in results
    ]


def get_retriever(pdf_id: str, k: int = 4):
    """
    Returns a LangChain retriever using MMR (Maximum Marginal Relevance)
    for diverse, high-quality chunk selection.
    """
    vectordb = Chroma(
        collection_name=_get_collection_name(pdf_id),
        embedding_function=_get_embeddings(),
        persist_directory=CHROMA_DIR,
    )
    return vectordb.as_retriever(
        search_type="mmr",
        search_kwargs={"k": k, "fetch_k": max(k * 3, 20)},
    )


def delete_collection(pdf_id: str) -> None:
    """Removes a PDF's vector collection from ChromaDB."""
    vectordb = Chroma(
        collection_name=_get_collection_name(pdf_id),
        embedding_function=_get_embeddings(),
        persist_directory=CHROMA_DIR,
    )
    vectordb.delete_collection()
