"""
FastAPI バックエンド - 予約アプリ用 API
新規登録データを DB に格納し、ログイン照合を提供する（ローカルテスト用）
"""
from __future__ import annotations

import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models import UserSignup, UserLogin, UserResponse, UserRegisterBody
import store

# CORS: フロントエンド（Vite 開発サーバー）を許可
_origins_env = os.getenv("ALLOWED_ORIGINS", "").strip()
ALLOWED_ORIGINS = (
    [o.strip() for o in _origins_env.split(",") if o.strip()]
    if _origins_env
    else ["http://localhost:5200", "http://127.0.0.1:5200"]
)

app = FastAPI(title="Reservation API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    """ヘルスチェック"""
    return {"status": "ok"}


# ===== 認証 API =====

@app.post("/auth/signup", response_model=UserResponse)
def signup(body: UserSignup):
    """
    新規登録。メール・パスワードを DB に格納する。
    同じメールが既に登録済みの場合は 409 を返す。
    """
    email = (body.email or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="メールアドレスを入力してください。")
    if not body.password or len(body.password) < 6:
        raise HTTPException(status_code=400, detail="パスワードは6文字以上にしてください。")
    user = store.add_user(email, body.password)
    if user is None:
        raise HTTPException(status_code=409, detail="このメールアドレスは既に登録されています。")
    return {"id": user["id"], "email": user["email"]}


@app.post("/auth/login", response_model=UserResponse)
def login(body: UserLogin):
    """
    ログイン照合。メール・パスワードが DB と一致すればユーザー情報を返す。
    """
    email = (body.email or "").strip().lower()
    if not email or not body.password:
        raise HTTPException(status_code=400, detail="メールアドレスとパスワードを入力してください。")
    user = store.verify_login(email, body.password)
    if user is None:
        raise HTTPException(status_code=401, detail="メールアドレスかパスワードが違います。")
    return user


@app.post("/users/register", response_model=dict)
def register_user(body: UserRegisterBody):
    """
    Firebase 登録後にバックエンドへユーザーを同期する（uid, email を記録）。
    既に同じ uid があれば上書きせず 200 を返す。
    """
    # 既存ユーザーに uid を紐づける簡易実装: ここでは「登録済みユーザー一覧に uid を追加」は行わず、
    # 新規登録時に Firebase と DB の両方に保存する前提で、このエンドポイントは「DB にユーザーがいるか確認」用に使うことも可。
    # シンプルに「登録を受け付けた」だけ返す。
    return {"ok": True, "uid": body.uid, "email": body.email}


@app.get("/users", response_model=list[UserResponse])
def list_users():
    """ユーザー一覧（管理・確認用）"""
    return store.get_all_users()
