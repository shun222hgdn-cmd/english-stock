import { useCallback, useRef, useState } from 'react'
import { toErrorMessage } from '../utils/errors'

/**
 * 通信を伴う操作の共通処理：連打による二重実行を防ぎ、失敗したらエラー文を出す。
 * run(action) は成功なら true、失敗・実行中なら false を返す。
 *
 * @param {string} failMessage 想定外のエラーのときの文
 */
export function useBusy(failMessage) {
  const busyRef = useRef(false) // state の反映を待たずに判定するため
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const run = useCallback(
    async (action) => {
      if (busyRef.current) return false
      busyRef.current = true
      setBusy(true)
      setError('')
      try {
        await action()
        return true
      } catch (err) {
        setError(toErrorMessage(err, failMessage))
        return false
      } finally {
        busyRef.current = false
        setBusy(false)
      }
    },
    [failMessage],
  )

  return { busy, error, setError, run }
}
