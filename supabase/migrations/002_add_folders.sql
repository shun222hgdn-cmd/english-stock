-- =========================================================
-- English Stock 追加SQL：フォルダ機能（1つのアカウントを複数人で使い分ける）
-- すでに schema.sql（最初の版）で構築済みのプロジェクトに対して、1回だけ実行する。
-- Supabase Dashboard → SQL Editor に貼り付けて「Run」で実行する。
--
-- ・既存の単語・フレーズは削除しない。ユーザーごとに「My Folder」を作り、その中に移す。
-- ・途中で失敗した場合は全体が取り消される（begin〜commit）。
-- =========================================================

begin;

-- フォルダ（例：しゅん / ソヒ / 母）
create table public.folders (
    id uuid primary key default gen_random_uuid(),

    -- フォルダの持ち主（ログイン中のユーザー）
    user_id uuid not null
        references auth.users(id)
        on delete cascade
        default auth.uid(),

    -- フォルダ名（1〜20文字、空白だけは不可）
    name text not null
        check (char_length(btrim(name)) between 1 and 20),

    -- stocks から「フォルダID + 持ち主」の組で参照するための一意制約
    unique (id, user_id),
    -- 同じアカウント内で同じ名前のフォルダは作れない
    unique (user_id, name)
);

-- フォルダも本人だけが読み書きできるようにする（stocks と同じ考え方）
alter table public.folders enable row level security;

revoke all on table public.folders from public, anon, authenticated;
grant select, insert, update, delete on table public.folders to authenticated;

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

-- stocks にフォルダの列を追加
alter table public.stocks add column folder_id uuid;

-- 既存データ：データを持っているユーザーごとに「My Folder」を作り、すべてそこへ移す
insert into public.folders (user_id, name)
select distinct user_id, 'My Folder' from public.stocks;

update public.stocks s
set folder_id = f.id
from public.folders f
where f.user_id = s.user_id
  and s.folder_id is null;

-- これ以降、フォルダなしのデータは作れない
alter table public.stocks alter column folder_id set not null;

-- 「自分のフォルダ」にしか入れられないよう、フォルダID と持ち主の組で参照する。
-- フォルダを削除すると、中の単語・フレーズも一緒に削除される。
alter table public.stocks
    add constraint stocks_folder_fkey
    foreign key (folder_id, user_id)
    references public.folders (id, user_id)
    on delete cascade;

create index stocks_folder_idx on public.stocks (folder_id);

commit;
