# 予約アプリ 基本設計書（Day5）

## ディレクトリ構成

```
backend/                 # FastAPI（ローカルテスト用）
├── main.py              # 認証 API: /auth/signup, /auth/login
├── models.py            # UserSignup, UserLogin, UserResponse
├── store.py             # ユーザー DB（メモリ・パスワードハッシュ）
└── requirements.txt

frontend/src/
├── pages/                # 画面単位
│   ├── LoginPage.jsx
│   ├── SignupPage.jsx
│   ├── CalendarPage.jsx
│   ├── ReserveFormPage.jsx
│   └── ReserveConfirmPage.jsx
├── components/           # UI部品
│   ├── Calendar.jsx      # カレンダー本体
│   └── InputForm.jsx     # フォーム共通部品
├── services/             # ロジック処理
│   ├── auth.js           # Firebase認証
│   └── reservation.js    # 予約データ保存
├── firebase/             # Firebase設定
├── constants/            # マスタデータ等
├── App.jsx               # ルーティング・認証状態
└── main.jsx
```

## 画面遷移

- `/login` → ログイン成功 → `/calendar`
- `/signup` → 登録成功 → `/calendar`
- `/calendar` → 日付選択 → `/reserve/form`（state で日付を渡す）
- `/reserve/form` → 入力完了 → `/reserve/confirm`（state で入力内容を渡す）
- `/reserve/confirm` → 確定 → Firestore 保存 → 完了表示

未ログインで `/calendar` または `/reserve/*` にアクセスした場合は `/login` へリダイレクト。

## データ設計（Firestore）

- **構造**: `users/{uid}/reservations/{reservationId}`
- **フィールド**: date（YYYY-MM-DD）, time（例 09:00）, category, department, purpose, doctor, createdAt
- 同一ユーザーで同一 date + time の重複は不可（reservation.js でチェック）

## 認証フロー（バックエンド + Firebase）

- **新規登録**: 1) フロント → `POST /auth/signup` でバックエンド DB にユーザー格納 → 2) Firebase `createUserWithEmailAndPassword` でアプリ用セッション取得
- **ログイン**: 1) フロント → `POST /auth/login` でバックエンド DB で照合 → 2) Firebase `signInWithEmailAndPassword` でログイン
- バックエンド DB: メモリ上の users（id, email, password_hash）。再起動でリセット（学習用）

## 技術選定

- バックエンド: FastAPI + メモリ DB（store.py）
- フロント: React + Vite + react-router-dom
- 認証: バックエンド DB（格納・照合）+ Firebase Authentication（セッション・Firestore uid）
- DB: Firebase Firestore（予約データ）
- UI: スマホ前提の独自CSS（フォント 16px 以上）
