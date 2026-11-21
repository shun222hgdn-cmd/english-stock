-- =========================================================
-- English Stock 追加SQL：パスワード変更を「管理者パスワード」で保護する
-- Supabase Dashboard → SQL Editor に貼り付けて「Run」で1回だけ実行する。
--
-- 仕組み：
-- ・ログイン用パスワードの変更は、管理者パスワードが正しいときだけ、
--   public.change_password_with_admin() 経由でのみ行える。
-- ・それ以外の経路（アプリを通さない直接の変更・パスワード再設定メール・管理画面からの変更）は、
--   auth.users のトリガーでデータベースが拒否する。
-- ・管理者パスワードは bcrypt で暗号化して、API から見えない private スキーマに保存する。
-- ・管理者パスワードを5回間違えると、15分間ロックする。
--
-- 管理者パスワードを忘れた場合：SQL Editor で次を実行すると未設定に戻り、アプリから設定し直せる。
--   delete from private.admin_settings;
-- =========================================================

begin;

-- API（Data API）に公開しない、管理用のスキーマ
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- 管理者パスワード（1行だけ）と、間違えた回数・ロック期限
create table private.admin_settings (
    id boolean primary key default true check (id),
    password_hash text not null,
    failed_attempts integer not null default 0,
    locked_until timestamptz
);
revoke all on table private.admin_settings from public, anon, authenticated;
-- 念のため RLS も有効にする（API からは見えない場所だが、二重の守りとして）
alter table private.admin_settings enable row level security;

-- ---------------------------------------------------------
-- 管理者パスワードを通さないパスワード変更を拒否するトリガー
-- ---------------------------------------------------------
create function private.block_password_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if new.encrypted_password is distinct from old.encrypted_password
       and coalesce(current_setting('english_stock.allow_password_change', true), '') <> 'on' then
        raise exception 'パスワードの変更には管理者パスワードが必要です'
            using errcode = '42501';
    end if;
    return new;
end;
$$;

create trigger block_password_change
before update on auth.users
for each row execute function private.block_password_change();

-- ---------------------------------------------------------
-- アプリから呼ぶ関数（ログイン済みユーザーだけ実行できる）
-- ---------------------------------------------------------

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

-- 管理者パスワードを最初に設定する（まだ設定されていないときだけ）
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

-- 管理者パスワードを確認して、ログイン中のユーザーのパスワードを変更する
-- 戻り値：ok / wrong_admin / locked / not_set / too_short / not_authenticated
-- （間違えた回数を記録するため、エラーにはせず結果を文字で返す）
create function public.change_password_with_admin(admin_password text, new_password text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
    settings private.admin_settings;
begin
    if auth.uid() is null then
        return 'not_authenticated';
    end if;

    select * into settings from private.admin_settings for update;
    if not found then
        return 'not_set';
    end if;

    if settings.locked_until is not null and settings.locked_until > now() then
        return 'locked';
    end if;

    if extensions.crypt(coalesce(admin_password, ''), settings.password_hash) <> settings.password_hash then
        update private.admin_settings
        set failed_attempts = failed_attempts + 1,
            locked_until = case when failed_attempts + 1 >= 5 then now() + interval '15 minutes' end;
        return 'wrong_admin';
    end if;

    if char_length(coalesce(new_password, '')) < 8 then
        return 'too_short';
    end if;

    -- 管理者パスワードが正しいので、間違えた回数をリセット
    update private.admin_settings set failed_attempts = 0, locked_until = null;

    -- この処理の中だけ、トリガーによるブロックを外してパスワードを更新する
    perform set_config('english_stock.allow_password_change', 'on', true);
    update auth.users
    set encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf', 10)),
        updated_at = now()
    where id = auth.uid();
    perform set_config('english_stock.allow_password_change', 'off', true);

    return 'ok';
end;
$$;

-- 実行できるのはログイン済みユーザーだけ（未ログインは不可）
revoke all on function public.admin_password_is_set() from public, anon;
revoke all on function public.set_admin_password(text) from public, anon;
revoke all on function public.change_password_with_admin(text, text) from public, anon;
grant execute on function public.admin_password_is_set() to authenticated;
grant execute on function public.set_admin_password(text) to authenticated;
grant execute on function public.change_password_with_admin(text, text) to authenticated;

commit;
