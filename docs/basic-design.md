# 予約アプリ 基本設計書（Day5）

## ディレクトリ構成

```
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

- **コレクション**: `reservations`
- **フィールド**: userId, date（YYYY-MM-DD）, slot（例 09:00）, category, department, purpose, doctorName, createdAt
- 同一 date + slot の重複は不可（reservation.js でチェック）

## 技術選定

- フロント: React + Vite + react-router-dom
- 認証: Firebase Authentication（メール/パスワード）
- DB: Firebase Firestore
- UI: スマホ前提の独自CSS（フォント 16px 以上）
