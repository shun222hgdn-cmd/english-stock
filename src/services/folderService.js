import { supabase } from '../lib/supabase'

// folders テーブルへの通信処理。
// stocks と同じく RLS により、ログイン中のユーザー本人のフォルダだけが対象になる。

const TABLE = 'folders'
const COLUMNS = 'id, name'

/** ログインユーザーのフォルダをすべて取得する（フォルダは少数なので一括取得） */
export async function fetchFolders() {
  const { data, error } = await supabase.from(TABLE).select(COLUMNS).order('name', { ascending: true })
  if (error) throw error
  return data
}

/** フォルダを作成する（user_id はデータベースの既定値で自動設定） */
export async function createFolder(name) {
  const { data, error } = await supabase.from(TABLE).insert({ name }).select(COLUMNS).single()
  if (error) throw error
  return data
}

/** フォルダ名を変更する */
export async function renameFolder(id, name) {
  const { data, error } = await supabase.from(TABLE).update({ name }).eq('id', id).select(COLUMNS).single()
  if (error) throw error
  return data
}

/**
 * フォルダを削除する。
 * データベースの設定（on delete cascade）により、中の単語・フレーズも一緒に削除される。
 */
export async function deleteFolder(id) {
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) throw error
}
