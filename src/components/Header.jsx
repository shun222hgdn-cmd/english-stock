import { ChevronDownIcon, FolderIcon, LogoIcon, LogoutIcon } from './Icons'

/**
 * 画面上部のヘッダー（アプリ名・フォルダ切り替え・ログアウト）。
 * @param {{
 *   folderName?: string,           // 表示中のフォルダ名（フォルダが無いときは省略）
 *   onOpenFolders?: () => void,    // フォルダ切り替えボタンを押したとき
 *   onSignOut: () => void,
 *   signingOut: boolean,
 * }} props
 */
export default function Header({ folderName, onOpenFolders, onSignOut, signingOut }) {
  return (
    <header className="app-header">
      <div className="app-header-inner">
        <p className="brand">
          <LogoIcon size={20} />
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
            <FolderIcon size={16} />
            <span className="folder-btn-name">{folderName}</span>
            <ChevronDownIcon size={16} />
          </button>
        )}

        <button
          type="button"
          className="btn btn-ghost btn-small logout-btn"
          onClick={onSignOut}
          disabled={signingOut}
          aria-label="ログアウト"
          title="ログアウト"
        >
          <LogoutIcon size={16} />
          <span className="logout-label">{signingOut ? 'Logging out…' : 'Logout'}</span>
        </button>
      </div>
    </header>
  )
}
