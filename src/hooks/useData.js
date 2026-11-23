import { useCallback, useEffect, useRef, useState } from 'react'
import * as api from '../services/api'
import { sortFolders } from '../utils/folders'
import { toErrorMessage } from '../utils/errors'

/**
 * データベースから読んだ一覧を手元に持ち、変更が成功したら手元の一覧も更新する共通の仕組み。
 * - reload：読み込み中の表示を出して読み直す（「再読み込み」ボタン）
 * - refresh：画面はそのままで静かに最新に入れ替える（アプリに戻ってきたとき）。
 *   読み直しの途中で変更があったら、古い結果で上書きしないよう捨てる
 * - change(request, apply)：通信 request が成功したら、その結果で apply(今の一覧, 結果) に入れ替える
 *
 * @param {() => Promise<Array>} fetcher
 * @param {string} userId 変わったら読み直す（前のユーザーのデータは残さない）
 * @param {string} failMessage
 * @param {(items: Array) => Array} normalize 並び替えなど
 */
function useRemoteList(fetcher, userId, failMessage, normalize) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadCount, setReloadCount] = useState(0)
  const versionRef = useRef(0) // 変更のたびに増える番号
  const loadingRef = useRef(true)
  loadingRef.current = loading

  useEffect(() => {
    let active = true
    setItems([])
    setLoading(true)
    setError('')
    fetcher()
      .then((data) => active && setItems(normalize(data)))
      .catch((err) => active && setError(toErrorMessage(err, failMessage)))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [fetcher, userId, failMessage, normalize, reloadCount])

  const reload = useCallback(() => setReloadCount((count) => count + 1), [])

  const refresh = useCallback(async () => {
    if (loadingRef.current) return
    const startVersion = versionRef.current
    try {
      const data = await fetcher()
      if (versionRef.current === startVersion) setItems(normalize(data))
    } catch {
      // 裏での読み直しなので、失敗しても今のデータのまま
    }
  }, [fetcher, normalize])

  const change = useCallback(
    async (request, apply) => {
      versionRef.current += 1
      const result = await request()
      versionRef.current += 1
      setItems((prev) => normalize(apply(prev, result)))
      return result
    },
    [normalize],
  )

  return { items, loading, error, reload, refresh, change }
}

const keepOrder = (items) => items
const replace = (list, updated) => list.map((item) => (item.id === updated.id ? updated : item))

/** 単語・フレーズ（すべてのフォルダ分）。失敗したときは例外を呼び出し元へ投げる */
export function useStocks(userId) {
  const { items, change, ...rest } = useRemoteList(api.fetchAllStocks, userId, 'データの読み込みに失敗しました。', keepOrder)
  return {
    ...rest,
    stocks: items,
    /** まとめて追加（1件の追加にも使う）。追加した件数を返す */
    addStocks: async (folderId, inputs) =>
      (await change(() => api.createStocks(folderId, inputs), (list, created) => [...list, ...created])).length,
    editStock: (id, input) => change(() => api.updateStock(id, input), replace),
    removeStock: (id) => change(() => api.deleteStock(id), (list) => list.filter((stock) => stock.id !== id)),
    /** フォルダを削除したとき、そのフォルダの分を手元からも消す（DB 側は自動で削除済み） */
    forgetFolderStocks: (folderId) =>
      change(async () => {}, (list) => list.filter((stock) => stock.folder_id !== folderId)),
  }
}

/** フォルダ（名前順） */
export function useFolders(userId) {
  const { items, change, ...rest } = useRemoteList(api.fetchFolders, userId, 'フォルダの読み込みに失敗しました。', sortFolders)
  const update = (id, changes) => change(() => api.updateFolder(id, changes), replace)
  return {
    ...rest,
    folders: items,
    addFolder: (name) => change(() => api.createFolder(name), (list, created) => [...list, created]),
    renameFolder: (id, name) => update(id, { name }),
    /** 鍵の設定・解除（lockHash が null なら解除） */
    setLock: (id, lockHash) => update(id, { lock_hash: lockHash }),
    removeFolder: (id) => change(() => api.deleteFolder(id), (list) => list.filter((folder) => folder.id !== id)),
    /** 管理者パスワードで鍵を外す（'ok' のときだけ手元の鍵も外す） */
    clearLockWithAdmin: (id, adminPassword) =>
      change(
        () => api.clearFolderLockWithAdmin(id, adminPassword),
        (list, result) => (result === 'ok' ? list.map((f) => (f.id === id ? { ...f, lock_hash: null } : f)) : list),
      ),
  }
}
