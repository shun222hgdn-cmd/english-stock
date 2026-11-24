# English Stock

> ストックする。ランダムに復習する。覚える。

学習した英単語・英語フレーズ・例文を1か所にストックし、好きなタイミングでランダムに復習するための個人用Webアプリです。

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
| ログイン / ログアウト | ID とパスワードで認証（Supabase Auth）。新規登録画面はなく、アカウントは管理者が作る |
| フォルダ | 1つのアカウントを複数人で使い分け。右上でフォルダ（例：しゅん / ソヒ）を切り替えると、全画面がそのフォルダのデータだけになる。追加・名前変更・削除（中身ごと） |
| フォルダの鍵（任意） | フォルダごとにパスワードをかけられる（別のフォルダに切り替えるかアプリを閉じるとまた閉まる）。忘れたら管理者パスワードで外せる。※画面での鍵のため、同じアカウントで API を直接使えば中身は読める |
| 単語帳 | 単語・フレーズ・例文を1画面で管理。すべて / 単語 / フレーズ / 例文 の切り替え（件数つき）、並べ替えのプルダウン（ABC順（A〜Z の見出しつき）/ 新しい順 / 古い順 / 覚えたものから / 覚えていないものから）、検索（英語・日本語訳・コメントの部分一致） |
| 登録 | 右下の ＋ から。英語・日本語訳、任意で品詞（単語のみ・10種類）とコメント（500文字まで）。種類は英語から自動判定（スペースなし＝単語、3語以上で . ? ! で終わる＝例文、それ以外＝フレーズ。手で変えられる）。同じ英語が登録済みなら注意を出す |
| 詳細・編集・削除 | 行を押すと詳細（英語・🔊・日本語訳・品詞・コメント・覚えた）。下の「前へ / 次へ」（← →）で隣に移れる。右上の「編集」から編集・削除（確認つき） |
| 元に戻す | 単語・フォルダを削除した直後、8秒間「元に戻す」を表示。押すと中身（フォルダなら鍵と中の単語も）をそのまま戻す |
| まとめて追加 | ⚙ 設定から。ChatGPT などで作ったリスト（`英語 \| 日本語訳 \| 品詞 \| コメント`、表、タブ区切り、このアプリの CSV）を貼り付け、確認してから一括追加（300件まで。登録済みは除外） |
| 暗記 | ランダムに出題（直前と同じ問題は続けない）。範囲（すべて / 単語 / フレーズ / 例文）と方向（JP → EN / EN → JP）を選べる。答えはカードを押すと出る（問題の位置は動かない）。「前の問題」で直前の問題に戻れる。「覚えた」を付けたものは出にくくなる（1/5）。覚えた数を表示。⚙ から表示中のフォルダの覚えたものをまとめて削除できる（元に戻す付き） |
| 発音 | 🔊 で英語を読み上げ（ブラウザ内蔵の音声合成。外部 API・料金なし）。自動読み上げ：暗記では英語が出たとき（JP → EN は答えを開いたとき）、詳細では開いた・移ったときに自動で読む。暗記カードの 🔊 でオン / オフ。⚙ でアメリカ英語 / イギリス英語、ふつう / ゆっくり、自動で読む / 押したときだけ |
| CSV で書き出す | ⚙ から、表示中のフォルダを CSV でダウンロード（Excel で文字化けしない UTF-8 BOM 付き）。まとめて追加で復元もできる |
| パスワード変更 | ⚙ から。管理者パスワードが必要（データベースで確認） |
| データの保存・同期 | Supabase（PostgreSQL）に保存。どの端末でも同じデータ。アプリに戻ると自動で最新に |

アプリから AI や外部のサービスを呼び出すことはありません。

## 3. 使用技術

| 分類 | 技術 |
|---|---|
| 言語 | JavaScript（TypeScript は不使用） |
| UI | React 19（useState / useEffect などの標準機能のみ） |
| スタイル | CSS（フレームワーク不使用） |
| ビルド | Vite |
| データベース | Supabase（PostgreSQL） + Row Level Security |
| 認証 | Supabase Auth（ID + パスワード） |
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
   ├─ PostgreSQL ………… folders / stocks テーブルにデータ保存
   └─ Row Level Security … 本人のデータだけ読み書きできるよう、DB側で制御
```

独自のバックエンドサーバーはありません。画面の切り替えはURLではなく React の state で行うため、GitHub Pages で再読み込みしても404になりません。

## 5. フォルダ構成

```text
english-stock/
├── .github/workflows/deploy.yml   GitHub Pages への自動デプロイ設定
├── public/                        アイコン・ホーム画面用の設定
├── src/
│   ├── components/                画面の部品
│   │   ├── Header.jsx             ヘッダー（アプリ名・フォルダ切り替え・設定）
│   │   ├── Navigation.jsx         画面下部のタブ（単語帳 / 暗記）
│   │   ├── Modal.jsx              ダイアログの共通部品（<dialog> を使用）
│   │   ├── Choice.jsx             切り替えボタンの並び（すべて / 単語 / フレーズ など）
│   │   ├── StockCard.jsx          一覧の1行
│   │   ├── StockDetail.jsx        詳細（編集ボタン付き）
│   │   ├── StockForm.jsx          登録・編集フォーム
│   │   ├── BulkImportDialog.jsx   まとめて追加
│   │   ├── FolderDialog.jsx       フォルダの切り替え・追加・名前変更・鍵・削除
│   │   ├── SettingsDialog.jsx     設定（CSV・発音・パスワード変更・ログアウト）
│   │   ├── PasswordDialog.jsx     パスワード変更（管理者パスワード）
│   │   ├── QuizCard.jsx           暗記カード
│   │   ├── SpeakButton.jsx        発音ボタン
│   │   ├── AutoTextarea.jsx       文字数に合わせて伸びる入力欄
│   │   ├── SearchBar.jsx          検索欄
│   │   ├── SetupNotice.jsx        接続情報が未設定のときの案内
│   │   └── Icons.jsx              SVG アイコン
│   ├── pages/                     画面
│   │   ├── Login.jsx              ログイン
│   │   ├── StockPage.jsx          単語帳
│   │   ├── Quiz.jsx               暗記
│   │   ├── FolderSetup.jsx        最初のフォルダ作成
│   │   └── LockedFolder.jsx       鍵付きフォルダを開く
│   ├── hooks/
│   │   ├── useAuth.js             ログイン状態
│   │   ├── useData.js             単語・フレーズとフォルダ（読み込み・変更・裏での再読み込み）
│   │   └── useBusy.js             送信中の二重実行防止とエラー表示
│   ├── services/api.js            Supabase との通信（すべて）
│   ├── lib/
│   │   ├── supabase.js            Supabase クライアント
│   │   └── preferences.js         端末ごとの設定（localStorage）
│   ├── utils/                     画面に依存しない処理（自動テストあり）
│   │   ├── quiz.js / search.js / validation.js / folders.js / folderLock.js
│   │   ├── loginId.js / csv.js / bulkImport.js / speech.js
│   │   └── errors.js              エラーメッセージの日本語化
│   ├── App.jsx                    画面の切り替え・全体の構成
│   ├── main.jsx                   エントリーポイント
│   └── index.css                  スタイル
├── supabase/schema.sql            データベースのすべて（テーブル・RLS・管理者パスワード）
├── supabase/migrations/           既存のデータベースを最新にするSQL
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
3. このリポジトリの `supabase/schema.sql` の内容をすべて貼り付ける（テーブル・RLS・管理者パスワードの仕組みがまとめて作られる）
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

- `tests/quiz.test.js`：出題範囲の絞り込み、出題方向、ランダム抽出（直前と同じ問題が続かない／1件・0件）
- `tests/search.test.js`：検索・並び順・頭文字の見出し、入力チェック、重複チェック
- `tests/folders.test.js`：フォルダごとの絞り込み、表示フォルダの選び方、フォルダ名のチェック
- `tests/folderLock.test.js`：鍵のパスワードのハッシュと照合
- `tests/loginId.test.js`：ID とアドレスの変換
- `tests/csv.test.js` / `tests/bulkImport.test.js`：CSV の書き出し、貼り付けたリストの読み取り
- `tests/speech.test.js`：発音の声の選び方

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

### 11.5 既存のデータベースを最新にする

以前の版で作ったデータベースは、`supabase/migrations/` の SQL を SQL Editor で番号順に1回ずつ実行すると最新になります（データは消えません）。新しく作る場合は `schema.sql` だけでよく、これは不要です。

### 11.6 管理者パスワード

- ⚙ → パスワード変更 で、初回だけ管理者パスワードを決める。以後、ログイン用パスワードの変更と、忘れたフォルダの鍵の解除に使う
- アプリを通さない変更（API の直接呼び出し・パスワード再設定メール・Supabase 管理画面からの変更）はデータベースが拒否する
- bcrypt で暗号化し、API から見えない `private` スキーマに保存。5回間違えると15分間ロック
- **忘れたら**：SQL Editor で `delete from private.admin_settings;` を実行すると未設定に戻り、アプリから設定し直せる
- **Supabase 管理画面からパスワードを変えたいとき**：一時的に `alter table auth.users disable trigger block_password_change;` → 変更 → `alter table auth.users enable trigger block_password_change;`

## 12. セキュリティ上の注意事項

- **アクセス制御はデータベース側（RLS）で行っています。** `folders`・`stocks` テーブルの RLS を無効にしないでください。
- 未ログイン（anon）からは `folders`・`stocks` テーブルに一切アクセスできません。ログイン済みユーザーも、自分の `user_id` のデータしか取得・登録・更新・削除できません。
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

苦手単語の記録、AIによる例文生成・翻訳、学習履歴、正答率、忘却曲線に基づく出題、タグ、SNS、通知、ゲーミフィケーション、課金、一般ユーザー向け新規登録、登録日時・更新日時の記録。
