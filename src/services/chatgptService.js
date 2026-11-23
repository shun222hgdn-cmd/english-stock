import { supabase } from '../lib/supabase'

// ChatGPT 連携（ChatGPT → アプリ の一方通行・追加だけ）の「連携キー」の発行・確認・無効化。
// キーの保存・照合はデータベースの関数（supabase/migrations/006_chatgpt_token.sql）が行う。
// アプリから ChatGPT などの AI を呼び出す処理は無い。

/** ChatGPT から呼ぶ受け口（Edge Function）の URL */
export const CHATGPT_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL ?? ''}/functions/v1/chatgpt`

/** GPT の設定に読み込ませる API の説明書（GitHub Pages で公開） */
export const CHATGPT_SCHEMA_URL = `${window.location.origin}${import.meta.env.BASE_URL}chatgpt-openapi.json`

/**
 * 連携キーの状態。未発行なら null。
 * @returns {Promise<{ created_at: string, last_used_at: string | null } | null>}
 */
export async function getChatgptTokenStatus() {
  const { data, error } = await supabase.rpc('chatgpt_token_status')
  if (error) throw error
  return Array.isArray(data) && data.length > 0 ? data[0] : null
}

/** 連携キーを発行する（前のキーは使えなくなる）。キーはこの戻り値でだけ分かる */
export async function issueChatgptToken() {
  const { data, error } = await supabase.rpc('issue_chatgpt_token')
  if (error) throw error
  return data
}

/** 連携キーを無効にする */
export async function revokeChatgptToken() {
  const { error } = await supabase.rpc('revoke_chatgpt_token')
  if (error) throw error
}
