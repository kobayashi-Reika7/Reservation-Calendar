# 予約アプリ 基本設計書（Day5）

## ディレクトリ構成

```
backend/                 # FastAPI（ローカルテスト用）
├── main.py              # ユーザーAPI: /users/me（IDトークン検証）
├── firebase_admin_client.py # Firebase Admin（IDトークン検証）
├── models.py            # UserResponse（uid/email）, SyncUserBody
├── store.py             # ユーザーDB（メモリ: uid/email）
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

## 認証フロー（Firebase に一本化）

- **新規登録**: Firebase `createUserWithEmailAndPassword`
- **ログイン**: Firebase `signInWithEmailAndPassword`
- **バックエンド**: Firebase の **IDトークン**（`Authorization: Bearer <idToken>`）を検証し、`/users/me` で uid/email を返す
- バックエンドの `store.py` は確認用のメモリDB（uid/email を保持）。再起動でリセット（学習用）

## 技術選定

- バックエンド: FastAPI + firebase-admin（IDトークン検証） + メモリDB（store.py）
- フロント: React + Vite + react-router-dom
- 認証: Firebase Authentication（セッション・Firestore uid）
- DB: Firebase Firestore（予約データ）
- UI: スマホ前提の独自CSS（フォント 16px 以上）
