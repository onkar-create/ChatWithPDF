# ============================================================
# routers/auth.py — Register + Login
# ============================================================

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from database.connection import get_db
from auth import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Auth"])


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/register")
async def register(body: RegisterRequest):
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    conn = get_db()
    cur  = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT id FROM users WHERE email = %s OR username = %s",
                    (body.email, body.username))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Email or username already exists.")

        cur.execute(
            "INSERT INTO users (username, email, password_hash) VALUES (%s, %s, %s)",
            (body.username, body.email, hash_password(body.password))
        )
        conn.commit()
        user_id = cur.lastrowid

        token = create_access_token(user_id, body.username)
        return {"access_token": token, "token_type": "bearer",
                "user": {"id": user_id, "username": body.username, "email": body.email}}
    finally:
        cur.close(); conn.close()


@router.post("/login")
async def login(body: LoginRequest):
    conn = get_db()
    cur  = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT * FROM users WHERE email = %s", (body.email,))
        user = cur.fetchone()

        if not user or not verify_password(body.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password.")

        token = create_access_token(user["id"], user["username"])
        return {"access_token": token, "token_type": "bearer",
                "user": {"id": user["id"], "username": user["username"], "email": user["email"]}}
    finally:
        cur.close(); conn.close()
