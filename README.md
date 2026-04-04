# ChatWithPDF 📄🤖

An AI-powered PDF Question & Answer system that runs **fully offline** on your local machine. Upload any PDF and have a conversation with it — no API keys, no internet required, no data sent to third parties.

---

## Features

- **Upload & Chat** — Upload any PDF and ask questions in natural language
- **RAG Pipeline** — Retrieval-Augmented Generation for accurate, context-aware answers
- **Page Citations** — Every answer shows which page the information came from
- **Image Reading** — Understands diagrams, charts, and figures using moondream vision model
- **Chat History** — All conversations saved and restored per PDF
- **AI Summary** — Auto-generates a 5-6 bullet point summary of any PDF
- **Notes** — Save, pin, edit, and search notes linked to specific PDFs
- **User Authentication** — Register/login with JWT tokens
- **Per-user isolation** — Each user sees only their own PDFs and notes
- **Export** — Export chat history and notes as text files
- **100% Local & Private** — All AI runs on your machine via Ollama

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript, Three.js, GSAP |
| Backend | Python, FastAPI |
| AI (Text) | Ollama — llama3.2:1b |
| AI (Vision) | Ollama — moondream |
| Embeddings | sentence-transformers (all-MiniLM-L6-v2) |
| Vector DB | ChromaDB |
| Database | MySQL |
| PDF Processing | PyMuPDF (fitz) |
| Auth | JWT (python-jose) |

---

## Project Structure

```
ChatWithPDF/
├── frontend/
│   ├── index.html        # Landing page
│   ├── auth.html         # Login / Register
│   ├── pdf.html          # Main app
│   ├── pdf.js            # Frontend logic
│   └── pdf.css           # Styles
├── backend/
│   ├── main.py           # FastAPI entry point
│   ├── auth.py           # JWT authentication
│   ├── storage.py        # MySQL data layer
│   ├── schemas.py        # Pydantic models
│   ├── routers/
│   │   ├── upload.py     # PDF upload/delete
│   │   ├── chat.py       # Chat Q&A
│   │   ├── summary.py    # PDF summary
│   │   ├── notes.py      # Notes CRUD
│   │   └── auth.py       # Login/register
│   ├── services/
│   │   ├── rag.py        # RAG pipeline
│   │   ├── vector_store.py  # ChromaDB
│   │   └── pdf_processor.py # Text extraction
│   └── database/
│       ├── connection.py # MySQL connection
│       └── setup.py      # Table creation
└── Start ChatWithPDF.bat # One-click server start
```

---

## Setup & Installation

### Prerequisites
- Python 3.10+
- MySQL Server
- Ollama (https://ollama.com)

### 1. Install Python dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Install Ollama models
```bash
ollama pull llama3.2:1b
ollama pull moondream
```

### 3. Setup MySQL
```sql
CREATE DATABASE chatwithpdf;
```

### 4. Configure environment
Create `backend/.env`:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=chatwithpdf
SECRET_KEY=your_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

### 5. Run the server
```bash
cd backend
python -m uvicorn main:app --reload
```

Or double-click **Start ChatWithPDF.bat**

### 6. Open the app
Open `frontend/index.html` in your browser.

---

## How It Works

```
User uploads PDF
      ↓
PyMuPDF extracts text page by page
      ↓
Text split into chunks (1200 chars each)
      ↓
sentence-transformers converts chunks to vectors
      ↓
Vectors stored in ChromaDB

User asks a question
      ↓
Question converted to vector
      ↓
ChromaDB finds top 6 most relevant chunks (MMR)
      ↓
Chunks + question sent to llama3.2:1b
      ↓
LLM generates answer with page citations
```

---

## Made By

**Onkar Gajulwar**
2nd Year Computer Science Student
K J Somaiya Institute of Technology, Mumbai
