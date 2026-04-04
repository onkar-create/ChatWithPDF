# ============================================================
# storage.py — MySQL-backed persistence (replaces JSON files)
# ============================================================

import json
from database.connection import get_db


# -------- PDF List --------

def get_all_pdfs(user_id: int) -> list:
    conn = get_db()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        "SELECT pdf_id, file_name, page_count FROM pdfs WHERE user_id = %s ORDER BY uploaded_at DESC",
        (user_id,)
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    return rows


def save_pdf(pdf_id: str, file_name: str, user_id: int, page_count: int = 0) -> None:
    conn = get_db()
    cur  = conn.cursor()
    cur.execute(
        "INSERT INTO pdfs (pdf_id, user_id, file_name, page_count) VALUES (%s, %s, %s, %s)",
        (pdf_id, user_id, file_name, page_count)
    )
    conn.commit()
    cur.close(); conn.close()


def delete_pdf_record(pdf_id: str) -> None:
    conn = get_db()
    cur  = conn.cursor()
    cur.execute("DELETE FROM pdfs WHERE pdf_id = %s", (pdf_id,))
    conn.commit()
    cur.close(); conn.close()


# -------- Chat History --------

def get_chat_history(pdf_id: str) -> list:
    conn = get_db()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        "SELECT question, answer, timestamp FROM chat_history WHERE pdf_id = %s ORDER BY id ASC",
        (pdf_id,)
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    return rows


def append_chat_message(pdf_id: str, message: dict) -> None:
    conn = get_db()
    cur  = conn.cursor()
    cur.execute(
        "INSERT INTO chat_history (pdf_id, question, answer, timestamp) VALUES (%s, %s, %s, %s)",
        (pdf_id, message["question"], message["answer"], message.get("timestamp", ""))
    )
    conn.commit()
    cur.close(); conn.close()


def clear_chat_history(pdf_id: str) -> None:
    conn = get_db()
    cur  = conn.cursor()
    cur.execute("DELETE FROM chat_history WHERE pdf_id = %s", (pdf_id,))
    conn.commit()
    cur.close(); conn.close()


# -------- Notes --------

def get_all_notes(user_id: int) -> list:
    conn = get_db()
    cur  = conn.cursor(dictionary=True)
    cur.execute(
        "SELECT * FROM notes WHERE user_id = %s ORDER BY pinned DESC, created_at DESC",
        (user_id,)
    )
    rows = cur.fetchall()
    cur.close(); conn.close()
    for row in rows:
        row["pinned"] = bool(row["pinned"])
    return rows


def get_note(note_id: str) -> dict:
    conn = get_db()
    cur  = conn.cursor(dictionary=True)
    cur.execute("SELECT * FROM notes WHERE note_id = %s", (note_id,))
    row = cur.fetchone()
    cur.close(); conn.close()
    if row:
        row["pinned"] = bool(row["pinned"])
    return row


def save_note(note: dict, user_id: int) -> None:
    conn = get_db()
    cur  = conn.cursor()
    cur.execute(
        """INSERT INTO notes
           (note_id, user_id, content, source, pinned, pdf_id, pdf_name, created_at)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
        (
            note["note_id"], user_id, note["content"], note["source"],
            note.get("pinned", False), note.get("pdf_id"),
            note.get("pdf_name"), note.get("created_at", ""),
        )
    )
    conn.commit()
    cur.close(); conn.close()


def update_note(note_id: str, fields: dict) -> dict:
    ALLOWED = {"content", "pinned"}
    conn = get_db()
    cur  = conn.cursor()
    for key, value in fields.items():
        if key not in ALLOWED:
            continue
        cur.execute(f"UPDATE notes SET `{key}` = %s WHERE note_id = %s", (value, note_id))
    conn.commit()
    cur.close(); conn.close()
    return get_note(note_id)


def delete_note(note_id: str) -> bool:
    conn = get_db()
    cur  = conn.cursor()
    cur.execute("DELETE FROM notes WHERE note_id = %s", (note_id,))
    affected = cur.rowcount
    conn.commit()
    cur.close(); conn.close()
    return affected > 0


# -------- Summary Cache --------

def get_summary_cache(pdf_id: str):
    conn = get_db()
    cur  = conn.cursor(dictionary=True)
    cur.execute("SELECT summary_json FROM summary_cache WHERE pdf_id = %s", (pdf_id,))
    row = cur.fetchone()
    cur.close(); conn.close()
    return json.loads(row["summary_json"]) if row else None


def save_summary_cache(pdf_id: str, points: list) -> None:
    conn = get_db()
    cur  = conn.cursor()
    cur.execute(
        """INSERT INTO summary_cache (pdf_id, summary_json)
           VALUES (%s, %s)
           ON DUPLICATE KEY UPDATE summary_json = %s""",
        (pdf_id, json.dumps(points), json.dumps(points))
    )
    conn.commit()
    cur.close(); conn.close()


def delete_summary_cache(pdf_id: str) -> None:
    conn = get_db()
    cur  = conn.cursor()
    cur.execute("DELETE FROM summary_cache WHERE pdf_id = %s", (pdf_id,))
    conn.commit()
    cur.close(); conn.close()
