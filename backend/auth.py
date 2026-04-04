# ============================================================
# auth.py — JWT authentication helpers
# ============================================================

import os
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from database.connection import get_db

SECRET_KEY = os.getenv("SECRET_KEY", "changeme")
ALGORITHM  = os.getenv("ALGORITHM", "HS256")
EXPIRE_MIN = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 1440))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def hash_password(password: str) -> str:
    salt = secrets.token_hex(32)
    key  = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100000)
    return f"{salt}:{key.hex()}"


def verify_password(plain: str, hashed: str) -> bool:
    try:
        salt, key = hashed.split(":")
        new_key   = hashlib.pbkdf2_hmac("sha256", plain.encode(), salt.encode(), 100000)
        return new_key.hex() == key
    except Exception:
        return False


def create_access_token(user_id: int, username: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=EXPIRE_MIN)
    return jwt.encode(
        {"sub": str(user_id), "username": username, "exp": expire},
        SECRET_KEY, algorithm=ALGORITHM,
    )


def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    cred_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload  = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id  = int(payload.get("sub"))
        username = payload.get("username")
        if not user_id:
            raise cred_exception
    except JWTError:
        raise cred_exception

    # Verify user still exists in DB
    conn = get_db()
    cur  = conn.cursor(dictionary=True)
    cur.execute("SELECT id, username, email FROM users WHERE id = %s", (user_id,))
    user = cur.fetchone()
    cur.close(); conn.close()

    if not user:
        raise cred_exception
    return user
