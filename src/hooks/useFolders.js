import { useCallback, useEffect, useRef, useState } from 'react'
import { createFolder, deleteFolder, fetchFolders, renameFolder } from '../services/folderService'
import { sortFolders } from '../utils/folders'
import { toErrorMessage } from '../utils/errors'

/**
 * フォルダ一覧を管理するフック（useStocks と同じ作り）。
 * @param {string} userId ログイン中のユーザーID（変わったら読み直す）
 */
export function useFolders(userId) {
  const [folders, setFolders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadCount, setReloadCount] = useState(0)
  // 作成・変更・削除のたびに増える番号（裏での再取得結果が古くなっていないかの判定に使う）
  const changeVersionRef = useRef(0)
  const loadingRef = useRef(true)
  loadingRef.current = loading

  useEffect(() => {
    let active = true
    setFolders([])
    setLoading(true)
    setError('')

    fetchFolders()
      .then((data) => {
        if (active) setFolders(sortFolders(data))
      })
      .catch((err) => {
        if (active) setError(toErrorMessage(err, 'フォルダの読み込みに失敗しました。'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [userId, reloadCount])

  const reload = useCallback(() => setReloadCount((count) => count + 1), [])

  /**
   * 画面を出したまま、最新のデータに静かに入れ替える（他の端末で追加・変更したフォルダを反映する）。
   * 読み込み中の表示は出さず、失敗しても今のデータのまま使い続ける。
   * 取得中に作成・変更・削除が行われた場合は、古い結果で上書きしないよう結果を捨てる。
   */
  const refresh = useCallback(async () => {
    if (loadingRef.current) return
    const startVersion = changeVersionRef.current
    try {
      const data = await fetchFolders()
      if (changeVersionRef.current === startVersion) setFolders(sortFolders(data))
    } catch {
      // 裏での再取得なので、失敗しても何もしない
    }
  }, [])

  /** 作成：成功したら一覧に加え、作成したフォルダを返す */
  const addFolder = useCallback(async (name) => {
    changeVersionRef.current += 1
    const created = await createFolder(name)
    changeVersionRef.current += 1
    setFolders((prev) => sortFolders([...prev, created]))
    return created
  }, [])

  /** 名前変更 */
  const editFolder = useCallback(async (id, name) => {
    changeVersionRef.current += 1
    const updated = await renameFolder(id, name)
    changeVersionRef.current += 1
    setFolders((prev) => sortFolders(prev.map((folder) => (folder.id === id ? updated : folder))))
  }, [])

  /** 削除（中のデータはデータベース側で一緒に削除される） */
  const removeFolder = useCallback(async (id) => {
    changeVersionRef.current += 1
    await deleteFolder(id)
    changeVersionRef.current += 1
    setFolders((prev) => prev.filter((folder) => folder.id !== id))
  }, [])

  return { folders, loading, error, reload, refresh, addFolder, editFolder, removeFolder }
}
