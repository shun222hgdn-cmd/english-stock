// フォルダに関する処理（画面に依存しない純粋な関数なので、自動テストしやすい）

/** フォルダ名の最大文字数（データベースの制約と同じ） */
export const FOLDER_NAME_MAX = 20

/**
 * フォルダ名を整えて、入力チェックを行う。
 * - 前後の空白を取り除く
 * - 空欄・長すぎる名前・同じ名前（大文字・小文字は区別しない）はエラー
 *
 * @param {string} name 入力されたフォルダ名
 * @param {Array<{ id: string, name: string }>} folders 既存のフォルダ
 * @param {string} [excludeId] 名前変更中のフォルダ自身のID（重複チェックから除く）
 * @returns {{ value: string, error: string }}
 */
export function cleanFolderName(name, folders = [], excludeId) {
  const value = String(name ?? '').trim()
  if (!value) return { value, error: 'フォルダ名を入力してください。' }
  if ([...value].length > FOLDER_NAME_MAX) {
    return { value, error: `フォルダ名は${FOLDER_NAME_MAX}文字以内にしてください。` }
  }
  const key = value.toLowerCase()
  if (folders.some((folder) => folder.id !== excludeId && folder.name.toLowerCase() === key)) {
    return { value, error: '同じ名前のフォルダがすでにあります。' }
  }
  return { value, error: '' }
}

/**
 * 表示するフォルダを決める。
 * 前回選んでいたフォルダ（preferredId）があればそれ、無ければ先頭のフォルダ。フォルダが無ければ null。
 */
export function pickCurrentFolder(folders, preferredId) {
  if (folders.length === 0) return null
  return folders.find((folder) => folder.id === preferredId) ?? folders[0]
}

/** 指定したフォルダのデータだけを返す */
export function filterByFolder(stocks, folderId) {
  return stocks.filter((stock) => stock.folder_id === folderId)
}

/** 指定したフォルダたち（id の Set）のデータを返す */
export function filterByFolders(stocks, folderIds) {
  return stocks.filter((stock) => folderIds.has(stock.folder_id))
}

// ---------- 入れ子（フォルダの中のフォルダ） ----------

/** 入れ子にできる深さ（いちばん上を 1 段目として 5 段目まで） */
export const MAX_FOLDER_DEPTH = 5

const byName = (a, b) => a.name.localeCompare(b.name, 'ja')

/**
 * フォルダを木の順に並べた新しい配列を返す（親のすぐ後に子。同じ親の中は名前順）。
 * 親が見つからないフォルダは、いちばん上として扱う。
 */
export function sortFolders(folders) {
  const ids = new Set(folders.map((f) => f.id))
  const childrenOf = (parentId) =>
    folders.filter((f) => (f.parent_id && ids.has(f.parent_id) ? f.parent_id : null) === parentId).sort(byName)
  const out = []
  const visit = (parentId) => {
    for (const folder of childrenOf(parentId)) {
      out.push(folder)
      visit(folder.id)
    }
  }
  visit(null)
  return out
}

/** いちばん上から自分までのフォルダ id（自分を含む） */
export function folderPath(folders, id) {
  const byId = new Map(folders.map((f) => [f.id, f]))
  const path = []
  for (let f = byId.get(id); f && path.length <= MAX_FOLDER_DEPTH + 1; f = byId.get(f.parent_id)) path.unshift(f.id)
  return path
}

/** 何段目か（いちばん上が 1） */
export const folderDepth = (folders, id) => folderPath(folders, id).length

/** 自分と、中にあるすべてのフォルダの id（Set） */
export function folderSubtree(folders, id) {
  const ids = new Set([id])
  let added = true
  while (added) {
    added = false
    for (const f of folders) {
      if (f.parent_id && ids.has(f.parent_id) && !ids.has(f.id)) {
        ids.add(f.id)
        added = true
      }
    }
  }
  return ids
}
