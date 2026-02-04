# Reservation-Calendar（Day5）

予約カレンダー用リポジトリ。Day5 は本リポジトリで別管理する。

- リモート: https://github.com/kobayashi-Reika7/Reservation-Calendar.git
- 開発時は親プロジェクトの `.cursorrules` に従う（ブランチ `ai-generated` / `main` 運用）

## 予約アプリ（フロントエンド）

- **技術**: React, Vite, Firebase（Authentication / Firestore）, react-router-dom
- **画面**: ログイン / 新規登録 / カレンダー / 予約入力 / 予約確認・完了
- **構成**: `frontend/src/` に `pages/`・`components/`・`services/`・`firebase/` を配置

### セットアップ

```bash
cd frontend
cp .env.example .env
# .env に Firebase の値を設定（VITE_FIREBASE_*）
npm install
npm run dev
```

- ブラウザは http://localhost:5200 で開く（スマホ表示で確認推奨）
- Firebase Console で Authentication（メール/パスワードを有効化）と Firestore を用意し、ルールを設定すること
