import { useId } from 'react'
import Modal from './Modal'
import { ChevronRightIcon, CloseIcon, KeyIcon, LogoutIcon } from './Icons'

/**
 * 設定（ヘッダーの歯車から開く）。ログイン中の ID と、パスワード変更・ログアウトをまとめる。
 *
 * @param {{
 *   loginId: string,               // ログイン中の ID（メールアドレスのアカウントはアドレス）
 *   signingOut: boolean,
 *   onOpenPassword: () => void,
 *   onSignOut: () => void,
 *   onClose: () => void,
 * }} props
 */
export default function SettingsDialog({ loginId, signingOut, onOpenPassword, onSignOut, onClose }) {
  const id = useId()

  return (
    <Modal titleId={`${id}-title`} onRequestClose={onClose}>
      <div className="modal-header">
        <h2 id={`${id}-title`} className="modal-title">
          設定
        </h2>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="閉じる">
          <CloseIcon size={20} />
        </button>
      </div>

      <p className="muted folder-lead">ログイン中：{loginId}</p>

      <ul className="ruled-list">
        <li>
          <button type="button" className="settings-row" onClick={onOpenPassword}>
            <KeyIcon size={18} />
            <span className="settings-row-label">パスワード変更</span>
            <ChevronRightIcon size={18} className="settings-row-arrow" />
          </button>
        </li>
        <li>
          <button type="button" className="settings-row settings-row-danger" onClick={onSignOut} disabled={signingOut}>
            <LogoutIcon size={18} />
            <span className="settings-row-label">{signingOut ? 'ログアウト中…' : 'ログアウト'}</span>
          </button>
        </li>
      </ul>
    </Modal>
  )
}
