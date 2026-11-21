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

/** フォルダを名前順（日本語・英語とも自然な順）に並べた新しい配列を返す */
export function sortFolders(folders) {
  return [...folders].sort((a, b) => a.name.localeCompare(b.name, 'ja'))
}
