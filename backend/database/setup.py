# ============================================================
# database/setup.py — Create all MySQL tables on startup
# ============================================================

from database.connection import get_db


def create_tables():
    conn = get_db()
    cur  = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id            INT AUTO_INCREMENT PRIMARY KEY,
            username      VARCHAR(100) NOT NULL UNIQUE,
            email         VARCHAR(255) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS pdfs (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            pdf_id      VARCHAR(36)  NOT NULL UNIQUE,
            user_id     INT          NOT NULL,
            file_name   VARCHAR(255) NOT NULL,
            page_count  INT          DEFAULT 0,
            uploaded_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS chat_history (
            id        INT AUTO_INCREMENT PRIMARY KEY,
            pdf_id    VARCHAR(36) NOT NULL,
            question  TEXT        NOT NULL,
            answer    TEXT        NOT NULL,
            timestamp VARCHAR(50)
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS notes (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            note_id    VARCHAR(36)  NOT NULL UNIQUE,
            user_id    INT          NOT NULL,
            content    TEXT         NOT NULL,
            source     VARCHAR(10)  DEFAULT 'user',
            pinned     TINYINT(1)   DEFAULT 0,
            pdf_id     VARCHAR(36),
            pdf_name   VARCHAR(255),
            created_at VARCHAR(50),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS summary_cache (
            pdf_id       VARCHAR(36) PRIMARY KEY,
            summary_json TEXT        NOT NULL,
            created_at   DATETIME    DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    cur.close()
    conn.close()
