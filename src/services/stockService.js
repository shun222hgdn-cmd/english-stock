import { supabase } from '../lib/supabase'

// stocks テーブルへの通信処理をまとめたファイル。
// どのユーザーのデータを読み書きできるかは、データベース側の RLS（Row Level Security）で制御している。
// そのため、ここでは user_id を指定しなくても「ログイン中のユーザー本人のデータ」だけが対象になる。

const TABLE = 'stocks'
// 画面で使う列だけを取得する
const COLUMNS = 'id, folder_id, category, english, japanese, part_of_speech, note'
// 1回の通信で取得する最大件数（Supabase の既定の上限は1000件）
const PAGE_SIZE = 1000

/**
 * ログインユーザーの登録データをすべて取得する。
 * Supabase は1回で返す件数に上限があるため、ページ分割して最後まで取得する。
 */
export async function fetchAllStocks() {
  const allStocks = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from(TABLE)
      .select(COLUMNS)
      .order('id', { ascending: true }) // ページ分割しても重複・欠落しないよう、並び順を固定する
      .range(from, from + PAGE_SIZE - 1)

    if (error) throw error
    if (data.length === 0) break

    allStocks.push(...data)
    // 実際に返ってきた件数だけ進める（サーバー側の上限が PAGE_SIZE より小さくても取りこぼさない）
    from += data.length
  }

  return allStocks
}

/**
 * 新しい登録データを、指定したフォルダに追加する。
 * user_id はデータベースの既定値（auth.uid()）で自動設定される。
 */
export async function createStock({ folder_id, category, english, japanese, part_of_speech = null, note = null }) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ folder_id, category, english, japanese, part_of_speech, note })
    .select(COLUMNS)
    .single()

  if (error) throw error
  return data
}

/**
 * 複数の登録データを、指定したフォルダにまとめて追加する（「まとめて追加」用）。
 * 一度に送りすぎないよう、100件ずつに分けて保存する。
 * @param {string} folder_id
 * @param {Array<{ category: string, english: string, japanese: string, part_of_speech?: string|null, note?: string|null }>} items
 * @returns {Promise<Array<object>>} 保存したデータ
 */
export async function createStocks(folder_id, items) {
  const created = []
  for (let i = 0; i < items.length; i += 100) {
    const rows = items.slice(i, i + 100).map(({ category, english, japanese, part_of_speech = null, note = null }) => ({
      folder_id,
      category,
      english,
      japanese,
      part_of_speech,
      note,
    }))
    const { data, error } = await supabase.from(TABLE).insert(rows).select(COLUMNS)
    if (error) throw error
    created.push(...data)
  }
  return created
}

/** 指定したIDの種類・英語・日本語訳・品詞・コメントを更新する */
export async function updateStock(id, { category, english, japanese, part_of_speech = null, note = null }) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ category, english, japanese, part_of_speech, note })
    .eq('id', id)
    .select(COLUMNS)
    .single()

  if (error) throw error
  return data
}

/** 指定したIDのデータを削除する */
export async function deleteStock(id) {
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) throw error
}
