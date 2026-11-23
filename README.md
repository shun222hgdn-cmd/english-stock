# English Stock

> ストックする。ランダムに復習する。覚える。

学習した英単語・英語フレーズを1か所にストックし、好きなタイミングでランダムに復習するための個人用Webアプリです。

---

## 1. 開発背景・目的

英語学習や日常生活で新しく知った英単語・フレーズは、その場では理解できても時間が経つと忘れてしまいます。また、一度覚えた表現でも、実際の会話ですぐに思い出せないことがあります。

そこで、次のことを目的として開発しました。

- 学習した英単語・フレーズを一元管理する
- ストックした英語を繰り返し復習する
- 英語表現を自分の頭から瞬時に引き出せるようにする
- スマートフォン・PCなど、どの端末からでも同じデータを使えるようにする

想定利用者は開発者本人のみです（一般向けの新規会員登録はありません）。

## 2. 主な機能

| 機能 | 内容 |
|---|---|
| ログイン / ログアウト | メールアドレスとパスワードで認証（Supabase Auth） |
| 英単語・フレーズの登録 | 英語と日本語訳を登録。種類（Word / Phrase）は切り替えで選択、未選択なら英語にスペースがあれば Phrase と自動判定。前後の空白は自動で除去、空欄は登録不可 |
| 一覧表示 | Stock 画面で All / Words / Phrases を切り替えて表示。アルファベット順のカード表示、長いフレーズも折り返して全文表示 |
| 編集・削除 | 各カードから編集。削除は確認ダイアログ付き |
| 検索 | 英語・日本語の部分一致、英語の大文字・小文字は区別しない、入力に合わせて即時反映 |
| ランダム出題 | 範囲（すべて / 英単語 / フレーズ）と方向（日→英 / 英→日）を選んで出題。直前と同じ問題は連続しない |
| 登録件数表示 | ホーム画面に英単語・フレーズの件数を表示（実データから計算） |
| フォルダ | 1つのアカウントを複数人で使い分け。右上でフォルダ（例：しゅん / ソヒ / 母）を切り替えると、全画面がその人のデータだけになる。追加・名前変更・削除（中身ごと）が可能 |
| データ保存・同期 | Supabase（PostgreSQL）に保存。別の端末でも同じデータを利用可能 |

## 3. 使用技術

| 分類 | 技術 |
|---|---|
| 言語 | JavaScript（TypeScript は不使用） |
| UI | React 19（useState / useEffect などの標準機能のみ） |
| スタイル | CSS（フレームワーク不使用） |
| ビルド | Vite |
| データベース | Supabase（PostgreSQL） + Row Level Security |
| 認証 | Supabase Auth（メール + パスワード） |
| ホスティング | GitHub Pages |
| 自動デプロイ | GitHub Actions |
| テスト | Node.js 標準のテスト機能（`node:test`） |

## 4. システム構成

```text
利用者（スマートフォン・PC）
   │  HTTPS
   ▼
GitHub Pages ── HTML / CSS / JavaScript（Viteでビルドした静的ファイル）を配信
   │
   ▼
ブラウザ上で React アプリが動作
   │  Supabase JavaScript SDK（HTTPS）
   ▼
Supabase
   ├─ Supabase Auth ……… ログイン認証
   ├─ PostgreSQL ………… stocks テーブルにデータ保存
   └─ Row Level Security … 本人のデータだけ読み書きできるよう、DB側で制御
```

独自のバックエンドサーバーはありません。画面の切り替えはURLではなく React の state で行うため、GitHub Pages で再読み込みしても404になりません。

## 5. フォルダ構成

```text
english-stock/
├── .github/workflows/deploy.yml   GitHub Pages への自動デプロイ設定
├── public/favicon.svg             ファビコン
├── src/
│   ├── components/                画面の部品
│   │   ├── Header.jsx             ヘッダー（アプリ名・ログアウト）
│   │   ├── Navigation.jsx         画面下部の固定ナビゲーション
│   │   ├── StockCard.jsx          一覧の1件分のカード
│   │   ├── StockForm.jsx          登録・編集フォーム（モーダル）
│   │   ├── ConfirmDialog.jsx（廃止：削除の確認は編集画面の中で行う）
│   │   ├── Modal.jsx              モーダルの共通部品（<dialog> を使用）
│   │   ├── SearchBar.jsx          検索欄
│   │   ├── QuizCard.jsx           問題カード
│   │   ├── SetupNotice.jsx        接続情報が未設定のときの案内
│   │   └── Icons.jsx              SVGアイコン
│   ├── pages/                     画面
│   │   ├── Login.jsx              ログイン画面
│   │   ├── Home.jsx               ホーム画面
│   │   ├── StockPage.jsx          Stock画面（英単語・フレーズの一覧・登録）
│   │   ├── FolderSetup.jsx        最初のフォルダ作成画面
│   │   └── Quiz.jsx               ランダム出題画面
│   ├── hooks/
│   │   ├── useAuth.js             ログイン状態の管理
│   │   └── useStocks.js           登録データの管理
│   ├── services/stockService.js   Supabase との通信（単語・フレーズ）
│   ├── services/folderService.js  Supabase との通信（フォルダ）
│   ├── lib/supabase.js            Supabase クライアントの作成
│   ├── utils/
│   │   ├── quiz.js                出題ロジック（絞り込み・ランダム抽出）
│   │   ├── search.js              検索・並び替え
│   │   ├── validation.js          入力チェック
│   │   └── errors.js              エラーメッセージの日本語化
│   ├── App.jsx                    画面の切り替え・全体の構成
│   ├── main.jsx                   エントリーポイント
│   └── index.css                  共通スタイル
├── supabase/schema.sql            テーブル作成・RLS設定のSQL（新規構築用・最新版）
├── supabase/migrations/002_add_folders.sql  旧版からフォルダ機能を追加するSQL
├── tests/                         自動テスト
├── .env.example                   環境変数のひな形
├── index.html
├── package.json
└── vite.config.js
```

## 6. 開発環境の構築

### 6.1 必要なもの

- [Node.js](https://nodejs.org/ja) の LTS 版（v20.19 以上、または v22.12 以上）
- Git
- VS Code（推奨）

インストールできているか、ターミナルで確認します。

```bash
node -v
npm -v
git --version
```

### 6.2 依存パッケージのインストール

```bash
cd english-stock
npm install
```

## 7. Supabase の準備

### 7.1 プロジェクトを作成する

1. [https://supabase.com](https://supabase.com) にアクセスし、GitHub アカウントなどでサインインする
2. **New project** を押す
3. 次のように入力して **Create new project**
   - Name: `english-stock`（任意）
   - Database Password: 強力なパスワード（**どこにも公開しない**。パスワードマネージャー等で保管）
   - Region: `Northeast Asia (Tokyo)` など近い地域
4. 作成完了まで1〜2分待つ

### 7.2 SQL Editor でテーブルを作成する

1. 左メニューの **SQL Editor** を開く
2. **New query** を押す
3. このリポジトリの `supabase/schema.sql` の内容をすべて貼り付ける（folders・stocks の2つのテーブルが作られる）
4. **Run** を押し、`Success. No rows returned` と表示されれば完了
5. 左メニュー **Table Editor** に `stocks` テーブルがあり、**RLS enabled** になっていることを確認する

> `schema.sql` は新規構築専用です。すでに `stocks` テーブルがある場合はエラーで停止し、既存データは変更されません。

### 7.3 ログイン用アカウントを作成する

アプリには新規登録画面がないため、Dashboard から自分用のアカウントを作成します。

1. 左メニュー **Authentication** → **Users**
2. **Add user** → **Create new user**
3. **Email address** に `ID@english-stock.invalid`（例：ID を `shun` にするなら `shun@english-stock.invalid`）、**Password** にパスワードを入力
4. **Auto Confirm User** にチェックを入れて **Create user**

アプリのログイン画面では **ID（例：shun）とパスワード**だけを入力します。アプリが自動で `@english-stock.invalid` を付けて Supabase に送ります（`src/utils/loginId.js`）。

- ID に使えるのは半角英数字・`-`・`_`（32文字以内）。大文字・小文字は区別しません。
- `.invalid` は「実在できない」と規格で決められたドメインです。メールは届きませんが、このアプリはメールを使わないので問題ありません。実在するドメインにすると、その持ち主にパスワード再設定メールが届く恐れがあるため、変更しないでください。
- 本物のメールアドレスで作ったアカウントも、ログイン画面にメールアドレスをそのまま入力すればログインできます。

### 7.4 新規ユーザー登録を無効にする（重要）

第三者が勝手にアカウントを作れないようにします。

1. 左メニュー **Authentication** → **Sign In / Providers**
2. **Allow new users to sign up** を **OFF** にして **Save**

> 画面の名称は Supabase の更新で変わることがあります。見つからない場合は Authentication の設定内で「sign up」を探してください。

### 7.5 接続情報を確認する

1. 画面上部の **Connect** ボタン、または **Project Settings** → **API Keys** を開く
2. 次の2つを控える
   - **Project URL**（`https://xxxxxxxx.supabase.co`）
   - **Publishable key**（`sb_publishable_...` で始まる値）
     - 古いプロジェクトで Publishable key が無い場合は **anon public** key でも動作します

> **service_role key / secret key（`sb_secret_...`）は絶対に使わないでください。** RLS を無視して全データを操作できてしまう鍵です。

## 8. 環境変数の設定

1. `.env.example` をコピーして `.env.local` を作成する

   ```bash
   cp .env.example .env.local
   ```

   （Windows の PowerShell では `Copy-Item .env.example .env.local`）

2. `.env.local` に 7.5 で控えた値を設定する

   ```env
   VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxx
   ```

   旧 anon key を使う場合は `VITE_SUPABASE_ANON_KEY=...` でも動作します。

`.env.local` は `.gitignore` に含まれているため、Git には登録されません。

## 9. ローカルでの起動

```bash
npm run dev
```

ブラウザで [http://localhost:5173/](http://localhost:5173/) を開き、7.3 で作成したアカウントでログインします。

- 接続情報が未設定の場合は、設定方法の案内画面が表示されます
- `.env.local` を変更したら開発サーバーを再起動してください（`Ctrl + C` → `npm run dev`）

スマートフォンから同じWi-Fi内で確認したい場合は `npm run dev -- --host` で起動し、表示された Network のURLを開きます。

## 10. テストの実行

```bash
npm test
```

Node.js 標準のテスト機能で、次の処理を自動テストしています（追加のテストライブラリは不要）。

- `tests/quiz.test.js`：カテゴリーでの絞り込み、出題方向、ランダム抽出（直前と同じ問題が連続しない／1件・0件の場合）
- `tests/search.test.js`：英語・日本語の部分一致検索、大文字・小文字の無視、並び順、入力チェック（空欄・空白のみ）、重複チェック
- `tests/folders.test.js`：フォルダごとの絞り込み、表示フォルダの選び方、フォルダ名のチェック

本番ビルドの確認：

```bash
npm run build     # dist フォルダが作られる
npm run preview   # http://localhost:4173/english-stock/ でビルド結果を確認
```

## 11. GitHub Pages への公開

### 11.1 GitHub リポジトリを作成して push する

1. GitHub で **New repository** を作成（Repository name: `english-stock`）
   - 無料プランで GitHub Pages を使う場合、リポジトリは **Public** にする必要があります。
     コードを公開しても、データは Supabase にあり RLS で保護されているため閲覧されません。
2. ローカルから push する

   ```bash
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<GitHubユーザー名>/english-stock.git
   git push -u origin main
   ```

> リポジトリ名を `english-stock` 以外にした場合は、`vite.config.js` の `GITHUB_PAGES_BASE` を `'/<リポジトリ名>/'` に変更してください。

### 11.2 GitHub Actions の変数を設定する

1. リポジトリの **Settings** → **Secrets and variables** → **Actions**
2. **Variables** タブ → **New repository variable** で次の2つを登録

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | Supabase の Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase の Publishable key |

どちらも公開されるJavaScriptに含まれる値なので、Secrets ではなく Variables で問題ありません。未設定のままデプロイすると、ワークフローが「未設定です」というエラーで停止します。

### 11.3 GitHub Pages の公開元を設定する

1. リポジトリの **Settings** → **Pages**
2. **Build and deployment** の **Source** を **GitHub Actions** にする

### 11.4 デプロイ

`main` ブランチに push すると、自動で次の処理が実行されます（**Actions** タブで進行状況を確認できます）。

1. チェックアウト → 2. Node.js セットアップ → 3. `npm ci` → 4. テスト → 5. 環境変数チェック → 6. `npm run build` → 7. `dist` をアップロード → 8. GitHub Pages へデプロイ

完了後、次のURLで利用できます。

```text
https://<GitHubユーザー名>.github.io/english-stock/
```

変数を後から設定した場合は、**Actions** → **Deploy to GitHub Pages** → **Run workflow** で再実行できます。

### 11.5（任意）Supabase の Site URL を設定する

**Authentication** → **URL Configuration** の **Site URL** に公開URLを設定しておくと、パスワードリセットメールなどのリンク先が正しくなります。

### 11.6 フォルダ機能より前の版から更新する場合

すでにフォルダ機能の無い版で運用している場合は、**新しいアプリを公開する前に** SQL Editor で `supabase/migrations/002_add_folders.sql` を1回だけ実行してください。

- 既存の単語・フレーズは消えません。アカウントごとに「My Folder」が作られ、その中に移ります（名前はアプリから変更可能）。
- 実行後に `main` へ push すると、フォルダ対応版が公開されます。

### 11.7 パスワード変更を管理者パスワードで保護する

`supabase/migrations/003_admin_password_lock.sql` を SQL Editor で1回実行すると、ログイン用パスワードの変更に**管理者パスワード**が必要になります。

- アプリ右上の鍵アイコン → 初回だけ「管理者パスワード」を設定 → 以後は管理者パスワードを入れたときだけ変更できる
- アプリを通さない変更（API の直接呼び出し・パスワード再設定メール・Supabase 管理画面からの変更）はデータベースが拒否する
- 管理者パスワードは bcrypt で暗号化し、API から見えない `private` スキーマに保存
- 管理者パスワードを5回間違えると15分間ロック
- **管理者パスワードを忘れたら**：SQL Editor で `delete from private.admin_settings;` を実行すると未設定に戻り、アプリから設定し直せる
- **Supabase 管理画面からパスワードを変えたいとき**：一時的に `alter table auth.users disable trigger block_password_change;` → 変更 → `alter table auth.users enable trigger block_password_change;`

## 12. セキュリティ上の注意事項

- **アクセス制御はデータベース側（RLS）で行っています。** `stocks` テーブルの RLS を無効にしないでください。
- 未ログイン（anon）からは `stocks` テーブルに一切アクセスできません。ログイン済みユーザーも、自分の `user_id` のデータしか取得・登録・更新・削除できません。
- `VITE_` で始まる環境変数はビルド後のJavaScriptに含まれ、誰でも見られます。Publishable key は公開前提の鍵ですが、**service_role key / secret key / データベースのパスワードは絶対にフロントエンドやGitHubに含めないでください。**
- `.env.local` などの環境変数ファイルはコミットしないでください（`.gitignore` 済み）。
- 新規ユーザー登録は Supabase 側で必ず無効にしてください（7.4）。
- ログアウトは「この端末のみ」です。他の端末のログイン状態は維持されます。
- フォルダは**同じアカウントの中での整理**です。同じアカウントにログインできる人は、すべてのフォルダを見られます。人に見せたくないデータがある場合は、フォルダではなく別のアカウントを使ってください。
- 単語・フレーズは「フォルダID + 持ち主」の組で参照しているため、他のアカウントのフォルダにデータを入れることはできません（データベース側で拒否）。
- パスワードは使い回さず、十分に長いものを使用してください。

### RLS の動作確認方法（任意）

ブラウザの開発者ツールのコンソールで、ログインせずに次を実行すると、データが返らない（空配列またはエラー）ことを確認できます。

```js
fetch('https://<Project URL>/rest/v1/stocks?select=*', {
  headers: { apikey: '<Publishable key>' },
}).then((r) => r.json()).then(console.log)
```

他人のデータにアクセスできないことは、Dashboard でテスト用ユーザーをもう1人作成し、そのユーザーでログインして自分のデータが表示されないことで確認できます（確認後はテスト用ユーザーを削除してください）。

## 13. 今回実装していない機能

苦手単語の記録、音声読み上げ、AIによる例文生成・翻訳、学習履歴、正答率、忘却曲線に基づく出題、タグ、SNS、通知、ゲーミフィケーション、課金、一般ユーザー向け新規登録、登録日時・更新日時の記録。
