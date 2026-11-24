-- =========================================================
-- English Stock 追加SQL：「覚えた」の印と、追加した日時
-- すでに動いているデータベースに、Dashboard → SQL Editor で1回だけ実行する。
-- （新しく作る場合は schema.sql だけでよく、これは不要）
--
-- ・learned：暗記で「覚えた」を付けたか（最初はすべて false）
-- ・created_at：追加した日時（単語帳の「新しい順」に使う）。
--   今あるデータには、追加日が記録されていないので、この SQL を実行した日時が入る
-- 既存の単語・フレーズ・例文の中身は変更しない。
-- =========================================================

begin;

alter table public.stocks
    add column learned boolean not null default false,
    add column created_at timestamptz not null default now();

commit;
