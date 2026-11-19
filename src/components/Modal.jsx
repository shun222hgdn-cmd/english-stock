import { useEffect, useRef } from 'react'

/**
 * モーダルの共通部品（登録・編集フォームと削除確認ダイアログで使う）。
 * ブラウザ標準の <dialog> を使うことで、次の操作に対応している。
 * - 開いている間は背景を操作できない（フォーカスがモーダル内に留まる）
 * - Esc キーで閉じる
 * - 閉じたら、開く前にフォーカスしていたボタンにフォーカスを戻す
 *
 * 表示している間だけ親コンポーネントで描画する前提（表示 = マウント）。
 *
 * @param {{ titleId: string, onRequestClose: () => void, children: React.ReactNode }} props
 *   onRequestClose: Esc キーや背景クリックで閉じようとしたときに呼ばれる
 */
export default function Modal({ titleId, onRequestClose, children }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    // 開く前にフォーカスしていた要素を覚えておく
    const previouslyFocused = document.activeElement
    dialog.showModal()

    return () => {
      if (dialog.open) dialog.close()
      // 閉じた後、元の要素にフォーカスを戻す（キーボード操作のため）
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
        previouslyFocused.focus()
      }
    }
  }, [])

  // Esc キー：ブラウザが勝手に閉じないよう止めて、閉じてよいかは親に判断させる
  function handleCancel(event) {
    event.preventDefault()
    onRequestClose()
  }

  // 背景（ダイアログの外側）をクリックしたら閉じる
  function handleClick(event) {
    if (event.target === dialogRef.current) onRequestClose()
  }

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-labelledby={titleId}
      onCancel={handleCancel}
      onClick={handleClick}
    >
      <div className="modal-body">{children}</div>
    </dialog>
  )
}
