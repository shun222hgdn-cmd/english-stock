import { useId, useRef, useState } from 'react'
import Modal from './Modal'
import { toErrorMessage } from '../utils/errors'

/**
 * 削除確認ダイアログ（誤って削除しないための確認）。
 *
 * @param {{
 *   message: string,
 *   detail?: string,
 *   confirmLabel?: string,
 *   onConfirm: () => Promise<void>,
 *   onClose: () => void,
 * }} props
 */
export default function ConfirmDialog({ message, detail, confirmLabel = '削除', onConfirm, onClose }) {
  const id = useId()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const busyRef = useRef(false)

  async function handleConfirm() {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setError('')
    try {
      await onConfirm()
      onClose() // 成功：ダイアログを閉じる
    } catch (err) {
      // 失敗：データは残っているので、エラーを表示してダイアログは開いたままにする
      setError(toErrorMessage(err, '削除に失敗しました。'))
      busyRef.current = false
      setBusy(false)
    }
  }

  function requestClose() {
    if (!busyRef.current) onClose()
  }

  return (
    <Modal titleId={`${id}-title`} onRequestClose={requestClose}>
      <h2 id={`${id}-title`} className="modal-title modal-title-small">
        {message}
      </h2>
      {detail && <p className="confirm-detail">{detail}</p>}

      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      <div className="modal-actions modal-actions-row">
        {/* 先頭のボタン（キャンセル）に最初のフォーカスが当たるようにしている */}
        <button type="button" className="btn btn-secondary" onClick={requestClose} disabled={busy}>
          キャンセル
        </button>
        <button type="button" className="btn btn-danger" onClick={handleConfirm} disabled={busy}>
          {busy ? '削除中…' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
