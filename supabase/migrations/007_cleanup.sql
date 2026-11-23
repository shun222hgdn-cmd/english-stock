-- =========================================================
-- English Stock 整理用SQL（2026-11 のコード整理）
-- すでに動いているデータベースに、Dashboard → SQL Editor で1回だけ実行する。
-- （新しく作る場合は schema.sql だけでよく、これは不要）
--
-- 1. 使わなくなった ChatGPT 連携（連携キーの表と関数、受け口用の権限）を消す
-- 2. 管理者パスワードの確認処理を1つの関数にまとめ、パスワード変更と鍵の解除で使い回す（動きは同じ）
-- 単語・フレーズ・フォルダ・管理者パスワードのデータには触れない。
-- =========================================================

begin;

-- 1. ChatGPT 連携の片付け
drop function if exists public.issue_chatgpt_token();
drop function if exists public.chatgpt_token_status();
drop function if exists public.revoke_chatgpt_token();
drop table if exists public.chatgpt_tokens;
revoke all on table public.folders, public.stocks from service_role;

-- 2. 管理者パスワードの確認をまとめる
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

-- 管理者パスワードを確認して、ログイン中のユーザーのパスワードを変える
-- ok / wrong_admin / locked / not_set / too_short / not_authenticated
create or replace function public.change_password_with_admin(admin_password text, new_password text)
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
create or replace function public.clear_folder_lock_with_admin(target_folder uuid, admin_password text)
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

commit;
