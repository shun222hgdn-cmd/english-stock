import { useEffect, useId, useRef } from 'react'
import { CloseIcon } from './Icons'

/**
 * ダイアログの共通部品（表示している間だけ描画する前提）。ブラウザ標準の <dialog> を使うので、
 * 背景は操作できず、Esc で閉じ、閉じたら元のボタンにフォーカスが戻る。
 * 上にタイトルと × を並べる。header を渡すと、その中身に置き換える（ラベルは labelId の要素）。
 * 中に data-autofocus の要素があれば、開いたときにそこへカーソルを置く（文末に）。
 *
 * @param {{
 *   title?: React.ReactNode,
 *   header?: React.ReactNode,
 *   labelId?: string,
 *   onClose: () => void,
 *   busy?: boolean,             // 保存中などは閉じない
 *   closeOnBackdrop?: boolean,  // 背景を押して閉じるか（入力途中は false にして誤操作を防ぐ）
 *   className?: string,
 *   children: React.ReactNode,
 * }} props
 */
export default function Modal({ title, header, labelId, onClose, busy = false, closeOnBackdrop = true, className = '', children }) {
  const dialogRef = useRef(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    const previouslyFocused = document.activeElement
    dialog.showModal()

    const target = dialog.querySelector('[data-autofocus]')
    if (target) {
      target.focus()
      target.setSelectionRange?.(target.value.length, target.value.length)
    }

    return () => {
      if (dialog.open) dialog.close()
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) previouslyFocused.focus()
    }
  }, [])

  function requestClose() {
    if (!busy) onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      className={`modal ${className}`.trim()}
      aria-labelledby={labelId ?? titleId}
      // Esc：ブラウザに任せず、閉じてよいかをここで判断する
      onCancel={(event) => {
        event.preventDefault()
        requestClose()
      }}
      onClick={(event) => {
        if (closeOnBackdrop && event.target === dialogRef.current) requestClose()
      }}
    >
      <div className="modal-body">
        {header ?? (
          <div className="modal-header">
            <h2 id={titleId} className="modal-title">
              {title}
            </h2>
            <CloseButton onClick={requestClose} disabled={busy} />
          </div>
        )}
        {children}
      </div>
    </dialog>
  )
}

export function CloseButton({ onClick, disabled }) {
  return (
    <button type="button" className="icon-btn" onClick={onClick} aria-label="閉じる" title="閉じる（Esc）" disabled={disabled}>
      <CloseIcon size={20} />
    </button>
  )
}
