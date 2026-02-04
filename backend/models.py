"""
Pydantic モデル（ユーザー）
認証は Firebase に一本化するため、バックエンドは ID トークン検証後のユーザー情報のみ扱う
"""
from pydantic import BaseModel
from typing import Optional


class UserResponse(BaseModel):
    """ユーザー情報レスポンス（Firebase uid ベース）"""
    uid: str
    email: str

    class Config:
        from_attributes = True


class SyncUserBody(BaseModel):
    """フロントからユーザー同期するボディ（任意）"""
    uid: str
    email: str
