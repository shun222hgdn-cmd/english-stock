import { ChevronDownIcon, KeyIcon, LogoIcon, LogoutIcon } from './Icons'

/**
 * 画面上部のヘッダー（アプリ名・フォルダ切り替え・パスワード変更・ログアウト）。
 * @param {{
 *   folderName?: string,           // 表示中のフォルダ名（フォルダが無いときは省略）
 *   onOpenFolders?: () => void,    // フォルダ切り替えボタンを押したとき
 *   onOpenPassword: () => void,    // パスワード変更ボタンを押したとき
 *   onSignOut: () => void,
 *   signingOut: boolean,
 * }} props
 */
export default function Header({ folderName, onOpenFolders, onOpenPassword, onSignOut, signingOut }) {
  return (
    <header className="app-header">
      <div className="app-header-inner">
        <p className="brand" lang="en">
          <LogoIcon size={18} />
          <span className="brand-text">English Stock</span>
        </p>

        {folderName && (
          <button
            type="button"
            className="folder-btn"
            onClick={onOpenFolders}
            aria-label={`フォルダ：${folderName}（切り替え）`}
            aria-haspopup="dialog"
          >
            <span className="folder-btn-name">{folderName}</span>
            <ChevronDownIcon size={16} />
          </button>
        )}

        <button
          type="button"
          className="icon-btn header-icon-btn"
          onClick={onOpenPassword}
          aria-label="パスワード変更"
          title="パスワード変更"
          aria-haspopup="dialog"
        >
          <KeyIcon size={18} />
        </button>

        <button
          type="button"
          className="icon-btn header-icon-btn"
          onClick={onSignOut}
          disabled={signingOut}
          aria-label="ログアウト"
          title="ログアウト"
        >
          <LogoutIcon size={18} />
        </button>
      </div>
    </header>
  )
}
