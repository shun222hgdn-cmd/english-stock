-- =========================================================
-- English Stock 追加SQL：フォルダの鍵（任意）
-- Supabase Dashboard → SQL Editor に貼り付けて「Run」で1回だけ実行する。
--
-- ・folders に lock_hash（鍵のパスワードのハッシュ）を追加する。未設定なら鍵なし。
--   ハッシュはアプリ側で PBKDF2 により作る（パスワードそのものは保存しない）。
-- ・この鍵は「画面での鍵」。同じアカウントでログインできる人が API を直接使えば中身は読める。
-- ・鍵のパスワードを忘れたときは、管理者パスワードで鍵を外せる（この確認はデータベースで行う）。
-- ・既存のデータは変更しない。
-- =========================================================

begin;

alter table public.folders
    add column lock_hash text
        check (lock_hash is null or char_length(lock_hash) <= 200);

-- 管理者パスワードを確認して、フォルダの鍵を外す
-- 戻り値：ok / wrong_admin / locked / not_set / not_found / not_authenticated
-- （間違えた回数を記録するため、エラーにはせず結果を文字で返す。回数とロックは
--   パスワード変更と共通：5回間違えると15分間ロック）
create function public.clear_folder_lock_with_admin(target_folder uuid, admin_password text)
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

    update private.admin_settings set failed_attempts = 0, locked_until = null;

    -- 自分のフォルダだけ鍵を外せる
    update public.folders
    set lock_hash = null
    where id = target_folder
      and user_id = auth.uid();
    if not found then
        return 'not_found';
    end if;

    return 'ok';
end;
$$;

revoke all on function public.clear_folder_lock_with_admin(uuid, text) from public, anon;
grant execute on function public.clear_folder_lock_with_admin(uuid, text) to authenticated;

commit;
