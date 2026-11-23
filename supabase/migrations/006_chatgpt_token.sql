-- =========================================================
-- English Stock 追加SQL：ChatGPT 連携（ChatGPT → アプリ の一方通行・追加だけ）
-- Supabase Dashboard → SQL Editor に貼り付けて「Run」で1回だけ実行する。
--
-- ・ChatGPT（専用のGPT）が使う「連携キー」の保存場所と、アプリから発行・確認・無効化する関数を作る。
-- ・連携キーそのものは保存しない。SHA-256 のハッシュだけを保存する（キーは発行したときに1回だけ表示）。
-- ・1つのアカウントにキーは1つだけ。発行し直すと、前のキーは使えなくなる。
-- ・このテーブルはアプリ・API からは直接読めない（RLS 有効・ポリシーなし・権限なし）。
--   読むのは受け口（Edge Function）だけで、サーバー側の鍵で読む。
-- ・既存のデータは変更しない。
-- =========================================================

begin;

create table public.chatgpt_tokens (
    -- キーの持ち主（1アカウント1つ）
    user_id uuid primary key
        references auth.users(id)
        on delete cascade,
    -- キーの SHA-256（16進数）。キーそのものは保存しない
    token_hash text not null unique
        check (char_length(token_hash) = 64),
    created_at timestamptz not null default now(),
    -- 最後に ChatGPT から使われた日時（受け口が更新する）
    last_used_at timestamptz
);

alter table public.chatgpt_tokens enable row level security;
revoke all on table public.chatgpt_tokens from public, anon, authenticated;

-- キーを発行する（前のキーは無効になる）。発行したキーはこの戻り値でだけ分かる
create function public.issue_chatgpt_token()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
    new_token text;
begin
    if auth.uid() is null then
        raise exception 'not authenticated' using errcode = '42501';
    end if;
    -- es_ + ランダムな64文字（32バイト）
    new_token := 'es_' || encode(extensions.gen_random_bytes(32), 'hex');
    insert into public.chatgpt_tokens (user_id, token_hash)
    values (auth.uid(), encode(extensions.digest(new_token, 'sha256'), 'hex'))
    on conflict (user_id) do update
        set token_hash = excluded.token_hash,
            created_at = now(),
            last_used_at = null;
    return new_token;
end;
$$;

-- キーの状態（発行日時・最後に使われた日時）。未発行なら行が返らない
create function public.chatgpt_token_status()
returns table (created_at timestamptz, last_used_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
    select t.created_at, t.last_used_at
    from public.chatgpt_tokens t
    where t.user_id = auth.uid();
$$;

-- キーを無効にする（ChatGPT から追加できなくなる）
create function public.revoke_chatgpt_token()
returns void
language sql
security definer
set search_path = ''
as $$
    delete from public.chatgpt_tokens where user_id = auth.uid();
$$;

revoke all on function public.issue_chatgpt_token() from public, anon;
revoke all on function public.chatgpt_token_status() from public, anon;
revoke all on function public.revoke_chatgpt_token() from public, anon;
grant execute on function public.issue_chatgpt_token() to authenticated;
grant execute on function public.chatgpt_token_status() to authenticated;
grant execute on function public.revoke_chatgpt_token() to authenticated;

-- 受け口（Edge Function）がサーバー側の鍵（service_role）で使う最小限の権限。
-- 新しいテーブルへの自動付与がオフのプロジェクトでも動くよう、明示的に付与する。削除の権限は付けない。
grant select, update on table public.chatgpt_tokens to service_role;
grant select on table public.folders to service_role;
grant select, insert on table public.stocks to service_role;

commit;
