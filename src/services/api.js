import { supabase } from '../lib/supabase'

// データベース（Supabase）との通信をまとめたファイル。
// どのデータを読み書きできるかはデータベース側の RLS で決まるので、user_id は指定しなくても
// 「ログイン中のユーザー本人のデータ」だけが対象になる（作成時の user_id も DB の既定値で入る）。

const STOCK_COLUMNS = 'id, folder_id, category, english, japanese, part_of_speech, note, learned, created_at'
const FOLDER_COLUMNS = 'id, name, lock_hash, parent_id'

/** 通信結果からデータを取り出す（失敗なら例外） */
async function unwrap(request) {
  const { data, error } = await request
  if (error) throw error
  return data
}

/** 保存する列だけにそろえる（品詞・コメントは未設定なら null。folder_id は渡したときだけ＝フォルダを移すとき） */
const toStockRow = ({ category, english, japanese, part_of_speech = null, note = null, folder_id }) => ({
  category,
  english,
  japanese,
  part_of_speech,
  note,
  ...(folder_id ? { folder_id } : {}),
})

// ---------- 単語・フレーズ ----------

/** すべて取得する（1回で返る件数に上限があるので、id 順にページ分割して最後まで読む） */
export async function fetchAllStocks() {
  const all = []
  for (;;) {
    const page = await unwrap(
      supabase.from('stocks').select(STOCK_COLUMNS).order('id').range(all.length, all.length + 999),
    )
    if (page.length === 0) return all
    all.push(...page)
  }
}

/** 行をまとめて保存する（一度に送りすぎないよう100件ずつ） */
async function insertStocks(rows) {
  const created = []
  for (let i = 0; i < rows.length; i += 100) {
    created.push(...(await unwrap(supabase.from('stocks').insert(rows.slice(i, i + 100)).select(STOCK_COLUMNS))))
  }
  return created
}

/** 指定したフォルダに追加する（まとめて追加にも使う） */
export const createStocks = (folderId, items) =>
  insertStocks(items.map((item) => ({ folder_id: folderId, ...toStockRow(item) })))

/** 削除を取り消す：消したデータを同じ id・同じフォルダで元に戻す */
export const restoreStocks = (stocks) =>
  insertStocks(
    stocks.map((stock) => ({
      id: stock.id,
      folder_id: stock.folder_id,
      ...toStockRow(stock),
      learned: stock.learned ?? false,
      created_at: stock.created_at, // 追加順の並びも元どおりにする
    })),
  )

/** 「覚えた」の印を付ける・外す */
export const setLearned = (id, learned) =>
  unwrap(supabase.from('stocks').update({ learned }).eq('id', id).select(STOCK_COLUMNS).single())

export const updateStock = (id, input) =>
  unwrap(supabase.from('stocks').update(toStockRow(input)).eq('id', id).select(STOCK_COLUMNS).single())

export const deleteStock = (id) => unwrap(supabase.from('stocks').delete().eq('id', id))

/** まとめて削除する（「覚えたものを削除」用。100件ずつ） */
export async function deleteStocks(ids) {
  for (let i = 0; i < ids.length; i += 100) {
    await unwrap(supabase.from('stocks').delete().in('id', ids.slice(i, i + 100)))
  }
}

// ---------- フォルダ ----------

export const fetchFolders = () => unwrap(supabase.from('folders').select(FOLDER_COLUMNS))

/** フォルダを作る（parentId を渡すと、そのフォルダの中に作る） */
export const createFolder = (name, parentId = null) =>
  unwrap(supabase.from('folders').insert({ name, parent_id: parentId }).select(FOLDER_COLUMNS).single())

/** 削除を取り消す：フォルダを同じ id・名前・鍵で元に戻す（中身は restoreStocks で戻す） */
export const restoreFolder = ({ id, name, lock_hash, parent_id }) =>
  unwrap(supabase.from('folders').insert({ id, name, lock_hash, parent_id }).select(FOLDER_COLUMNS).single())

/** 名前や鍵（lock_hash。null で鍵なし）を変更する */
export const updateFolder = (id, changes) =>
  unwrap(supabase.from('folders').update(changes).eq('id', id).select(FOLDER_COLUMNS).single())

/** 削除する（中のフォルダと単語・フレーズも、データベース側で一緒に削除される） */
export const deleteFolder = (id) => unwrap(supabase.from('folders').delete().eq('id', id))

// ---------- 管理者パスワード（確認はデータベースの関数で行い、結果を 'ok' などの文字で返す） ----------

export const isAdminPasswordSet = async () => (await unwrap(supabase.rpc('admin_password_is_set'))) === true

export const setAdminPassword = (adminPassword) =>
  unwrap(supabase.rpc('set_admin_password', { new_admin_password: adminPassword }))

export const changePasswordWithAdmin = (adminPassword, newPassword) =>
  unwrap(supabase.rpc('change_password_with_admin', { admin_password: adminPassword, new_password: newPassword }))

export const clearFolderLockWithAdmin = (folderId, adminPassword) =>
  unwrap(supabase.rpc('clear_folder_lock_with_admin', { target_folder: folderId, admin_password: adminPassword }))
