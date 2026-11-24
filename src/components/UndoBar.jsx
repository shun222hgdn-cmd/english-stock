import { useEffect } from 'react'
import { useBusy } from '../hooks/useBusy'

/** 表示しておく時間（ミリ秒） */
const SHOW_MS = 8000

/**
 * 削除した直後に画面の下に出る「元に戻す」のお知らせ。数秒たつと消える。
 * 元に戻している間・失敗したときは消さない（失敗したらその理由を出して、もう一度押せる）。
 *
 * @param {{ message: string, onUndo: () => Promise<void>, onClose: () => void }} props
 */
export default function UndoBar({ message, onUndo, onClose }) {
  const { busy, error, run } = useBusy('元に戻せませんでした。')

  useEffect(() => {
    if (busy || error) return
    const timer = setTimeout(onClose, SHOW_MS)
    return () => clearTimeout(timer)
  }, [busy, error, onClose])

  return (
    <div className="undo-bar" role="status" aria-live="polite">
      <span className="undo-bar-text">{error || message}</span>
      <button
        type="button"
        className="undo-bar-btn"
        onClick={async () => (await run(onUndo)) && onClose()}
        disabled={busy}
      >
        {busy ? '戻しています…' : '元に戻す'}
      </button>
    </div>
  )
}
