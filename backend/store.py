"""
ユーザーデータの保持（メモリ上の DB）
新規登録データを格納し、ログイン時に照合する
"""
from typing import List, Optional
import hashlib
import secrets


def _hash_password(password: str) -> str:
    """パスワードをソルト付きハッシュで保存（簡易。本番では bcrypt 推奨）"""
    salt = secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
    return f"{salt}${h.hex()}"


def _verify_password(password: str, stored: str) -> bool:
    """保存されたハッシュとパスワードを照合"""
    try:
        salt, hex_hash = stored.split("$", 1)
        h = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
        return h.hex() == hex_hash
    except Exception:
        return False


# ユーザー: id, email, password_hash, created_at
users_db: List[dict] = []
next_user_id = 1


def get_user_by_email(email: str) -> Optional[dict]:
    """メールアドレスでユーザーを1件取得"""
    email_lower = email.strip().lower()
    for u in users_db:
        if u["email"] == email_lower:
            return u
    return None


def get_user_by_id(user_id: int) -> Optional[dict]:
    """ID でユーザーを1件取得"""
    for u in users_db:
        if u["id"] == user_id:
            return u
    return None


def add_user(email: str, password: str) -> dict:
    """ユーザーを1件追加（新規登録）。メール重複時は None を返す"""
    global next_user_id
    email_lower = email.strip().lower()
    if get_user_by_email(email_lower):
        return None
    user = {
        "id": next_user_id,
        "email": email_lower,
        "password_hash": _hash_password(password),
        "created_at": None,  # 必要なら datetime を入れる
    }
    users_db.append(user)
    next_user_id += 1
    return user


def verify_login(email: str, password: str) -> Optional[dict]:
    """メール・パスワードを照合し、一致すればユーザー情報を返す"""
    user = get_user_by_email(email)
    if not user:
        return None
    if not _verify_password(password, user["password_hash"]):
        return None
    return {"id": user["id"], "email": user["email"]}


def get_all_users() -> List[dict]:
    """全ユーザー一覧（管理用。パスワードハッシュは含めない）"""
    return [{"id": u["id"], "email": u["email"]} for u in users_db]
