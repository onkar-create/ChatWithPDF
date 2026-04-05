# ============================================================
# database/connection.py — MySQL connection pool
# ============================================================

import os
import mysql.connector
from mysql.connector import pooling

_pool = None

def get_pool():
    global _pool
    if _pool is None:
        _pool = pooling.MySQLConnectionPool(
            pool_name="chatwithpdf",
            pool_size=5,
            host=os.getenv("MYSQLHOST", os.getenv("DB_HOST", "localhost")),
            port=int(os.getenv("MYSQLPORT", os.getenv("DB_PORT", 3306))),
            user=os.getenv("MYSQLUSER", os.getenv("DB_USER", "root")),
            password=os.getenv("MYSQLPASSWORD", os.getenv("DB_PASSWORD", "")),
            database=os.getenv("MYSQLDATABASE", os.getenv("DB_NAME", "chatwithpdf")),
        )
    return _pool


def get_db():
    """Get a connection from the pool."""
    return get_pool().get_connection()
