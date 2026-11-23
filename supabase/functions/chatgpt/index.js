// =========================================================
// English Stock：ChatGPT 連携の受け口（Supabase Edge Function / Deno）
//
// ChatGPT（専用のGPT）から呼ばれ、単語・フレーズを「追加するだけ」の小さなサーバー。
// アプリからAIを呼び出すことはない（ChatGPT → アプリ の一方通行）。
//
//   GET  /chatgpt/folders  … 追加先に選べるフォルダの一覧
//   POST /chatgpt/stocks   … 単語・フレーズを追加（1回50件まで。削除・編集はできない）
//
// 認証：アプリの ⚙ → ChatGPT連携 で発行した「連携キー」を Authorization: Bearer es_... で送る。
// キーそのものはデータベースに無く、SHA-256 のハッシュと照らし合わせる。
//
// デプロイ時の注意：このキーは Supabase のログイン用トークンではないため、
// 関数の設定で「JWT の検証（Verify JWT）」をオフにする。
// =========================================================

import { createClient } from 'npm:@supabase/supabase-js@2'
import { normalizeItems, pickFolder, readBearerToken, sha256Hex, duplicateKey } from './logic.js'

// サーバー側の鍵（Edge Function の環境に自動で入っている。外には出さない）。
// 従来の service_role キーが無いプロジェクトでは、新しい secret キー（SUPABASE_SECRET_KEYS）を使う。
function serverKey() {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (legacy) return legacy
  try {
    return Object.values(JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}'))[0]
  } catch {
    return undefined
  }
}

const admin = createClient(Deno.env.get('SUPABASE_URL'), serverKey(), {
  auth: { persistSession: false },
})

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } })

/** 連携キーから持ち主のユーザーIDを調べる（無効なら null） */
async function findUserId(request) {
  const token = readBearerToken(request.headers.get('Authorization'))
  if (!token) return null
  const { data, error } = await admin
    .from('chatgpt_tokens')
    .select('user_id')
    .eq('token_hash', await sha256Hex(token))
    .maybeSingle()
  if (error || !data) return null
  // 最後に使われた日時を記録（アプリの連携画面に表示する）
  await admin.from('chatgpt_tokens').update({ last_used_at: new Date().toISOString() }).eq('user_id', data.user_id)
  return data.user_id
}

async function listFolders(userId) {
  const { data, error } = await admin
    .from('folders')
    .select('id, name, lock_hash')
    .eq('user_id', userId)
    .order('name')
  if (error) throw error
  return data
}

Deno.serve(async (request) => {
  try {
    const userId = await findUserId(request)
    if (!userId) {
      return json(401, { error: '連携キーが正しくないか、無効になっています。アプリの ⚙ → ChatGPT連携 で確認してください。' })
    }

    const path = new URL(request.url).pathname

    // フォルダ一覧
    if (request.method === 'GET' && path.endsWith('/folders')) {
      const folders = await listFolders(userId)
      return json(200, {
        folders: folders.map((f) => ({ id: f.id, name: f.name, locked: Boolean(f.lock_hash) })),
      })
    }

    // 単語・フレーズの追加
    if (request.method === 'POST' && path.endsWith('/stocks')) {
      let body
      try {
        body = await request.json()
      } catch {
        return json(400, { error: 'JSON の形式で送ってください。' })
      }

      const { folder, error: folderError } = pickFolder(await listFolders(userId), body ?? {})
      if (folderError) return json(400, { error: folderError })

      // そのフォルダの登録済みの英語（重複して追加しないため）
      const { data: existing, error: existingError } = await admin
        .from('stocks')
        .select('english')
        .eq('user_id', userId)
        .eq('folder_id', folder.id)
      if (existingError) throw existingError

      const { error, valid, skipped } = normalizeItems(body?.items, new Set(existing.map((s) => duplicateKey(s.english))))
      if (error) return json(400, { error })

      if (valid.length > 0) {
        const rows = valid.map((item) => ({ ...item, user_id: userId, folder_id: folder.id }))
        const { error: insertError } = await admin.from('stocks').insert(rows)
        if (insertError) throw insertError
      }

      return json(200, {
        folder: folder.name,
        added: valid.map((item) => ({ english: item.english, japanese: item.japanese, category: item.category })),
        skipped,
      })
    }

    return json(404, { error: '使えるのは GET /folders と POST /stocks だけです。' })
  } catch (err) {
    console.error(err)
    return json(500, { error: 'サーバーでエラーが起きました。時間をおいてやり直してください。' })
  }
})
