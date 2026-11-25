-- =========================================================
-- English Stock 追加SQL：フォルダの中にフォルダ（入れ子・5段まで）
-- すでに動いているデータベースに、Dashboard → SQL Editor で1回だけ実行する。
-- （新しく作る場合は schema.sql だけでよく、これは不要）
--
-- ・folders に parent_id（親フォルダ）を足す。今あるフォルダはすべて、いちばん上（parent_id なし）のまま
-- ・親は「自分のフォルダ」だけ（フォルダID + 持ち主の組で参照）。親を消すと、中のフォルダも一緒に消える
-- ・5段より深くは作れない（データベースでも確かめる）
-- 既存のデータは変更しない。
-- =========================================================

begin;

alter table public.folders
    add column parent_id uuid,
    add constraint folders_parent_not_self check (parent_id is null or parent_id <> id),
    add constraint folders_parent_fkey foreign key (parent_id, user_id)
        references public.folders (id, user_id) on delete cascade;

create index folders_parent_idx on public.folders (parent_id);

-- 入れ子の深さを確かめる（いちばん上を 1 段目として 5 段目まで。親をたどって数える）
create function private.check_folder_depth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    depth integer := 1;
    parent uuid := new.parent_id;
begin
    while parent is not null loop
        depth := depth + 1;
        if depth > 5 then
            raise exception 'フォルダは5段までです' using errcode = '23514';
        end if;
        select f.parent_id into parent from public.folders f where f.id = parent;
    end loop;
    return new;
end;
$$;
revoke all on function private.check_folder_depth() from public;

create trigger check_folder_depth
before insert or update of parent_id on public.folders
for each row execute function private.check_folder_depth();

commit;
