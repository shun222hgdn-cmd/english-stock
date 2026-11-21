import { useCallback, useEffect, useState } from 'react'
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

  /** 作成：成功したら一覧に加え、作成したフォルダを返す */
  const addFolder = useCallback(async (name) => {
    const created = await createFolder(name)
    setFolders((prev) => sortFolders([...prev, created]))
    return created
  }, [])

  /** 名前変更 */
  const editFolder = useCallback(async (id, name) => {
    const updated = await renameFolder(id, name)
    setFolders((prev) => sortFolders(prev.map((folder) => (folder.id === id ? updated : folder))))
  }, [])

  /** 削除（中のデータはデータベース側で一緒に削除される） */
  const removeFolder = useCallback(async (id) => {
    await deleteFolder(id)
    setFolders((prev) => prev.filter((folder) => folder.id !== id))
  }, [])

  return { folders, loading, error, reload, addFolder, editFolder, removeFolder }
}
