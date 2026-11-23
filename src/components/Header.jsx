import { ChevronDownIcon, GearIcon, LogoIcon } from './Icons'

/**
 * 画面上部のヘッダー（アプリ名・フォルダ切り替え・設定）。
 * パスワード変更とログアウトは、歯車の「設定」の中にまとめている。
 * @param {{
 *   folderName?: string,           // 表示中のフォルダ名（フォルダが無いときは省略）
 *   onOpenFolders?: () => void,    // フォルダ切り替えボタンを押したとき
 *   onOpenSettings: () => void,    // 歯車（設定）を押したとき
 * }} props
 */
export default function Header({ folderName, onOpenFolders, onOpenSettings }) {
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
          onClick={onOpenSettings}
          aria-label="設定"
          title="設定"
          aria-haspopup="dialog"
        >
          <GearIcon size={20} />
        </button>
      </div>
    </header>
  )
}
