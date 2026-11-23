-- =========================================================
-- English Stock のデータベース（これ1つで全部）
-- 新しい Supabase プロジェクトで、Dashboard → SQL Editor に貼り付けて「Run」で1回だけ実行する。
-- すでにテーブルがある場合は「already exists」で止まり、既存のデータは変更されない。
--
-- 中身
--   1. folders：フォルダ（1つのアカウントを複数人で使い分ける。例：しゅん / ソヒ）
--   2. stocks ：英単語・フレーズ
--   3. RLS    ：ログイン中の本人のデータだけ読み書きできる（未ログインは一切不可）
--   4. 管理者パスワード：ログイン用パスワードの変更と、フォルダの鍵の解除に使う
-- =========================================================

begin;

-- ---------------------------------------------------------
-- 1. フォルダ
-- ---------------------------------------------------------
create table public.folders (
    id uuid primary key default gen_random_uuid(),
    -- 持ち主（ログイン中のユーザーIDが自動で入る。ユーザーを消すとフォルダも消える）
    user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
    -- フォルダ名（1〜20文字、空白だけは不可）
    name text not null check (char_length(btrim(name)) between 1 and 20),
    -- 鍵（任意）。パスワードの PBKDF2 ハッシュ（アプリ側で作る「画面での鍵」）。null なら鍵なし
    lock_hash text check (lock_hash is null or char_length(lock_hash) <= 200),
    unique (id, user_id),   -- stocks から「フォルダID + 持ち主」の組で参照するため
    unique (user_id, name)  -- 同じアカウント内で同じ名前は不可
);

-- ---------------------------------------------------------
-- 2. 英単語・フレーズ
-- ---------------------------------------------------------
create table public.stocks (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
    folder_id uuid not null,
    category text not null check (category in ('word', 'phrase')),
    english text not null check (length(btrim(english)) > 0),
    japanese text not null check (length(btrim(japanese)) > 0),
    -- 品詞（任意。単語のときだけ使う）
    part_of_speech text check (part_of_speech in (
        '名詞', '代名詞', '動詞', '形容詞', '副詞', '助動詞', '前置詞', '冠詞', '接続詞', '間投詞'
    )),
    -- コメント（任意。500文字まで）
    note text check (note is null or char_length(note) <= 500),
    -- 自分のフォルダにしか入れられない。フォルダを消すと中身も一緒に消える
    constraint stocks_folder_fkey foreign key (folder_id, user_id)
        references public.folders (id, user_id) on delete cascade
);

create index stocks_user_category_idx on public.stocks (user_id, category);
create index stocks_folder_idx on public.stocks (folder_id);

-- ---------------------------------------------------------
-- 3. RLS（行単位のアクセス制御）：権限をいったん外し、ログイン済みの本人の行だけ操作できるようにする
-- ---------------------------------------------------------
alter table public.folders enable row level security;
alter table public.stocks enable row level security;
revoke all on table public.folders, public.stocks from public, anon, authenticated;
grant select, insert, update, delete on table public.folders, public.stocks to authenticated;

create policy "select_own_folders" on public.folders for select to authenticated
    using ((select auth.uid()) = user_id);
create policy "insert_own_folders" on public.folders for insert to authenticated
    with check ((select auth.uid()) = user_id);
create policy "update_own_folders" on public.folders for update to authenticated
    using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "delete_own_folders" on public.folders for delete to authenticated
    using ((select auth.uid()) = user_id);

create policy "select_own_stocks" on public.stocks for select to authenticated
    using ((select auth.uid()) = user_id);
create policy "insert_own_stocks" on public.stocks for insert to authenticated
    with check ((select auth.uid()) = user_id);
create policy "update_own_stocks" on public.stocks for update to authenticated
    using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "delete_own_stocks" on public.stocks for delete to authenticated
    using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------
-- 4. 管理者パスワード
-- ・bcrypt で暗号化して、API から見えない private スキーマに1行だけ保存する
-- ・5回間違えると15分間ロック（パスワード変更と鍵の解除で共通）
-- ・ログイン用パスワードは change_password_with_admin() を通したときだけ変えられる
--   （それ以外の経路での変更は auth.users のトリガーで拒否する）
-- ・忘れたとき：SQL Editor で `delete from private.admin_settings;` を実行すると、アプリから設定し直せる
-- ---------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.admin_settings (
    id boolean primary key default true check (id),
    password_hash text not null,
    failed_attempts integer not null default 0,
    locked_until timestamptz
);
revoke all on table private.admin_settings from public, anon, authenticated;
alter table private.admin_settings enable row level security;

-- 管理者パスワードの確認（ロックと間違えた回数の記録も行う）：ok / not_set / locked / wrong_admin
create function private.verify_admin_password(admin_password text)
returns text
language plpgsql
set search_path = ''
as $$
declare
    settings private.admin_settings;
begin
    select * into settings from private.admin_settings for update;
    if not found then
        return 'not_set';
    end if;
    if settings.locked_until > now() then
        return 'locked';
    end if;
    if extensions.crypt(coalesce(admin_password, ''), settings.password_hash) <> settings.password_hash then
        update private.admin_settings
        set failed_attempts = failed_attempts + 1,
            locked_until = case when failed_attempts + 1 >= 5 then now() + interval '15 minutes' end;
        return 'wrong_admin';
    end if;
    update private.admin_settings set failed_attempts = 0, locked_until = null;
    return 'ok';
end;
$$;
revoke all on function private.verify_admin_password(text) from public;

-- 管理者パスワードを通さないパスワード変更を拒否する
create function private.block_password_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if new.encrypted_password is distinct from old.encrypted_password
       and coalesce(current_setting('english_stock.allow_password_change', true), '') <> 'on' then
        raise exception 'パスワードの変更には管理者パスワードが必要です' using errcode = '42501';
    end if;
    return new;
end;
$$;

create trigger block_password_change
before update on auth.users
for each row execute function private.block_password_change();

-- 以下はアプリから呼ぶ関数（結果は 'ok' などの文字で返す。間違えた回数を残すため、エラーにはしない）

-- 管理者パスワードが設定済みか
create function public.admin_password_is_set()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (select 1 from private.admin_settings);
$$;

-- 管理者パスワードを最初に設定する（まだ無いときだけ）：ok / already_set / too_short / not_authenticated
create function public.set_admin_password(new_admin_password text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
    if auth.uid() is null then
        return 'not_authenticated';
    end if;
    if exists (select 1 from private.admin_settings) then
        return 'already_set';
    end if;
    if char_length(coalesce(new_admin_password, '')) < 8 then
        return 'too_short';
    end if;
    insert into private.admin_settings (password_hash)
    values (extensions.crypt(new_admin_password, extensions.gen_salt('bf', 10)));
    return 'ok';
end;
$$;

-- 管理者パスワードを確認して、ログイン中のユーザーのパスワードを変える
-- ok / wrong_admin / locked / not_set / too_short / not_authenticated
create function public.change_password_with_admin(admin_password text, new_password text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
    result text;
begin
    if auth.uid() is null then
        return 'not_authenticated';
    end if;
    result := private.verify_admin_password(admin_password);
    if result <> 'ok' then
        return result;
    end if;
    if char_length(coalesce(new_password, '')) < 8 then
        return 'too_short';
    end if;
    -- この処理の中だけ、トリガーによるブロックを外す
    perform set_config('english_stock.allow_password_change', 'on', true);
    update auth.users
    set encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf', 10)), updated_at = now()
    where id = auth.uid();
    perform set_config('english_stock.allow_password_change', 'off', true);
    return 'ok';
end;
$$;

-- 管理者パスワードを確認して、自分のフォルダの鍵を外す：ok / wrong_admin / locked / not_set / not_found / not_authenticated
create function public.clear_folder_lock_with_admin(target_folder uuid, admin_password text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
    result text;
begin
    if auth.uid() is null then
        return 'not_authenticated';
    end if;
    result := private.verify_admin_password(admin_password);
    if result <> 'ok' then
        return result;
    end if;
    update public.folders set lock_hash = null where id = target_folder and user_id = auth.uid();
    return case when found then 'ok' else 'not_found' end;
end;
$$;

-- 実行できるのはログイン済みユーザーだけ
revoke all on function public.admin_password_is_set(), public.set_admin_password(text),
    public.change_password_with_admin(text, text), public.clear_folder_lock_with_admin(uuid, text)
    from public, anon;
grant execute on function public.admin_password_is_set(), public.set_admin_password(text),
    public.change_password_with_admin(text, text), public.clear_folder_lock_with_admin(uuid, text)
    to authenticated;

commit;
