# Day5 予約カレンダーアプリ 最終レビュー

プロンプト集 (1)(2) および前提要件に基づく確認結果です。

---

## ■ 前提要件（技術スタック）

| 項目 | 状態 | 備考 |
|------|------|------|
| フロントエンド: React | ✅ | Vite + React |
| 認証: Firebase Authentication（一本化） | ✅ | auth.js で集約、ページは `login`/`signup` を呼ぶのみ |
| DB: Firestore | ✅ | reservation.js で集約 |
| 画面遷移: React Router | ✅ | BrowserRouter, Routes, Route, Navigate |
| UI とロジックの分離 | ✅ | pages / components / services で分離 |

---

## ■ Cursor プロンプト集 (1)：設計・UI

### 🔹 要件定義（必須機能）

| 機能 | 状態 | 備考 |
|------|------|------|
| ログイン機能（Firebase Auth） | ✅ | LoginPage / SignupPage、auth.js の `login` / `signup` |
| カレンダー日付選択 | ✅ | Calendar.jsx + CalendarPage、月表示・過去日不可 |
| 予約入力 | ✅ | ReserveFormPage（大分類・診療科・目的・担当医・時間） |
| 予約確認（一覧） | ✅ | MyReservationsPage、変更・キャンセル付き |
| Firestore 連携 | ✅ | createReservation / getReservationsByUser / deleteReservation |

※ プロンプトの「名前・メール・備考」は汎用テンプレート。Day5 要件定義書では「大分類・診療科・予約目的・担当医・時間」のため、現状の項目で要件を満たしています。

### 🔹 カレンダー UI

| 項目 | 状態 | 備考 |
|------|------|------|
| React カレンダーコンポーネント | ✅ | `components/Calendar.jsx` |
| 年月表示と切り替えボタン | ✅ | 「◀ 2026年 2月 ▶」、前月・次月 |
| 日付クリック可能 | ✅ | 当月かつ過去でない日のみ `isSelectable`、button でクリック |
| selectedDate を親へ渡す | ✅ | **コールバック** `onSelectDate(day.date)` で親（CalendarPage）に通知。親は state で保持し、日付選択時に `/reserve/form` へ `state: { selectedDate }` で遷移 |

props/state の流れ: **CalendarPage** が `selectedDate` state を持ち、`<Calendar selectedDate={selectedDate} onSelectDate={handleSelectDate} />` で渡す。子はクリック時に `onSelectDate(day.date)` を呼ぶ。親の `handleSelectDate` で日付を YYYY-MM-DD に変換し、navigate で ReserveFormPage に渡している → 適切です。

### 🔹 予約フォーム UI

| 項目 | 状態 | 備考 |
|------|------|------|
| UI のみで Firestore 直書きなし | ✅ | ReserveFormPage は `isSlotTaken` / `getBookedDoctorsByDate`（services）のみ利用。保存は ConfirmPage で `createReservation` を呼ぶ |
| 入力項目が揃っているか | ✅ | 日付（表示のみ）、時間（30分刻みボタン）、大分類・診療科・目的・担当医（要件定義書どおり） |
| CSS と見やすさ | ✅ | App.css でフォーム・ボタン・カードのスタイルを適用 |

※ 時間は「プルダウン」ではなく 30 分刻みボタン。要件定義書の「30分刻みで予約枠を表示」に合致しています。

### 🔹 ページ遷移（Router）

| 想定フロー | 実装 | 備考 |
|------------|------|------|
| Login → Calendar | ✅（発展形） | 実際は **Login → Menu → Calendar**。MenuPage で「予約する／予約確認」を選択する導線になっている |
| Calendar → ReserveForm | ✅ | 日付クリックで `/reserve/form` へ `state: { selectedDate }` |
| ReserveForm → Confirm | ✅ | 「確認画面へ」で `/reserve/confirm` へ `state: { selectedDate, category, department, purpose, doctor, time }` |
| App.jsx の Router 設定 | ✅ | Routes / Route / ProtectedRoute / Navigate で適切に構成 |
| 不要な直リンク | ✅ | 特になし。`/` と `*` は `/menu` へリダイレクト |

---

## ■ Cursor プロンプト集 (2)：ロジック・保存

### 🔹 ログイン処理（Auth）

| 項目 | 状態 | 備考 |
|------|------|------|
| auth.js に login 関数 | ✅ | **関数名は `login`**（プロンプトの `loginUser` に相当）。引数は email / password |
| Firebase Auth でログイン | ✅ | `signInWithEmailAndPassword(auth, email, password)` |
| 成功時に user を返す | ✅ | `UserCredential` を返し、`cred.user` でユーザー取得可能 |
| UI で直接 Auth を書いていないか | ✅ | LoginPage / SignupPage は `login` / `signup` を import して呼ぶのみ |

### 🔹 予約保存（Firestore）

| 項目 | 状態 | 備考 |
|------|------|------|
| reservation.js に保存関数 | ✅ | **関数名は `createReservation`**（プロンプトの `addReservation` に相当） |
| 保存項目 | ✅ | **userId（uid）** は第1引数、**date, time, category, department, purpose, doctor**（要件定義書に合わせて name/email/note ではなく診療科・目的・担当医など） |
| Firestore に正しく保存 | ✅ | `users/{uid}/reservations` に addDoc、createdAt も付与 |

### 🔹 データのつなぎこみ

| 項目 | 状態 | 備考 |
|------|------|------|
| ReserveFormPage で state 管理 | ✅ | category, department, purpose, doctor, time 等を useState で管理 |
| 「確認画面へ」で Confirm にデータを渡す | ✅ | `navigate('/reserve/confirm', { state: { selectedDate, category, department, ... } })` |
| useLocation / context の利用 | ✅ | ReserveConfirmPage で `useLocation().state` から取得 |
| props バケツリレーになっていないか | ✅ | 親子間の多段 props はなく、state + navigate の state で完結 |

---

## ■ 総合レビュー

| 観点 | 結果 |
|------|------|
| プロンプト通りに実装されているか | **Yes**（関数名・項目名は要件定義書に合わせた差異あり。意味としては同等） |
| 初学者向けとして分かりやすい構成か | **Yes**（pages / components / services が明確で、責務が分かれている） |
| UI とロジックが適切に分離されているか | **Yes**（Firestore・Auth はすべて services、ページは state とサービス呼び出しのみ） |

---

## ✅ できている点

1. **技術スタック・ディレクトリ構成**  
   React / Firebase Auth / Firestore / React Router が前提どおりで、pages・components・services・firebase・constants の分離ができている。

2. **認証の一本化**  
   auth.js に login / signup / logout / subscribeAuth を集約し、ページはサービスを呼ぶだけ。UI に Auth の直書きなし。

3. **カレンダー**  
   月表示・前後月・日付クリック・選択日の親への通知（onSelectDate）が明確で、過去日は選択不可。

4. **予約フォーム**  
   Firestore は直接触らず、reservation.js の isSlotTaken / getBookedDoctorsByDate のみ利用。入力は state で管理し、確認画面へは navigate の state で渡している。

5. **予約一覧・変更・キャンセル**  
   MyReservationsPage で一覧表示、キャンセル確認モーダル、変更は「削除→新規」で安全に実装されている。

6. **ルーティング**  
   App.jsx で Route が整理され、ProtectedRoute で未ログイン時は /login へリダイレクト。不要な直リンクはない。

---

## ⚠️ 修正・改善した方がよい点

### 1. プロンプトとの名前対応の明示（軽微）

- プロンプト: `loginUser` → 実装: `login`
- プロンプト: `addReservation` → 実装: `createReservation`  
  どちらも役割は同じ。**評価時に「プロンプト上の名前と実装の対応」を README かコメントで一行書いておくと安心。**

### 2. basic-design.md の画面遷移の記載

- 現在: 「ログイン成功 → `/calendar`」と記載。
- 実装: ログイン成功 → **`/menu`** → 「予約する」で `/calendar`。  
  **「ログイン成功 → `/menu`（メニュー画面）」に修正すると、コードと一致する。**

### 3. フォーム項目の「名前・メール・備考」について

- プロンプトは汎用テンプレートで「名前・メール・備考」を例にしている。
- Day5 は要件定義書に合わせて「大分類・診療科・目的・担当医・時間」で実装されており、**要件としては正しい。**  
  レビュー時に「Day5 要件定義書に合わせて項目が異なる」旨を 1 行 README に書いておくと、プロンプトとの差分で誤解されにくい。

---

## 🔧 修正例（必要に応じて）

### 1. README に「プロンプトとの対応」を追記（任意）

```markdown
## プロンプト集との対応（参考）
- ログイン: プロンプトの `loginUser` → 実装は `services/auth.js` の `login(email, password)`
- 予約保存: プロンプトの `addReservation` → 実装は `services/reservation.js` の `createReservation(uid, data)`
- フォーム項目: 要件定義書に合わせて 大分類・診療科・目的・担当医・時間 を採用（名前・メール・備考は不使用）
```

### 2. basic-design.md の画面遷移を実装に合わせる

```markdown
## 画面遷移
- `/login` → ログイン成功 → `/menu`（予約メニュー）
- `/signup` → 登録成功 → `/menu`
- `/menu` → 「予約する」→ `/calendar` → 日付選択 → `/reserve/form`（state で日付を渡す）
- `/reserve/form` → 入力完了 → `/reserve/confirm`（state で入力内容を渡す）
- `/reserve/confirm` → 確定 → Firestore 保存 → 完了表示
- `/menu` → 「予約を確認する」→ `/reservations`（MyReservationsPage）
```

---

## 🎯 ゴール

- **「プロンプト通りに作れています」と自信を持って言える状態**  
  → 技術スタック・必須機能・画面遷移・Auth/Firestore の分離・データのつなぎこみはいずれもプロンプトの意図を満たしている。関数名・フォーム項目は Day5 要件定義書に合わせた正当な差分。

- **Day5 の成果物として発表可能な品質**  
  → 要件定義書に沿った機能が揃い、UI/ロジックの分離と安全性（キャンセル確認・変更は削除→新規）も考慮されている。上記の軽微なドキュメント修正を行えば、発表用として十分な水準です。
