"""
FastAPI バックエンド - 予約アプリ用 API
新規登録データを DB に格納し、ログイン照合を提供する（ローカルテスト用）
"""
from __future__ import annotations

import os

from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware

from models import UserResponse, SyncUserBody
import store
from firebase_admin_client import verify_id_token

# CORS: フロントエンド（Vite 開発サーバー）を許可
# 環境変数が設定されていても、ローカル開発用の origin は常に許可する（CORS で詰まりやすいため）
_default_origins = ["http://localhost:5200", "http://127.0.0.1:5200"]
_origins_env = os.getenv("ALLOWED_ORIGINS", "").strip()
_extra_origins = [o.strip() for o in _origins_env.split(",") if o.strip()] if _origins_env else []
ALLOWED_ORIGINS = list(dict.fromkeys([*_default_origins, *_extra_origins]))

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


@app.get("/debug/cors")
def debug_cors():
    """デバッグ用: CORS 許可オリジン一覧を返す（ローカル確認用）"""
    return {"allowed_origins": ALLOWED_ORIGINS}


def _get_bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization ヘッダーが必要です。")
    prefix = "Bearer "
    if not authorization.startswith(prefix):
        raise HTTPException(status_code=401, detail="Authorization: Bearer <token> の形式で送信してください。")
    token = authorization[len(prefix):].strip()
    if not token:
        raise HTTPException(status_code=401, detail="IDトークンが空です。")
    return token


@app.get("/users/me", response_model=UserResponse)
def users_me(authorization: str | None = Header(default=None)):
    """
    Firebase IDトークンを検証して、ユーザー情報（uid/email）を返す。
    ついでにバックエンド側メモリDBへ upsert（確認用）。
    """
    token = _get_bearer_token(authorization)
    try:
        claims = verify_id_token(token)
    except Exception as e:
        # Admin SDK 未設定などもここに入るため、メッセージは短くする
        raise HTTPException(status_code=401, detail="IDトークンの検証に失敗しました。") from e

    uid = str(claims.get("uid", ""))
    email = str(claims.get("email", ""))
    if not uid:
        raise HTTPException(status_code=401, detail="トークンから uid を取得できません。")
    store.upsert_user(uid, email)
    return {"uid": uid, "email": email}


@app.post("/users/sync", response_model=dict)
def sync_user(body: SyncUserBody):
    """
    フロントから明示同期する（任意）。
    ※認証を厳密にするなら /users/me のみを使い、sync は廃止する。
    """
    store.upsert_user(body.uid, body.email)
    return {"ok": True}


@app.get("/users", response_model=list[UserResponse])
def list_users():
    """ユーザー一覧（管理・確認用）"""
    return store.get_all_users()
