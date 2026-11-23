-- =========================================================
-- English Stock 初期構築用SQL（フォルダ機能を含む最新版）
-- Supabase Dashboard → SQL Editor に貼り付けて「Run」で実行する。
--
-- ※ 新規プロジェクトの初期構築専用です。
--    すでに stocks テーブルがある場合は「already exists」エラーで止まり、
--    既存のテーブル・データは削除も上書きもされません。
--    以前の版で構築済みの場合は、migrations/ の SQL のうち未実行のものを番号順に実行してください。
--    ※ 管理者パスワード（003）とフォルダの鍵の解除関数（005）は、このファイルの後に migrations/003・005 を実行して追加してください。
-- =========================================================

begin;

-- ---------------------------------------------------------
-- フォルダ（1つのアカウントを複数人で使い分けるための入れ物。例：しゅん / ソヒ / 母）
-- ---------------------------------------------------------
create table public.folders (
    id uuid primary key default gen_random_uuid(),

    -- フォルダの持ち主（ログイン中のユーザーIDが自動で入る）
    user_id uuid not null
        references auth.users(id)
        on delete cascade
        default auth.uid(),

    -- フォルダ名（1〜20文字、空白だけは不可）
    name text not null
        check (char_length(btrim(name)) between 1 and 20),

    -- フォルダの鍵（任意）。パスワードのハッシュ。未設定なら鍵なし（画面での鍵）
    lock_hash text
        check (lock_hash is null or char_length(lock_hash) <= 200),

    -- stocks から「フォルダID + 持ち主」の組で参照するための一意制約
    unique (id, user_id),
    -- 同じアカウント内で同じ名前のフォルダは作れない
    unique (user_id, name)
);

-- ---------------------------------------------------------
-- 登録データ（英単語・フレーズを category で区別して1つのテーブルに保存する）
-- ---------------------------------------------------------
create table public.stocks (
    -- 主キー（自動採番のUUID）
    id uuid primary key default gen_random_uuid(),

    -- データの持ち主。ログイン中のユーザーIDが自動で入る。
    -- ユーザーが削除されたら、そのユーザーのデータも削除される。
    user_id uuid not null
        references auth.users(id)
        on delete cascade
        default auth.uid(),

    -- 所属するフォルダ
    folder_id uuid not null,

    -- 種類：word（英単語） / phrase（英語フレーズ）
    category text not null
        check (category in ('word', 'phrase')),

    -- 英語（空白だけの値は保存できない）
    english text not null
        check (length(btrim(english)) > 0),

    -- 日本語訳（空白だけの値は保存できない）
    japanese text not null
        check (length(btrim(japanese)) > 0),

    -- 品詞（単語のときだけ使う。未設定でもよい）
    part_of_speech text
        check (part_of_speech in (
            '名詞', '代名詞', '動詞', '形容詞', '副詞',
            '助動詞', '前置詞', '冠詞', '接続詞', '間投詞'
        )),

    -- コメント（自由なメモ。未設定でもよい。500文字まで）
    note text
        check (note is null or char_length(note) <= 500),

    -- 「自分のフォルダ」にしか入れられないよう、フォルダID と持ち主の組で参照する。
    -- フォルダを削除すると、中の単語・フレーズも一緒に削除される。
    constraint stocks_folder_fkey
        foreign key (folder_id, user_id)
        references public.folders (id, user_id)
        on delete cascade
);

-- 検索を速くするためのインデックス
create index stocks_user_category_idx
    on public.stocks(user_id, category);

create index stocks_folder_idx
    on public.stocks(folder_id);

-- ---------------------------------------------------------
-- Row Level Security（行単位のアクセス制御）
-- 権限をいったんすべて外し、ログイン済みユーザー（authenticated）にだけ必要な操作を許可する。
-- 未ログイン（anon）は一切アクセスできない。
-- 以下のポリシーにより、自分の user_id のデータだけを読み書きできる。
-- ---------------------------------------------------------
alter table public.folders enable row level security;
alter table public.stocks enable row level security;

revoke all on table public.folders from public, anon, authenticated;
revoke all on table public.stocks from public, anon, authenticated;

grant select, insert, update, delete on table public.folders to authenticated;
grant select, insert, update, delete on table public.stocks to authenticated;

-- folders
create policy "select_own_folders" on public.folders
for select to authenticated
using ((select auth.uid()) = user_id);

create policy "insert_own_folders" on public.folders
for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "update_own_folders" on public.folders
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "delete_own_folders" on public.folders
for delete to authenticated
using ((select auth.uid()) = user_id);

-- stocks
create policy "select_own_stocks" on public.stocks
for select to authenticated
using ((select auth.uid()) = user_id);

create policy "insert_own_stocks" on public.stocks
for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "update_own_stocks" on public.stocks
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "delete_own_stocks" on public.stocks
for delete to authenticated
using ((select auth.uid()) = user_id);

commit;
