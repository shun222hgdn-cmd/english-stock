import { useCallback, useEffect, useState } from 'react'
import { createStock, deleteStock, fetchAllStocks, updateStock } from '../services/stockService'
import { toErrorMessage } from '../utils/errors'

/**
 * 登録データ（stocks）を管理するフック。
 * 取得したデータをアプリ内で保持し、登録・更新・削除が成功したら手元のデータも更新する。
 * 登録件数は stocks から計算するため、別の状態としては持たない。
 *
 * @param {string} userId ログイン中のユーザーID（変わったらデータを読み直す）
 */
export function useStocks(userId) {
  const [stocks, setStocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // 「再読み込み」ボタンで値を変え、データを取得し直すためのカウンター
  const [reloadCount, setReloadCount] = useState(0)

  useEffect(() => {
    // 画面を離れた後や別ユーザーに切り替わった後に、古い通信結果を反映しないためのフラグ
    let active = true

    // 前のユーザーのデータが残らないよう、取得前に一度空にする
    setStocks([])
    setLoading(true)
    setError('')

    fetchAllStocks()
      .then((data) => {
        if (active) setStocks(data)
      })
      .catch((err) => {
        if (active) setError(toErrorMessage(err, 'データの読み込みに失敗しました。'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [userId, reloadCount])

  const reload = useCallback(() => setReloadCount((count) => count + 1), [])

  /** 登録：保存に成功したら一覧に追加する（失敗時は例外をそのまま呼び出し元へ） */
  const addStock = useCallback(async (input) => {
    const created = await createStock(input)
    setStocks((prev) => [...prev, created])
  }, [])

  /** 更新：保存に成功したら一覧の該当データを置き換える */
  const editStock = useCallback(async (id, input) => {
    const updated = await updateStock(id, input)
    setStocks((prev) => prev.map((stock) => (stock.id === id ? updated : stock)))
  }, [])

  /** 削除：削除に成功したら一覧から取り除く */
  const removeStock = useCallback(async (id) => {
    await deleteStock(id)
    setStocks((prev) => prev.filter((stock) => stock.id !== id))
  }, [])

  /** フォルダを削除したとき：そのフォルダのデータを手元からも取り除く（DB側は自動で削除済み） */
  const forgetFolderStocks = useCallback((folderId) => {
    setStocks((prev) => prev.filter((stock) => stock.folder_id !== folderId))
  }, [])

  return { stocks, loading, error, reload, addStock, editStock, removeStock, forgetFolderStocks }
}
