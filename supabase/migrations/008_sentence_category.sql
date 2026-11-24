-- =========================================================
-- English Stock 追加SQL：種類に「例文」（sentence）を足す
-- すでに動いているデータベースに、Dashboard → SQL Editor で1回だけ実行する。
-- （新しく作る場合は schema.sql だけでよく、これは不要）
--
-- category の制約を word / phrase / sentence に広げるだけ。既存のデータは変更しない。
-- =========================================================

begin;

-- 今の category の制約（名前は環境によって違うことがあるので、中身で探して外す）
do $$
declare
    r record;
begin
    for r in
        select conname from pg_constraint
        where conrelid = 'public.stocks'::regclass
          and contype = 'c'
          and pg_get_constraintdef(oid) like '%category%'
    loop
        execute format('alter table public.stocks drop constraint %I', r.conname);
    end loop;
end;
$$;

alter table public.stocks
    add constraint stocks_category_check check (category in ('word', 'phrase', 'sentence'));

commit;
