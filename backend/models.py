"""
Pydantic モデル（認証・ユーザー）
新規登録・ログインのリクエスト／レスポンスの型定義
"""
from pydantic import BaseModel
from typing import Optional


class UserSignup(BaseModel):
    """新規登録リクエスト"""
    email: str
    password: str


class UserLogin(BaseModel):
    """ログインリクエスト"""
    email: str
    password: str


class UserResponse(BaseModel):
    """ユーザー情報レスポンス（パスワードは含めない）"""
    id: int
    email: str

    class Config:
        from_attributes = True


class UserRegisterBody(BaseModel):
    """Firebase 登録後にバックエンドへ同期するときのボディ（uid, email）"""
    uid: str
    email: str
