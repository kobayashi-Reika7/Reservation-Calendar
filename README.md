# Reservation-Calendar（Day5）

予約カレンダー用リポジトリ。Day5 は本リポジトリで別管理する。

- リモート: https://github.com/kobayashi-Reika7/Reservation-Calendar.git
- 開発時は親プロジェクトの `.cursorrules` に従う（ブランチ `ai-generated` / `main` 運用）

## 予約アプリ（フロントエンド）

- **技術**: React, Vite, Firebase（Authentication / Firestore）, react-router-dom
- **画面**: ログイン / 新規登録 / カレンダー / 予約入力 / 予約確認・完了
- **構成**: `frontend/src/` に `pages/`・`components/`・`services/`・`firebase/` を配置

### セットアップ

**1. バックエンド（新規登録データを DB に格納・ログイン照合）**

```bash
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
# source venv/bin/activate  # Mac/Linux
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

- API: http://localhost:8000
- エンドポイント: `POST /auth/signup`（新規登録）, `POST /auth/login`（ログイン照合）, `GET /health`

**2. フロントエンド**

```bash
cd frontend
cp .env.example .env
# .env に Firebase（VITE_FIREBASE_*）と必要なら VITE_API_BASE=http://localhost:8000
npm install
npm run dev
```

- ブラウザは http://localhost:5200 で開く（スマホ表示で確認推奨）
- 新規登録・ログイン時は **バックエンドを先に起動** すること（DB に格納・照合のため）
- Firebase Console で **Authentication → サインイン方法 → メール/パスワード** を有効にすること
- Firestore を有効にし、`users/{uid}/reservations` 用のセキュリティルールを設定すること

### よくあるエラー

- **新規登録で 400 が出る**: Firebase Console で「メール/パスワード」が有効か確認してください。
- **favicon.ico 404**: 無視して問題ありません（アプリ内で SVG アイコンを指定済み）。
