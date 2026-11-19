-- =========================================================
-- English Stock 初期構築用SQL
-- Supabase Dashboard → SQL Editor に貼り付けて「Run」で実行する。
--
-- ※ 新規プロジェクトの初期構築専用です。
--    すでに stocks テーブルがある場合は「already exists」エラーで止まり、
--    既存のテーブル・データは削除も上書きもされません。
-- =========================================================

-- 登録データ（英単語・フレーズを category で区別して1つのテーブルに保存する）
create table public.stocks (
    -- 主キー（自動採番のUUID）
    id uuid primary key default gen_random_uuid(),

    -- データの持ち主。ログイン中のユーザーIDが自動で入る。
    -- ユーザーが削除されたら、そのユーザーのデータも削除される。
    user_id uuid not null
        references auth.users(id)
        on delete cascade
        default auth.uid(),

    -- 種類：word（英単語） / phrase（英語フレーズ）
    category text not null
        check (category in ('word', 'phrase')),

    -- 英語（空白だけの値は保存できない）
    english text not null
        check (length(btrim(english)) > 0),

    -- 日本語訳（空白だけの値は保存できない）
    japanese text not null
        check (length(btrim(japanese)) > 0)
);

-- ユーザー・カテゴリーでの検索を速くするためのインデックス
create index stocks_user_category_idx
    on public.stocks(user_id, category);

-- Row Level Security（行単位のアクセス制御）を有効にする
alter table public.stocks
    enable row level security;

-- 権限をいったんすべて外し、ログイン済みユーザー（authenticated）にだけ必要な操作を許可する。
-- 未ログイン（anon）は一切アクセスできない。
revoke all on table public.stocks
    from public, anon, authenticated;

grant select, insert, update, delete
    on table public.stocks
    to authenticated;

-- 以下のポリシーにより、自分の user_id のデータだけを読み書きできる
create policy "select_own_stocks"
on public.stocks
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "insert_own_stocks"
on public.stocks
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "update_own_stocks"
on public.stocks
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "delete_own_stocks"
on public.stocks
for delete
to authenticated
using ((select auth.uid()) = user_id);
